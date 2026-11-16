// Jordanian mobile numbers are stored in one format: 07XXXXXXXX (10 digits).
// Accepts: 0791234567, 791234567, +962791234567, 00962791234567, 962 79 123 4567,
// and Arabic-Indic digits (٠٧٩١٢٣٤٥٦٧).

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_DIGITS.indexOf(d)
    return String(i >= 0 ? i : PERSIAN_DIGITS.indexOf(d))
  })
}

/** Returns the phone as 07XXXXXXXX, or null when it is not a valid Jordanian mobile number. */
export function normalizePhone(input: unknown): string | null {
  if (input === null || input === undefined) return null
  let digits = toLatinDigits(String(input)).replace(/\D/g, '')

  if (digits.startsWith('00962')) digits = digits.slice(5)
  else if (digits.startsWith('962')) digits = digits.slice(3)

  if (digits.length === 9 && digits.startsWith('7')) digits = `0${digits}`

  // Jordanian mobiles: 077, 078, 079
  if (!/^07[789]\d{7}$/.test(digits)) return null
  return digits
}
