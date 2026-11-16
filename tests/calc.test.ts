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
