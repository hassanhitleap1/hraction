// Record a deduction (خصم). Directors → for their team, sent to HR for review. HR / IT → applied immediately.
import { z } from 'zod'
import { canRecordDeductionFor, initialDeductionStatus } from '#shared/business/access'
import { isValidMonth } from '#shared/business/calc'

const schema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().positive().max(1_000_000),
  month: z.string().refine(isValidMonth),
  reason: z.string().trim().min(1).max(1000),
})

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const body = await parseBody(event, schema)

  const employee = await prisma.user.findUnique({ where: { id: body.userId } })
  if (!employee || !employee.isActive) fail(404, 'employee_not_found')
  if (!canRecordDeductionFor(toOrgPerson(actor), toOrgPerson(employee))) fail(403, 'forbidden')

  const status = initialDeductionStatus(actor.role)
  const deduction = await prisma.deduction.create({
    data: {
      userId: employee.id,
      createdById: actor.id,
      amount: body.amount,
      month: body.month,
      reason: body.reason,
      status,
      ...(status === 'APPLIED' ? { reviewedById: actor.id, reviewedAt: new Date() } : {}),
    },
    include: deductionInclude,
  })

  const payload = { deductionId: deduction.id, amount: body.amount, month: body.month, name: employee.name, by: actor.name }
  if (status === 'APPLIED') {
    await notify([employee.id], 'deduction_applied', payload, '/deductions')
  }
  else {
    await notify(await hrUserIds(employee.id), 'deduction_pending', payload, '/approvals')
  }
  await audit(actor.id, 'deduction_created', 'deduction', deduction.id, { userId: employee.id, amount: body.amount, status })

  return serializeDeduction(deduction, toOrgPerson(actor))
})
