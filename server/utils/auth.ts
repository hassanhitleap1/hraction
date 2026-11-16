import { prisma } from './prisma'
import { fail } from './http'
import type { H3Event } from 'h3'
import type { Branch, Department, Prisma, User } from '@prisma/client'
import { canManage, canViewAll } from '#shared/business/access'
import type { OrgPerson, Role } from '#shared/business/types'

export type CurrentUser = User & { department: Department | null, branch: Branch | null }

/**
 * Returns the logged-in user, freshly loaded from the database (so role / active changes apply immediately).
 * Users who still have to change their password can only reach endpoints that pass `allowSetup`.
 */
export async function requireUser(event: H3Event, options: { allowSetup?: boolean } = {}): Promise<CurrentUser> {
  const session = await requireUserSession(event)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { department: true, branch: true },
  })
  if (!user || !user.isActive) {
    await clearUserSession(event)
    fail(401, 'unauthorized')
  }
  if (user.mustChangePassword && !options.allowSetup) fail(403, 'setup_required')
  return user
}

/** Requires one of the given roles. */
export async function requireRole(event: H3Event, roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser(event)
  if (!roles.includes(user.role)) fail(403, 'forbidden')
  return user
}

/** HR / IT only (add & edit). */
export async function requireManager(event: H3Event): Promise<CurrentUser> {
  const user = await requireUser(event)
  if (!canManage(user.role)) fail(403, 'forbidden')
  return user
}

export const toOrgPerson = (u: Pick<User, 'id' | 'role' | 'departmentId' | 'branchId'>): OrgPerson => ({
  id: u.id,
  role: u.role,
  departmentId: u.departmentId,
  branchId: u.branchId,
})

/** Prisma filter for the employees `actor` is allowed to see (besides himself). */
export function teamWhere(actor: OrgPerson): Prisma.UserWhereInput {
  if (canViewAll(actor.role)) return {}
  if (actor.role === 'DIRECTOR' && actor.departmentId !== null) {
    return {
      departmentId: actor.departmentId,
      ...(actor.branchId !== null ? { branchId: actor.branchId } : {}),
      id: { not: actor.id },
    }
  }
  return { id: -1 } // nobody
}

/** Writes the session cookie from the user record. */
export async function writeSession(event: H3Event, user: User) {
  await replaceUserSession(event, {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      locale: user.locale,
      photoUrl: user.photoUrl,
    },
    loggedInAt: Date.now(),
  })
}
