// Shared types used by the server, the client and the scripts.
// Kept as string unions (not TS enums) so they match the Prisma enums 1:1.

export type Role = 'EMPLOYEE' | 'DIRECTOR' | 'HR' | 'IT' | 'CEO'

export type RequestKind = 'HOURLY_LEAVE' | 'VACATION' | 'ADVANCE'

export type RequestStatus = 'PENDING_DIRECTOR' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type DeductionStatus = 'PENDING_HR' | 'APPLIED' | 'REJECTED'

export type HourlyLeaveType = 'personal' | 'work'

export type VacationType = 'annual' | 'sick'

export type Decision = 'approve' | 'reject'

/** The minimum a permission check needs to know about a person. */
export interface OrgPerson {
  id: number
  role: Role
  departmentId: number | null
  branchId: number | null
}

export interface HrSettings {
  /** Yearly annual-vacation allowance in days */
  annualLeaveDays: number
  /** Yearly sick-vacation allowance in days */
  sickLeaveDays: number
  /** Hourly leave (مغادرة) allowance per month, in hours */
  hourlyLeaveHoursPerMonth: number
  /** Days of the week not counted in vacations (0 = Sunday … 6 = Saturday) */
  weekendDays: number[]
  /** Maximum number of monthly installments for a salary advance */
  maxAdvanceInstallments: number
}

export const DEFAULT_SETTINGS: HrSettings = {
  annualLeaveDays: 14,
  sickLeaveDays: 14,
  hourlyLeaveHoursPerMonth: 8,
  weekendDays: [5], // Friday
  maxAdvanceInstallments: 6,
}
