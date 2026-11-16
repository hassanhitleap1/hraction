// List hourly leaves / vacations / advances.
//  scope=mine (default) → my own requests
//  scope=team           → the requests of the people I can see (director: his team; HR/IT/CEO: everyone)
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { parseDateOnly } from '#shared/business/calc'

const schema = z.object({
  kind: z.enum(['HOURLY_LEAVE', 'VACATION', 'ADVANCE']).optional(),
  status: z.enum(['PENDING_DIRECTOR', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED', 'PENDING']).optional(),
  scope: z.enum(['mine', 'team']).default('mine'),
  userId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
})

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const q = parseQuery(event, schema)
  const me = toOrgPerson(actor)

  const where: Prisma.RequestWhereInput = {}
  if (q.kind) where.kind = q.kind
  if (q.status === 'PENDING') where.status = { in: ['PENDING_DIRECTOR', 'PENDING_HR'] }
  else if (q.status) where.status = q.status

  if (q.scope === 'mine') {
    where.userId = actor.id
  }
  else {
    if (actor.role === 'EMPLOYEE') fail(403, 'forbidden')
    where.user = {
      ...teamWhere(me),
      ...(q.departmentId ? { departmentId: q.departmentId } : {}),
      ...(q.branchId ? { branchId: q.branchId } : {}),
    }
    if (q.userId) where.userId = q.userId
  }

  // Date filter on the leave date (hourly leave: date, vacation: start date, advance: request date)
  const from = q.from ? parseDateOnly(q.from) : null
  const to = q.to ? parseDateOnly(q.to) : null
  if (from || to) {
    const range = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
    const toEndOfDay = to ? new Date(to.getTime() + 86_399_999) : null
    const createdRange = { ...(from ? { gte: from } : {}), ...(toEndOfDay ? { lte: toEndOfDay } : {}) }
    where.OR = [
      { kind: 'HOURLY_LEAVE', date: range },
      { kind: 'VACATION', startDate: range },
      { kind: 'ADVANCE', createdAt: createdRange },
    ]
  }

  const rows = await prisma.request.findMany({
    where,
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
    take: q.take,
  })
  return rows.map(r => serializeRequest(r, me))
})
