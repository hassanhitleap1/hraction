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

  // "Log in as": the real HR / IT account must still be active and allowed to do it
  if (session.impersonator) {
    const admin = await prisma.user.findUnique({ where: { id: session.impersonator.id } })
    if (!admin || !admin.isActive || !canManage(admin.role)) {
      await clearUserSession(event)
      fail(401, 'unauthorized')
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { department: true, branch: true },
  })
  if (!user || !user.isActive) {
    await clearUserSession(event)
    fail(401, 'unauthorized')
  }
  // While impersonating, the first-login setup is skipped (only the real owner sets his password)
  if (user.mustChangePassword && !options.allowSetup && !session.impersonator) fail(403, 'setup_required')
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

/**
 * Writes the session cookie from the user record.
 * `impersonator`: the HR / IT account behind a "log in as" session.
 *   undefined = keep the current one (profile / photo / language updates), null = clear it.
 */
export async function writeSession(event: H3Event, user: User, impersonator?: Pick<User, 'id' | 'name'> | null) {
  const admin = impersonator === undefined ? (await getUserSession(event)).impersonator : impersonator
  await replaceUserSession(event, {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      mustChangePassword: admin ? false : user.mustChangePassword,
      locale: user.locale,
      photoUrl: user.photoUrl,
    },
    ...(admin ? { impersonator: { id: admin.id, name: admin.name } } : {}),
    loggedInAt: Date.now(),
  })
}

/** Blocks actions that only the real account owner may do (password changes) while impersonating. */
export async function forbidWhileImpersonating(event: H3Event) {
  const session = await getUserSession(event)
  if (session.impersonator) fail(403, 'not_while_impersonating')
}
