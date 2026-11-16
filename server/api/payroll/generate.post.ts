// HR / IT save the salaries of a month (one SalaryRecord per active employee). Can be re-run.
import { z } from 'zod'
import { isValidMonth } from '#shared/business/calc'

const schema = z.object({ month: z.string().refine(isValidMonth) })

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const { month } = await parseBody(event, schema)

  const users = await prisma.user.findMany({ where: { isActive: true } })
  for (const u of users) {
    const s = await getSalary(u, month)
    await prisma.salaryRecord.upsert({
      where: { userId_month: { userId: u.id, month } },
      update: { baseSalary: s.baseSalary, advances: s.advances, deductions: s.deductions, net: s.net },
      create: { userId: u.id, month, baseSalary: s.baseSalary, advances: s.advances, deductions: s.deductions, net: s.net },
    })
  }
  await audit(actor.id, 'payroll_generated', 'payroll', null, { month, count: users.length })
  return { month, count: users.length }
})
