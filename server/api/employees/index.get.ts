// Employees list — director: his team; HR / IT / CEO: everyone.
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const schema = z.object({
  search: z.string().trim().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  role: z.enum(['EMPLOYEE', 'DIRECTOR', 'HR', 'IT', 'CEO']).optional(),
  active: z.enum(['true', 'false', 'all']).default('true'),
})

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  if (actor.role === 'EMPLOYEE') fail(403, 'forbidden')
  const q = parseQuery(event, schema)

  const filters: Prisma.UserWhereInput[] = [teamWhere(toOrgPerson(actor))]
  if (q.departmentId) filters.push({ departmentId: q.departmentId })
  if (q.branchId) filters.push({ branchId: q.branchId })
  if (q.role) filters.push({ role: q.role })
  if (q.active !== 'all') filters.push({ isActive: q.active === 'true' })
  if (q.search) {
    filters.push({
      OR: [
        { name: { contains: q.search } },
        { phone: { contains: q.search } },
        { position: { contains: q.search } },
      ],
    })
  }

  const users = await prisma.user.findMany({
    where: { AND: filters },
    include: { department: true, branch: true },
    orderBy: { name: 'asc' },
    take: 500,
  })
  return users.map(serializeUser)
})
