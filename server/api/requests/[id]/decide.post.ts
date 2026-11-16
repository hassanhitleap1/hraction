// Approve / reject a request.
//  Director: approve → waits for HR, reject → final.   HR / IT: final decision.
import { z } from 'zod'
import { decideRequest } from '#shared/business/access'
import { addMonths, installmentPlan, monthKey } from '#shared/business/calc'

const schema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(1000).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const id = idParam(event)
  const { decision, comment } = await parseBody(event, schema)

  const request = await prisma.request.findUnique({ where: { id }, include: requestInclude })
  if (!request) fail(404, 'not_found')

  const me = toOrgPerson(actor)
  const result = decideRequest({ actor: me, requester: toOrgPerson(request.user), status: request.status, decision })
  if (!result.ok) fail(403, result.error)

  const now = new Date()
  const decisionWord = decision === 'approve' ? 'approved' : 'rejected'
  const stageData = result.stage === 'director'
    ? { directorId: actor.id, directorDecision: decisionWord, directorComment: comment || null, directorDecidedAt: now }
    : { hrId: actor.id, hrDecision: decisionWord, hrComment: comment || null, hrDecidedAt: now }

  await prisma.$transaction(async (tx) => {
    // Guard against two people deciding at the same moment
    const { count } = await tx.request.updateMany({
      where: { id, status: request.status },
      data: { ...stageData, status: result.status },
    })
    if (count !== 1) fail(409, 'already_decided')

    // Approved advance → monthly installments starting next month
    if (request.kind === 'ADVANCE' && result.status === 'APPROVED' && request.amount) {
      const plan = installmentPlan(Number(request.amount), request.installments ?? 1, addMonths(monthKey(now), 1))
      await tx.advanceInstallment.createMany({
        data: plan.map(p => ({ requestId: id, userId: request.userId, month: p.month, amount: p.amount })),
      })
    }
  })

  // Notifications
  const payload = { requestId: id, kind: request.kind, by: actor.name, name: request.user.name, comment: comment || null }
  const link = `/request/${id}`
  if (result.status === 'PENDING_HR') {
    await notify([request.userId], 'request_director_approved', payload, link)
    await notify(await hrUserIds(request.userId), 'request_awaiting_hr', payload, link)
  }
  else if (result.status === 'APPROVED') {
    await notify([request.userId], 'request_approved', payload, link)
  }
  else if (result.status === 'REJECTED') {
    await notify([request.userId], 'request_rejected', payload, link)
  }

  await audit(actor.id, `request_${decisionWord}`, 'request', id, { stage: result.stage, status: result.status, comment: comment || null })

  const updated = await prisma.request.findUniqueOrThrow({ where: { id }, include: requestInclude })
  return serializeRequest(updated, me)
})
