// The approvals inbox: requests (and, for HR/IT, deductions) waiting for MY decision.
import { canManage } from '#shared/business/access'
import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const me = toOrgPerson(actor)

  let where: Prisma.RequestWhereInput
  if (canManage(actor.role)) {
    where = { status: { in: ['PENDING_HR', 'PENDING_DIRECTOR'] }, userId: { not: actor.id } }
  }
  else if (actor.role === 'DIRECTOR') {
    where = { status: 'PENDING_DIRECTOR', user: teamWhere(me) }
  }
  else {
    return { requests: [], deductions: [] }
  }

  const [requests, deductions] = await Promise.all([
    prisma.request.findMany({
      where,
      include: requestInclude,
      // PENDING_HR before PENDING_DIRECTOR for HR, oldest first
      orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
      take: 200,
    }),
    canManage(actor.role)
      ? prisma.deduction.findMany({
          where: { status: 'PENDING_HR', userId: { not: actor.id } },
          include: deductionInclude,
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),
  ])

  return {
    requests: requests.map(r => serializeRequest(r, me)).filter(r => r.canDecide),
    deductions: deductions.map(d => serializeDeduction(d, me)),
  }
})
