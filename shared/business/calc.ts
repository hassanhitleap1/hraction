// Date, money, balance and payroll calculations.
// All dates are handled as calendar dates in UTC ("YYYY-MM-DD") to avoid timezone drift.
// Money is calculated in fils (1 JOD = 1000 fils) to avoid floating-point errors.

// ---------- Dates ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/** Parses "YYYY-MM-DD" into a UTC Date, or null if invalid. */
export function parseDateOnly(value: string): Date | null {
  if (!DATE_RE.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  // Reject impossible dates such as 2026-02-30
  return date.toISOString().slice(0, 10) === value ? date : null
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export const isValidTime = (value: string): boolean => TIME_RE.test(value)
export const isValidMonth = (value: string): boolean => MONTH_RE.test(value)

/** "YYYY-MM" of a date (UTC). */
export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

/** Adds `n` months to a "YYYY-MM" key. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const total = y * 12 + (m - 1) + n
  const year = Math.floor(total / 12)
  const mon = (total % 12) + 1
  return `${year}-${String(mon).padStart(2, '0')}`
}

/** First and last day of a "YYYY-MM" month as UTC dates. */
export function monthRange(month: string): { start: Date, end: Date } {
  const start = new Date(`${month}-01T00:00:00.000Z`)
  const next = new Date(`${addMonths(month, 1)}-01T00:00:00.000Z`)
  return { start, end: new Date(next.getTime() - 86_400_000) }
}

/** Jan 1 – Dec 31 of a year as UTC dates. */
export function yearRange(year: number): { start: Date, end: Date } {
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31)) }
}

/**
 * Number of vacation days between two dates (inclusive), not counting weekend days.
 * weekendDays: 0 = Sunday … 6 = Saturday (Jordan: Friday = 5).
 */
export function countVacationDays(start: Date, end: Date, weekendDays: number[] = []): number {
  if (end.getTime() < start.getTime()) return 0
  let count = 0
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    if (!weekendDays.includes(new Date(t).getUTCDay())) count++
  }
  return count
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number) as [number, number]
  return h * 60 + m
}

/** Hours between two "HH:mm" times on the same day (rounded to 2 decimals). Returns 0 if `to` is not after `from`. */
export function hoursBetween(from: string, to: string): number {
  const diff = timeToMinutes(to) - timeToMinutes(from)
  return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0
}

// ---------- Money ----------

export const toFils = (jod: number | string): number => Math.round(Number(jod) * 1000)
export const fromFils = (fils: number): number => fils / 1000

export function sumMoney(values: Array<number | string>): number {
  return fromFils(values.reduce<number>((acc, v) => acc + toFils(v), 0))
}

/**
 * Splits an advance into equal monthly installments starting at `firstMonth`.
 * Any rounding remainder is added to the last installment, so the total is exact.
 */
export function installmentPlan(amount: number, count: number, firstMonth: string): { month: string, amount: number }[] {
  const n = Math.max(1, Math.floor(count))
  const total = toFils(amount)
  const each = Math.floor(total / n)
  return Array.from({ length: n }, (_, i) => ({
    month: addMonths(firstMonth, i),
    amount: fromFils(i === n - 1 ? total - each * (n - 1) : each),
  }))
}

// ---------- Balances ----------

export interface BalanceCheck {
  ok: boolean
  remaining: number
}

/** Can the employee take `requested` more units (days or hours) given the allowance and what is already used/reserved? */
export function checkBalance(allowance: number, used: number, requested: number): BalanceCheck {
  const remaining = Math.max(0, Math.round((allowance - used) * 100) / 100)
  return { ok: requested > 0 && requested <= remaining, remaining }
}

// ---------- Payroll ----------

export interface SalaryBreakdown {
  baseSalary: number
  advances: number
  deductions: number
  net: number
}

/** Net salary = base − advance installments of the month − applied deductions of the month. */
export function computeSalary(
  baseSalary: number | string,
  advanceInstallments: Array<number | string>,
  deductions: Array<number | string>,
): SalaryBreakdown {
  const base = toFils(baseSalary)
  const adv = advanceInstallments.reduce<number>((a, v) => a + toFils(v), 0)
  const ded = deductions.reduce<number>((a, v) => a + toFils(v), 0)
  return {
    baseSalary: fromFils(base),
    advances: fromFils(adv),
    deductions: fromFils(ded),
    net: fromFils(base - adv - ded),
  }
}
