// List deductions. scope=mine (default) → mine; scope=team → my team (director) / everyone (HR, IT, CEO)
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const schema = z.object({
  scope: z.enum(['mine', 'team']).default('mine'),
  status: z.enum(['PENDING_HR', 'APPLIED', 'REJECTED']).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  userId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const q = parseQuery(event, schema)
  const me = toOrgPerson(actor)

  const where: Prisma.DeductionWhereInput = {}
  if (q.status) where.status = q.status
  if (q.month) where.month = q.month

  if (q.scope === 'mine') {
    where.userId = actor.id
  }
  else {
    if (actor.role === 'EMPLOYEE') fail(403, 'forbidden')
    where.user = teamWhere(me)
    if (q.userId) where.userId = q.userId
  }

  const rows = await prisma.deduction.findMany({
    where,
    include: deductionInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map(d => serializeDeduction(d, me))
})
