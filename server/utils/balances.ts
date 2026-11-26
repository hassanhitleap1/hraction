import { prisma } from './prisma'
import type { User } from '@prisma/client'
import { accruedLeaveDays, computeSalary, departureLeaveDays, HOURS_PER_DAY, rollOverInto, monthKey, yearRange } from '#shared/business/calc'
import type { HrSettings } from '#shared/business/types'

/** Requests that count against the balance: approved ones and the ones still waiting (reserved). */
export const COUNTING_STATUSES = ['PENDING_DIRECTOR', 'PENDING_HR', 'APPROVED'] as const

export interface Balance {
  /** Days (or hours) per year / month */
  allowance: number
  /** Days available so far: carried over from previous years + this year's (annual: accrued day by day; sick: full year). */
  earned: number
  /** Unused days carried over from previous years */
  carryOver: number
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

const balance = (allowance: number, used: number, earned = allowance, carryOver = 0): Balance => ({
  allowance,
  earned: Math.round((earned + carryOver) * 100) / 100,
  carryOver,
  used: Math.round(used * 100) / 100,
  remaining: Math.max(0, Math.round((earned + carryOver - used) * 100) / 100),
})

/**
 * Vacation balance for the year of `ref`, personal departures are deducted from it too.
 * Annual leave is earned day by day (see accruedLeaveDays): remaining = earned up to `ref` − used.
 * `excludeRequestId` lets you ignore one request (not used yet, handy for edits).
 */
export async function getBalances(
  user: Pick<User, 'id' | 'annualLeaveDays' | 'sickLeaveDays' | 'hireDate' | 'createdAt'>,
  settings: HrSettings,
  ref: Date = new Date(),
): Promise<Balances> {
  const year = ref.getUTCFullYear()
  const month = monthKey(ref)
  const y = yearRange(year)
  
  const [vacations, departures, pendingAdvance] = await Promise.all([
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
    // Personal departures of the year: they are deducted from the annual leave (see departureLeaveDays)
    prisma.request.findMany({
      where: {
        userId: user.id,
        kind: 'HOURLY_LEAVE',
        subtype: 'personal',
        status: { in: [...COUNTING_STATUSES] },
        date: { gte: y.start, lte: y.end },
      },
      select: { date: true, hours: true },
    }),
    prisma.request.count({
      where: { userId: user.id, kind: 'ADVANCE', status: { in: ['PENDING_DIRECTOR', 'PENDING_HR'] } },
    }),
  ])

  const usedDays = (subtype: string) => vacations.find(v => v.subtype === subtype)?._sum.days ?? 0

  // Departure hours per date → days (3h+ on the same day = 1 day, otherwise hours / 8)
  const hoursByDate = new Map<string, number>()
  for (const d of departures) {
    if (!d.date) continue
    const key = d.date.toISOString().slice(0, 10)
    hoursByDate.set(key, (hoursByDate.get(key) ?? 0) + Number(d.hours ?? 0))
  }
  let departureDays = 0
  for (const h of hoursByDate.values()) departureDays += departureLeaveDays(h)

  const yearly = user.annualLeaveDays ?? settings.annualLeaveDays
  const sickYearly = user.sickLeaveDays ?? settings.sickLeaveDays
  const carry = await getCarryOver(user, yearly, sickYearly, year)
  const annual = balance(yearly, Number(usedDays('annual')) + departureDays, accruedLeaveDays(yearly, user.hireDate, ref), carry.annual)

  return {
    year,
    month,
    annual,
    sick: balance(sickYearly, usedDays('sick'), sickYearly, carry.sick),
    // Departures come out of the annual balance: shown as hours (8 hours = 1 day)
    hourly: balance(annual.earned * HOURS_PER_DAY, annual.used * HOURS_PER_DAY),
    hasPendingAdvance: pendingAdvance > 0,
  }
}

/**
 * Leave not used in previous years is added to the new year (the balance is "closed" at the end of each year and
 * moved to the next one, then the yearly days are added on top). Counting starts at the later of the hire year and the
 * year the employee was added to the system, since earlier requests are not recorded here.
 */
async function getCarryOver(
  user: Pick<User, 'id' | 'hireDate' | 'createdAt'>,
  annualYearly: number,
  sickYearly: number,
  year: number,
): Promise<{ annual: number, sick: number }> {
  const startYear = Math.max(user.hireDate?.getUTCFullYear() ?? 0, user.createdAt.getUTCFullYear())
  if (startYear >= year) return { annual: 0, sick: 0 }
  const from = yearRange(startYear).start
  const before = yearRange(year).start
  const [vacations, departures] = await Promise.all([
    prisma.request.findMany({
      where: { userId: user.id, kind: 'VACATION', status: { in: [...COUNTING_STATUSES] }, startDate: { gte: from, lt: before } },
      select: { subtype: true, startDate: true, days: true },
    }),
    prisma.request.findMany({
      where: { userId: user.id, kind: 'HOURLY_LEAVE', subtype: 'personal', status: { in: [...COUNTING_STATUSES] }, date: { gte: from, lt: before } },
      select: { date: true, hours: true },
    }),
  ])
  const usedAnnual = new Map<number, number>()
  const usedSick = new Map<number, number>()
  const add = (m: Map<number, number>, y: number, n: number) => m.set(y, (m.get(y) ?? 0) + n)
  for (const v of vacations) {
    if (v.startDate) add(v.subtype === 'sick' ? usedSick : usedAnnual, v.startDate.getUTCFullYear(), Number(v.days ?? 0))
  }
  const hoursByDate = new Map<string, number>()
  for (const d of departures) {
    if (d.date) hoursByDate.set(d.date.toISOString().slice(0, 10), (hoursByDate.get(d.date.toISOString().slice(0, 10)) ?? 0) + Number(d.hours ?? 0))
  }
  for (const [date, h] of hoursByDate) add(usedAnnual, Number(date.slice(0, 4)), departureLeaveDays(h))

  return {
    annual: rollOverInto(startYear, year, y => ({
      earned: accruedLeaveDays(annualYearly, user.hireDate, new Date(Date.UTC(y, 11, 31))),
      used: usedAnnual.get(y) ?? 0,
    })),
    sick: rollOverInto(startYear, year, y => ({ earned: sickYearly, used: usedSick.get(y) ?? 0 })),
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
