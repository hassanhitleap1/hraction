// Roles, permissions and the approval workflow.
//
// Hierarchy: CEO → HR → Director of Department → Employee
//  - EMPLOYEE : own data only
//  - DIRECTOR : own data + the employees of his department (and branch, if he is assigned to one)
//  - HR / IT / CEO : see and do everything (the CEO has full access)

import type { Decision, DeductionStatus, OrgPerson, RequestStatus, Role } from './types'

/** HR, IT and CEO see every employee and every request. */
export const canViewAll = (role: Role): boolean => role === 'HR' || role === 'IT' || role === 'CEO'

/** HR, IT and the CEO can add/edit employees, salaries, balances, settings, imports, payroll, approvals… */
export const canManage = (role: Role): boolean => role === 'HR' || role === 'IT' || role === 'CEO'

/** Who sees the approvals inbox. */
export const isApprover = (role: Role): boolean => role === 'DIRECTOR' || canManage(role)

/** Who may record deductions (خصومات). Employees cannot. */
export const canRecordDeductions = (role: Role): boolean => role === 'DIRECTOR' || canManage(role)

/**
 * Is `subject` one of the people this director is responsible for?
 * A director covers his whole department, or only his branch when he is assigned to one.
 */
export function inDirectorScope(director: OrgPerson, subject: OrgPerson): boolean {
  if (director.role !== 'DIRECTOR') return false
  if (director.id === subject.id) return false
  if (director.departmentId === null || subject.departmentId !== director.departmentId) return false
  if (director.branchId !== null && subject.branchId !== director.branchId) return false
  return true
}

export function canViewPerson(actor: OrgPerson, subject: OrgPerson): boolean {
  return actor.id === subject.id || canViewAll(actor.role) || inDirectorScope(actor, subject)
}

export function canRecordDeductionFor(actor: OrgPerson, subject: OrgPerson): boolean {
  if (actor.id === subject.id) return false
  return canManage(actor.role) || inDirectorScope(actor, subject)
}

/** The directors (from `candidates`) responsible for `subject`. */
export function directorsOf<T extends OrgPerson>(subject: OrgPerson, candidates: T[]): T[] {
  return candidates.filter(c => inDirectorScope(c, subject))
}

/**
 * Where a new request starts.
 * Employees with a director → the director first; everyone else (directors, HR, IT, CEO,
 * or employees whose department has no director) → straight to HR.
 */
export function initialRequestStatus(requesterRole: Role, hasDirector: boolean): RequestStatus {
  return requesterRole === 'EMPLOYEE' && hasDirector ? 'PENDING_DIRECTOR' : 'PENDING_HR'
}

export const isPending = (status: RequestStatus): boolean =>
  status === 'PENDING_DIRECTOR' || status === 'PENDING_HR'

export type DecideError = 'cannot_decide_own' | 'not_pending' | 'forbidden' | 'out_of_scope'

export type DecideResult =
  | { ok: true, stage: 'director' | 'hr', status: RequestStatus }
  | { ok: false, error: DecideError }

/**
 * Approval workflow:
 *  - Director approves → PENDING_HR, rejects → REJECTED
 *  - HR / IT / CEO approve or reject at any pending stage → final (APPROVED / REJECTED)
 *  - Nobody decides on their own request
 */
export function decideRequest(input: {
  actor: OrgPerson
  requester: OrgPerson
  status: RequestStatus
  decision: Decision
}): DecideResult {
  const { actor, requester, status, decision } = input
  if (actor.id === requester.id) return { ok: false, error: 'cannot_decide_own' }
  if (!isPending(status)) return { ok: false, error: 'not_pending' }

  if (canManage(actor.role)) {
    return { ok: true, stage: 'hr', status: decision === 'approve' ? 'APPROVED' : 'REJECTED' }
  }

  if (actor.role === 'DIRECTOR') {
    if (status !== 'PENDING_DIRECTOR') return { ok: false, error: 'forbidden' }
    if (!inDirectorScope(actor, requester)) return { ok: false, error: 'out_of_scope' }
    return { ok: true, stage: 'director', status: decision === 'approve' ? 'PENDING_HR' : 'REJECTED' }
  }

  return { ok: false, error: 'forbidden' }
}

/** Can `actor` act on this request right now? (used to show the approve/reject buttons) */
export function canDecide(actor: OrgPerson, requester: OrgPerson, status: RequestStatus): boolean {
  return decideRequest({ actor, requester, status, decision: 'approve' }).ok
}

/** The owner can cancel a request while it is still pending. */
export function canCancel(actor: OrgPerson, requesterId: number, status: RequestStatus): boolean {
  return actor.id === requesterId && isPending(status)
}

/** Deductions recorded by HR/IT apply immediately; deductions from a director wait for HR review. */
export function initialDeductionStatus(creatorRole: Role): DeductionStatus {
  return canManage(creatorRole) ? 'APPLIED' : 'PENDING_HR'
}

export function canReviewDeduction(actor: OrgPerson, ownerId: number, status: DeductionStatus): boolean {
  return canManage(actor.role) && actor.id !== ownerId && status === 'PENDING_HR'
}
