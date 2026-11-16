// Salaries of a month — director: his team; HR / IT / CEO: everyone.
// Shows the live calculation and whether HR already generated (saved) the month.
import { z } from 'zod'
import { computeSalary, isValidMonth, monthKey } from '#shared/business/calc'

const schema = z.object({
  month: z.string().refine(isValidMonth).optional(),
  departmentId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  if (actor.role === 'EMPLOYEE') fail(403, 'forbidden')
  const q = parseQuery(event, schema)
  const month = q.month ?? monthKey(new Date())

  const users = await prisma.user.findMany({
    where: {
      AND: [teamWhere(toOrgPerson(actor)), { isActive: true }, q.departmentId ? { departmentId: q.departmentId } : {}],
    },
    include: { department: true, branch: true },
    orderBy: { name: 'asc' },
  })
  const ids = users.map(u => u.id)

  const [installments, deductions, records] = await Promise.all([
    prisma.advanceInstallment.groupBy({ by: ['userId'], where: { month, userId: { in: ids } }, _sum: { amount: true } }),
    prisma.deduction.groupBy({ by: ['userId'], where: { month, status: 'APPLIED', userId: { in: ids } }, _sum: { amount: true } }),
    prisma.salaryRecord.findMany({ where: { month, userId: { in: ids } } }),
  ])
  const sumFor = (rows: { userId: number, _sum: { amount: unknown } }[], id: number) =>
    Number(rows.find(r => r.userId === id)?._sum.amount ?? 0)

  const rows = users.map((u) => {
    const salary = computeSalary(Number(u.baseSalary), [sumFor(installments, u.id)], [sumFor(deductions, u.id)])
    return { user: userSummary(u), ...salary, saved: records.some(r => r.userId === u.id) }
  })

  return {
    month,
    rows,
    totals: computeSalary(
      rows.reduce((a, r) => a + r.baseSalary, 0),
      rows.map(r => r.advances),
      rows.map(r => r.deductions),
    ),
  }
})
