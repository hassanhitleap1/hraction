// Parses the employees Excel sheet into user records.
// The first row is the header. Columns are matched by name (Arabic or English), in any order.
// Only "name" and "phone" are required; everything else is optional.

import { normalizePhone } from './phone'
import { matchBranch, matchDepartment, matchRole } from './org'
import type { Role } from './types'

export type ImportField = 'name' | 'phone' | 'position' | 'department' | 'branch' | 'salary' | 'hireDate' | 'email' | 'role'

/** Header aliases — add more here if your sheet uses different column titles. */
export const HEADER_ALIASES: Record<ImportField, string[]> = {
  name: ['name', 'full name', 'employee name', 'الاسم', 'اسم الموظف', 'الاسم الكامل'],
  phone: ['phone', 'mobile', 'phone number', 'mobile number', 'رقم الهاتف', 'الهاتف', 'رقم التلفون', 'التلفون', 'الموبايل', 'رقم الموبايل', 'الجوال'],
  position: ['position', 'job title', 'title', 'المسمى الوظيفي', 'الوظيفة', 'المسمى'],
  department: ['department', 'dept', 'القسم', 'الدائرة'],
  branch: ['branch', 'store', 'showroom', 'الفرع', 'المعرض'],
  salary: ['salary', 'base salary', 'basic salary', 'الراتب', 'الراتب الأساسي', 'الراتب الاساسي'],
  hireDate: ['hire date', 'joining date', 'start date', 'تاريخ التعيين', 'تاريخ المباشرة', 'تاريخ التعين'],
  email: ['email', 'e-mail', 'البريد', 'البريد الإلكتروني', 'البريد الالكتروني', 'الايميل', 'الإيميل'],
  role: ['role', 'الدور', 'الصلاحية'],
}

const normHeader = (v: string) => v.toString().trim().toLowerCase().replace(/[\s_]+/g, ' ')

/** Converts an exceljs cell value (rich text, hyperlink, formula…) into a plain value. */
export function cellToValue(cell: unknown): string | number | Date | null {
  if (cell === null || cell === undefined) return null
  if (cell instanceof Date || typeof cell === 'number') return cell
  if (typeof cell === 'string') return cell.trim() === '' ? null : cell.trim()
  if (typeof cell === 'boolean') return String(cell)
  if (typeof cell === 'object') {
    const c = cell as Record<string, unknown>
    if (Array.isArray(c.richText)) return (c.richText as { text: string }[]).map(r => r.text).join('').trim() || null
    if ('result' in c) return cellToValue(c.result)
    if ('text' in c) return cellToValue(c.text)
  }
  return String(cell)
}

/** Maps header cells → field name, by column index. */
export function mapHeaders(headerRow: unknown[]): Partial<Record<ImportField, number>> {
  const map: Partial<Record<ImportField, number>> = {}
  headerRow.forEach((cell, index) => {
    const value = cellToValue(cell)
    if (value === null) return
    const key = normHeader(String(value))
    for (const field of Object.keys(HEADER_ALIASES) as ImportField[]) {
      if (map[field] === undefined && HEADER_ALIASES[field].some(a => normHeader(a) === key)) {
        map[field] = index
      }
    }
  })
  return map
}

/** Accepts a Date, an Excel serial number, "YYYY-MM-DD" or "DD/MM/YYYY". */
export function parseSheetDate(value: string | number | Date | null): Date | null {
  if (value === null) return null
  if (value instanceof Date) return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  if (typeof value === 'number') {
    // Excel serial date (days since 1899-12-30)
    if (value < 1 || value > 100000) return null
    return new Date(Math.round((value - 25569) * 86_400_000))
  }
  const s = value.trim()
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m) return utcDate(Number(m[1]), Number(m[2]), Number(m[3]))
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (m) return utcDate(Number(m[3]), Number(m[2]), Number(m[1]))
  return null
}

function utcDate(y: number, m: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null
}

export interface LookupDepartment { id: number, code: string, nameAr: string, nameEn: string }
export interface LookupBranch { id: number, code: string, nameAr: string, nameEn: string, departmentId: number }

export interface ParsedUser {
  row: number
  name: string
  phone: string
  position: string | null
  email: string | null
  departmentId: number | null
  branchId: number | null
  baseSalary: number
  hireDate: Date | null
  role: Role
}

export interface ImportIssue {
  row: number
  code: 'missing_name' | 'invalid_phone' | 'duplicate_in_sheet' | 'unknown_department' | 'unknown_branch' | 'invalid_salary' | 'invalid_date'
  value?: string
}

export interface ParseResult {
  users: ParsedUser[]
  errors: ImportIssue[] // row skipped
  warnings: ImportIssue[] // row imported, a field ignored
  missingColumns: ImportField[]
}

/**
 * rows[0] is the header row. Row numbers in the result are 1-based like in Excel.
 */
export function parseUserRows(rows: unknown[][], departments: LookupDepartment[], branches: LookupBranch[]): ParseResult {
  const result: ParseResult = { users: [], errors: [], warnings: [], missingColumns: [] }
  if (rows.length === 0) {
    result.missingColumns = ['name', 'phone']
    return result
  }

  const map = mapHeaders(rows[0]!)
  result.missingColumns = (['name', 'phone'] as const).filter(f => map[f] === undefined)
  if (result.missingColumns.length) return result

  const get = (row: unknown[], field: ImportField) => (map[field] === undefined ? null : cellToValue(row[map[field]!]))
  const seen = new Set<string>()

  rows.slice(1).forEach((row, i) => {
    const rowNo = i + 2
    if (!row || row.every(c => cellToValue(c) === null)) return // empty line

    const name = get(row, 'name')
    if (!name) return void result.errors.push({ row: rowNo, code: 'missing_name' })

    const rawPhone = get(row, 'phone')
    const phone = normalizePhone(rawPhone)
    if (!phone) return void result.errors.push({ row: rowNo, code: 'invalid_phone', value: String(rawPhone ?? '') })
    if (seen.has(phone)) return void result.errors.push({ row: rowNo, code: 'duplicate_in_sheet', value: phone })
    seen.add(phone)

    let departmentId: number | null = null
    const deptValue = get(row, 'department')
    if (deptValue) {
      const dept = matchDepartment(String(deptValue), departments)
      if (dept) departmentId = dept.id
      else result.warnings.push({ row: rowNo, code: 'unknown_department', value: String(deptValue) })
    }

    let branchId: number | null = null
    const branchValue = get(row, 'branch')
    if (branchValue) {
      const branch = matchBranch(String(branchValue), branches)
      if (branch) {
        branchId = branch.id
        departmentId = departmentId ?? branch.departmentId
      }
      else result.warnings.push({ row: rowNo, code: 'unknown_branch', value: String(branchValue) })
    }

    let baseSalary = 0
    const salaryValue = get(row, 'salary')
    if (salaryValue !== null) {
      const n = Number(String(salaryValue).replace(/[^\d.]/g, ''))
      if (Number.isFinite(n) && n >= 0) baseSalary = n
      else result.warnings.push({ row: rowNo, code: 'invalid_salary', value: String(salaryValue) })
    }

    const dateValue = get(row, 'hireDate')
    const hireDate = parseSheetDate(dateValue)
    if (dateValue !== null && !hireDate) result.warnings.push({ row: rowNo, code: 'invalid_date', value: String(dateValue) })

    const email = get(row, 'email')
    const position = get(row, 'position')

    result.users.push({
      row: rowNo,
      name: String(name).trim(),
      phone,
      position: position ? String(position).trim() : null,
      email: email ? String(email).trim() : null,
      departmentId,
      branchId,
      baseSalary,
      hireDate,
      role: matchRole(get(row, 'role') as string | null) ?? 'EMPLOYEE',
    })
  })

  return result
}
