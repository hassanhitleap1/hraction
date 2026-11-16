// Company structure: departments, retail branches and roles (Arabic / English).
// Used by the seeder, the Excel importer and the UI.

import type { Role } from './types'

export interface DepartmentSeed {
  code: string
  nameAr: string
  nameEn: string
  hasBranches?: boolean
}

export interface BranchSeed {
  code: string
  nameAr: string
  nameEn: string
}

export const DEPARTMENTS: DepartmentSeed[] = [
  { code: 'marketing', nameAr: 'التسويق', nameEn: 'Marketing' },
  { code: 'hr', nameAr: 'الموارد البشرية', nameEn: 'Human Resources' },
  { code: 'media', nameAr: 'الميديا', nameEn: 'Media' },
  { code: 'accounting', nameAr: 'المحاسبة', nameEn: 'Accounting' },
  { code: 'b2b', nameAr: 'مبيعات الشركات B2B', nameEn: 'B2B' },
  { code: 'call_center', nameAr: 'مركز الاتصال', nameEn: 'Call Center' },
  { code: 'maintenance', nameAr: 'الصيانة', nameEn: 'Maintenance' },
  { code: 'retail', nameAr: 'المعارض (التجزئة)', nameEn: 'Retail', hasBranches: true },
]

/** Branches of the Retail department */
export const RETAIL_BRANCHES: BranchSeed[] = [
  { code: '7th_mobile', nameAr: 'السابع موبايل', nameEn: '7th Mobile' },
  { code: '7th_city_mall', nameAr: 'السابع موبايل سيتي مول', nameEn: '7th Mobile City Mall' },
  { code: '7th_express', nameAr: 'السابع إكسبرس', nameEn: '7th Express' },
  { code: 'express_marka', nameAr: 'إكسبرس ماركا', nameEn: 'Express Marka' },
  { code: 'express_university', nameAr: 'إكسبرس الجامعة', nameEn: 'Express University' },
]

export const ROLES: { code: Role; nameAr: string; nameEn: string }[] = [
  { code: 'EMPLOYEE', nameAr: 'موظف', nameEn: 'Employee' },
  { code: 'DIRECTOR', nameAr: 'مدير القسم', nameEn: 'Director of Department' },
  { code: 'HR', nameAr: 'الموارد البشرية', nameEn: 'HR' },
  { code: 'IT', nameAr: 'تقنية المعلومات', nameEn: 'IT' },
  { code: 'CEO', nameAr: 'المدير التنفيذي', nameEn: 'CEO' },
]

const normalizeKey = (value: string) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')

/** Find a department by its code, Arabic name or English name (used by the Excel import). */
export function matchDepartment<T extends DepartmentSeed>(value: string | null | undefined, list: T[]): T | null {
  if (!value) return null
  const key = normalizeKey(value)
  return (
    list.find(d => [d.code, d.nameAr, d.nameEn].some(v => normalizeKey(v) === key))
    ?? list.find(d => [d.nameAr, d.nameEn].some(v => normalizeKey(v).includes(key) || key.includes(normalizeKey(v))))
    ?? null
  )
}

/** Find a branch by its code, Arabic name or English name. */
export function matchBranch<T extends BranchSeed>(value: string | null | undefined, list: T[]): T | null {
  if (!value) return null
  const key = normalizeKey(value)
  return list.find(b => [b.code, b.nameAr, b.nameEn].some(v => normalizeKey(v) === key)) ?? null
}

/** Find a role by its code or name in either language. */
export function matchRole(value: string | null | undefined): Role | null {
  if (!value) return null
  const key = normalizeKey(value)
  const aliases: Record<string, Role> = {
    'director': 'DIRECTOR',
    'manager': 'DIRECTOR',
    'head': 'DIRECTOR',
    'مدير': 'DIRECTOR',
    'head of hr': 'HR',
    'hr': 'HR',
    'it': 'IT',
    'ceo': 'CEO',
    'employee': 'EMPLOYEE',
  }
  const found = ROLES.find(r => [r.code, r.nameAr, r.nameEn].some(v => normalizeKey(v) === key))
  return found?.code ?? aliases[key] ?? null
}
