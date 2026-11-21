import { toOrgPerson } from './auth'
import type { Branch, Deduction, Department, Request, User } from '@prisma/client'
import { canCancel, canDecide, canReviewDeduction } from '#shared/business/access'
import { parseWeekendDays } from '#shared/business/calc'
import type { OrgPerson } from '#shared/business/types'

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))
const day = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null)

export const serializeDepartment = (d: Department | null) =>
  d ? { id: d.id, code: d.code, nameAr: d.nameAr, nameEn: d.nameEn, hasBranches: d.hasBranches } : null

export const serializeBranch = (b: Branch | null) =>
  b ? { id: b.id, code: b.code, nameAr: b.nameAr, nameEn: b.nameEn, departmentId: b.departmentId } : null

type UserWithOrg = User & { department?: Department | null, branch?: Branch | null }

/** Full profile (for the user himself, his director, HR, IT, CEO). Never includes the password hash. */
export function serializeUser(u: UserWithOrg) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    position: u.position,
    photoUrl: u.photoUrl,
    role: u.role,
    departmentId: u.departmentId,
    branchId: u.branchId,
    department: serializeDepartment(u.department ?? null),
    branch: serializeBranch(u.branch ?? null),
    baseSalary: Number(u.baseSalary),
    hireDate: day(u.hireDate),
    locale: u.locale,
    mustChangePassword: u.mustChangePassword,
    isActive: u.isActive,
    annualLeaveDays: u.annualLeaveDays,
    sickLeaveDays: u.sickLeaveDays,
    /** His own weekly days off; null = the company setting */
    weekendDays: parseWeekendDays(u.weekendDays),
  }
}

/** Small user card used inside lists. */
export const userSummary = (u: UserWithOrg | null | undefined) =>
  u
    ? {
        id: u.id,
        name: u.name,
        photoUrl: u.photoUrl,
        position: u.position,
        department: serializeDepartment(u.department ?? null),
        branch: serializeBranch(u.branch ?? null),
      }
    : null

export type RequestWithPeople = Request & {
  user: UserWithOrg
  director?: User | null
  hr?: User | null
}

export function serializeRequest(r: RequestWithPeople, actor: OrgPerson) {
  return {
    id: r.id,
    kind: r.kind,
    subtype: r.subtype,
    status: r.status,
    date: day(r.date),
    fromTime: r.fromTime,
    toTime: r.toTime,
    hours: num(r.hours),
    startDate: day(r.startDate),
    endDate: day(r.endDate),
    days: r.days,
    amount: num(r.amount),
    installments: r.installments,
    reason: r.reason,
    user: userSummary(r.user),
    director: r.director ? { id: r.director.id, name: r.director.name } : null,
    directorDecision: r.directorDecision,
    directorComment: r.directorComment,
    directorDecidedAt: r.directorDecidedAt?.toISOString() ?? null,
    hr: r.hr ? { id: r.hr.id, name: r.hr.name } : null,
    hrDecision: r.hrDecision,
    hrComment: r.hrComment,
    hrDecidedAt: r.hrDecidedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    canDecide: canDecide(actor, toOrgPerson(r.user), r.status),
    canCancel: canCancel(actor, r.userId, r.status),
  }
}

export type DeductionWithPeople = Deduction & {
  user: UserWithOrg
  createdBy: User
  reviewedBy?: User | null
}

export function serializeDeduction(d: DeductionWithPeople, actor: OrgPerson) {
  return {
    id: d.id,
    amount: Number(d.amount),
    month: d.month,
    reason: d.reason,
    status: d.status,
    user: userSummary(d.user),
    createdBy: { id: d.createdBy.id, name: d.createdBy.name },
    reviewedBy: d.reviewedBy ? { id: d.reviewedBy.id, name: d.reviewedBy.name } : null,
    reviewComment: d.reviewComment,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    canReview: canReviewDeduction(actor, d.userId, d.status),
  }
}

/** Prisma `include` used by every request query. */
export const requestInclude = {
  user: { include: { department: true, branch: true } },
  director: true,
  hr: true,
} as const

export const deductionInclude = {
  user: { include: { department: true, branch: true } },
  createdBy: true,
  reviewedBy: true,
} as const
