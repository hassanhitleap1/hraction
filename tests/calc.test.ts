import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addMonths,
  checkBalance,
  computeSalary,
  countVacationDays,
  hoursBetween,
  installmentPlan,
  isValidMonth,
  isValidTime,
  monthRange,
  parseDateOnly,
  sumMoney,
} from '../shared/business/calc.ts'

test('parseDateOnly validates real calendar dates', () => {
  assert.equal(parseDateOnly('2026-11-16')?.toISOString(), '2026-11-16T00:00:00.000Z')
  assert.equal(parseDateOnly('2026-02-30'), null)
  assert.equal(parseDateOnly('16/11/2026'), null)
})

test('vacation days skip Fridays', () => {
  // 2026-11-16 is a Monday → Mon..Sun = 7 days, minus Friday = 6
  const start = parseDateOnly('2026-11-16')!
  const end = parseDateOnly('2026-11-22')!
  assert.equal(countVacationDays(start, end, [5]), 6)
  assert.equal(countVacationDays(start, end, [5, 6]), 5)
  assert.equal(countVacationDays(start, start, [5]), 1)
  assert.equal(countVacationDays(end, start, [5]), 0, 'end before start')
})

test('hourly leave duration', () => {
  assert.equal(hoursBetween('09:00', '11:30'), 2.5)
  assert.equal(hoursBetween('13:15', '14:00'), 0.75)
  assert.equal(hoursBetween('14:00', '13:00'), 0)
  assert.equal(isValidTime('24:00'), false)
  assert.equal(isValidTime('08:05'), true)
})

test('months', () => {
  assert.equal(addMonths('2026-11', 1), '2026-12')
  assert.equal(addMonths('2026-12', 1), '2027-01')
  assert.equal(addMonths('2026-01', -1), '2025-12')
  assert.equal(addMonths('2026-03', 14), '2027-05')
  assert.equal(monthRange('2026-02').end.toISOString().slice(0, 10), '2026-02-28')
  assert.equal(isValidMonth('2026-13'), false)
})

test('balance check', () => {
  assert.deepEqual(checkBalance(14, 5, 9), { ok: true, remaining: 9 })
  assert.deepEqual(checkBalance(14, 5, 10), { ok: false, remaining: 9 })
  assert.deepEqual(checkBalance(14, 20, 1), { ok: false, remaining: 0 })
  assert.deepEqual(checkBalance(8, 2.5, 0), { ok: false, remaining: 5.5 })
})

test('installment plan sums exactly', () => {
  const plan = installmentPlan(100, 3, '2026-12')
  assert.deepEqual(plan.map(p => p.month), ['2026-12', '2027-01', '2027-02'])
  assert.deepEqual(plan.map(p => p.amount), [33.333, 33.333, 33.334])
  assert.equal(sumMoney(plan.map(p => p.amount)), 100)
  assert.deepEqual(installmentPlan(250, 1, '2026-12'), [{ month: '2026-12', amount: 250 }])
})

test('net salary', () => {
  assert.deepEqual(computeSalary('500.000', [100, '50.5'], ['10.25']), {
    baseSalary: 500,
    advances: 150.5,
    deductions: 10.25,
    net: 339.25,
  })
  assert.equal(computeSalary(0.3, [0.1], [0.2]).net, 0, 'no floating point drift')
})

test('accruedLeaveDays earns yearly/12/30 per day from Jan 1 or the hire date', async () => {
  const { accruedLeaveDays } = await import('../shared/business/calc.ts')
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`)
  // Hired before this year: Jan 1 → Nov 21 = 10×30 + 21 = 321 days → 321 × 14/360
  assert.equal(accruedLeaveDays(14, d('2020-05-10'), d('2026-11-21')), 12.48)
  assert.equal(accruedLeaveDays(14, null, d('2026-11-21')), 12.48)
  // Full year
  assert.equal(accruedLeaveDays(14, null, d('2026-12-31')), 14)
  // Hired this year on Mar 15: Mar 15 → Nov 21 = 8×30 + 6 + 1 = 247 days
  assert.equal(accruedLeaveDays(14, d('2026-03-15'), d('2026-11-21')), Math.round(247 * 14 / 360 * 100) / 100)
  // Not hired yet
  assert.equal(accruedLeaveDays(14, d('2026-12-01'), d('2026-11-21')), 0)
  // First day of work earns one day's share
  assert.equal(accruedLeaveDays(14, null, d('2026-01-01')), 0.04)
})

test('per-employee weekend days override the company setting', async () => {
  const { parseWeekendDays, formatWeekendDays, effectiveWeekendDays } = await import('../shared/business/calc.ts')
  assert.equal(parseWeekendDays(null), null)
  assert.deepEqual(parseWeekendDays('6,5,5,9,x'), [5, 6])
  assert.deepEqual(parseWeekendDays(''), []) // works every day
  assert.equal(formatWeekendDays([6, 5, 5]), '5,6')
  assert.equal(formatWeekendDays(null), null)
  assert.deepEqual(effectiveWeekendDays(null, [5]), [5]) // company default
  assert.deepEqual(effectiveWeekendDays('5,6', [5]), [5, 6]) // his own
  assert.deepEqual(effectiveWeekendDays('', [5]), []) // no days off
  // A Fri+Sat employee: Thu 2026-11-19 → Sun 2026-11-22 = Thu + Sun = 2 days
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`)
  assert.equal(countVacationDays(d('2026-11-19'), d('2026-11-22'), effectiveWeekendDays('5,6', [5])), 2)
  assert.equal(countVacationDays(d('2026-11-19'), d('2026-11-22'), effectiveWeekendDays(null, [5])), 3)
})
