import { prisma } from './prisma'
import type { User } from '@prisma/client'
import { accruedLeaveDays, computeSalary, monthKey, monthRange, yearRange } from '#shared/business/calc'
import type { HrSettings } from '#shared/business/types'

/** Requests that count against the balance: approved ones and the ones still waiting (reserved). */
export const COUNTING_STATUSES = ['PENDING_DIRECTOR', 'PENDING_HR', 'APPROVED'] as const

export interface Balance {
  /** Days (or hours) per year / month */
  allowance: number
  /** Annual leave only: days earned so far (accrual). Otherwise equal to `allowance`. */
  earned: number
  used: number
  remaining: number
}

export interface Balances {
  year: number
  month: string
  annual: Balance
  sick: Balance
  hourly: Balance
  hasPendingAdvance: boolean
}

const balance = (allowance: number, used: number, earned = allowance): Balance => ({
  allowance,
  earned,
  used: Math.round(used * 100) / 100,
  remaining: Math.max(0, Math.round((earned - used) * 100) / 100),
})

/**
 * Vacation balance for the year of `ref`, hourly-leave balance for the month of `ref`.
 * Annual leave is earned day by day (see accruedLeaveDays): remaining = earned up to `ref` − used.
 * `excludeRequestId` lets you ignore one request (not used yet, handy for edits).
 */
export async function getBalances(
  user: Pick<User, 'id' | 'annualLeaveDays' | 'sickLeaveDays' | 'hireDate'>,
  settings: HrSettings,
  ref: Date = new Date(),
): Promise<Balances> {
  const year = ref.getUTCFullYear()
  const month = monthKey(ref)
  const y = yearRange(year)
  const m = monthRange(month)

  const [vacations, hourly, pendingAdvance] = await Promise.all([
    prisma.request.groupBy({
      by: ['subtype'],
      where: {
        userId: user.id,
        kind: 'VACATION',
        status: { in: [...COUNTING_STATUSES] },
        startDate: { gte: y.start, lte: y.end },
      },
      _sum: { days: true },
    }),
    prisma.request.aggregate({
      where: {
        userId: user.id,
        kind: 'HOURLY_LEAVE',
        status: { in: [...COUNTING_STATUSES] },
        date: { gte: m.start, lte: m.end },
      },
      _sum: { hours: true },
    }),
    prisma.request.count({
      where: { userId: user.id, kind: 'ADVANCE', status: { in: ['PENDING_DIRECTOR', 'PENDING_HR'] } },
    }),
  ])

  const usedDays = (subtype: string) => vacations.find(v => v.subtype === subtype)?._sum.days ?? 0

  return {
    year,
    month,
    annual: (() => {
      const yearly = user.annualLeaveDays ?? settings.annualLeaveDays
      return balance(yearly, usedDays('annual'), accruedLeaveDays(yearly, user.hireDate, ref))
    })(),
    sick: balance(user.sickLeaveDays ?? settings.sickLeaveDays, usedDays('sick')),
    hourly: balance(settings.hourlyLeaveHoursPerMonth, Number(hourly._sum.hours ?? 0)),
    hasPendingAdvance: pendingAdvance > 0,
  }
}

/** Salary of a month: base − advance installments − applied deductions. */
export async function getSalary(user: Pick<User, 'id' | 'baseSalary'>, month: string) {
  const [installments, deductions] = await Promise.all([
    prisma.advanceInstallment.findMany({ where: { userId: user.id, month }, select: { amount: true } }),
    prisma.deduction.findMany({ where: { userId: user.id, month, status: 'APPLIED' }, select: { amount: true } }),
  ])
  return {
    month,
    ...computeSalary(
      Number(user.baseSalary),
      installments.map(i => Number(i.amount)),
      deductions.map(d => Number(d.amount)),
    ),
  }
}
