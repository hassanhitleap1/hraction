// Display helpers (auto-imported in every component).

type Named = { nameAr: string, nameEn: string } | null | undefined

/** Picks the Arabic or English name of a department / branch / role. */
export function localName(item: Named, locale: string): string {
  if (!item) return '—'
  return locale === 'ar' ? item.nameAr : item.nameEn
}

/** 1250.5 → "1,250.500 د.أ" / "1,250.500 JOD" */
export function formatMoney(value: number | null | undefined, locale: string): string {
  const n = Number(value ?? 0)
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  return locale === 'ar' ? `${formatted} د.أ` : `${formatted} JOD`
}

/** "2026-11-16" → "16/11/2026" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** ISO timestamp → "16/11/2026 14:30" (local time) */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "2026-11" → "نوفمبر 2026" / "November 2026" */
export function formatMonth(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  const [y, m] = value.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale === 'ar' ? 'ar-JO-u-nu-latn' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Today as "YYYY-MM-DD" (local) */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** This month as "YYYY-MM" (local) */
export function thisMonth(): string {
  return today().slice(0, 7)
}

/** URL slug ↔ request kind */
export const KIND_BY_SLUG = {
  'hourly-leave': 'HOURLY_LEAVE',
  'vacation': 'VACATION',
  'advance': 'ADVANCE',
} as const

export type KindSlug = keyof typeof KIND_BY_SLUG

export const SLUG_BY_KIND: Record<string, KindSlug> = {
  HOURLY_LEAVE: 'hourly-leave',
  VACATION: 'vacation',
  ADVANCE: 'advance',
}
