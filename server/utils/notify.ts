import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

/**
 * Notification types — each one has a translation under `notifications.types.<type>` (ar.json / en.json).
 *  request_submitted          → director / HR: someone submitted a request
 *  request_awaiting_hr        → HR: the director approved, HR decision needed
 *  request_director_approved  → employee: the director approved, waiting for HR
 *  request_approved           → employee: final approval
 *  request_rejected           → employee: rejected
 *  deduction_pending          → HR: a director recorded a deduction to review
 *  deduction_applied          → employee: a deduction was applied to his salary
 *  deduction_rejected         → director: HR rejected his deduction
 */
export type NotificationType =
  | 'request_submitted'
  | 'request_awaiting_hr'
  | 'request_director_approved'
  | 'request_approved'
  | 'request_rejected'
  | 'deduction_pending'
  | 'deduction_applied'
  | 'deduction_rejected'
  | 'registration_pending' // HR: someone registered and waits for activation

export async function notify(
  userIds: number[],
  type: NotificationType,
  data: Prisma.InputJsonValue,
  link?: string,
) {
  const unique = [...new Set(userIds)]
  if (!unique.length) return
  await prisma.notification.createMany({
    data: unique.map(userId => ({ userId, type, data, link: link ?? null })),
  })
}

/** Active HR users (they receive HR notifications). */
export async function hrUserIds(excludeId?: number): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { role: 'HR', isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  })
  return users.map(u => u.id)
}

export async function audit(
  actorId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  data?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, data } })
}
