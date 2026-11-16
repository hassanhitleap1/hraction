// HR / IT apply or reject a deduction recorded by a director.
import { z } from 'zod'
import { canReviewDeduction } from '#shared/business/access'

const schema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(1000).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const id = idParam(event)
  const { decision, comment } = await parseBody(event, schema)

  const deduction = await prisma.deduction.findUnique({ where: { id }, include: deductionInclude })
  if (!deduction) fail(404, 'not_found')

  const me = toOrgPerson(actor)
  if (!canReviewDeduction(me, deduction.userId, deduction.status)) fail(403, 'forbidden')

  const status = decision === 'approve' ? 'APPLIED' : 'REJECTED'
  const { count } = await prisma.deduction.updateMany({
    where: { id, status: 'PENDING_HR' },
    data: { status, reviewedById: actor.id, reviewedAt: new Date(), reviewComment: comment || null },
  })
  if (count !== 1) fail(409, 'already_decided')

  const payload = {
    deductionId: id,
    amount: Number(deduction.amount),
    month: deduction.month,
    name: deduction.user.name,
    by: actor.name,
    comment: comment || null,
  }
  if (status === 'APPLIED') {
    await notify([deduction.userId], 'deduction_applied', payload, '/deductions')
  }
  else {
    await notify([deduction.createdById], 'deduction_rejected', payload, '/deductions?scope=team')
  }
  await audit(actor.id, `deduction_${status.toLowerCase()}`, 'deduction', id, { comment: comment || null })

  const updated = await prisma.deduction.findUniqueOrThrow({ where: { id }, include: deductionInclude })
  return serializeDeduction(updated, me)
})
