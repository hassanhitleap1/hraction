import type { HrSettings } from '#shared/business/types'

export interface Balance { allowance: number, earned: number, used: number, remaining: number }

export interface MeResponse {
  user: {
    id: number
    name: string
    phone: string
    email: string | null
    position: string | null
    photoUrl: string | null
    role: 'EMPLOYEE' | 'DIRECTOR' | 'HR' | 'IT' | 'CEO'
    department: { id: number, code: string, nameAr: string, nameEn: string, hasBranches: boolean } | null
    branch: { id: number, code: string, nameAr: string, nameEn: string } | null
    baseSalary: number
    hireDate: string | null
    locale: string
  }
  balances: { year: number, month: string, annual: Balance, sick: Balance, hourly: Balance, hasPendingAdvance: boolean }
  salary: { month: string, baseSalary: number, advances: number, deductions: number, net: number }
  unreadNotifications: number
  settings: Pick<HrSettings, 'maxAdvanceInstallments' | 'weekendDays'>
}

/** The logged-in user's profile, balances and salary — shared by every page. */
export function useMe() {
  return useFetch<MeResponse>('/api/me', { key: 'me', dedupe: 'defer' })
}
