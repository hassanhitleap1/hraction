// The employee cancels his own request while it is still pending.
import { canCancel } from '#shared/business/access'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const id = idParam(event)
  const request = await prisma.request.findUnique({ where: { id } })
  if (!request) fail(404, 'not_found')

  const me = toOrgPerson(actor)
  if (!canCancel(me, request.userId, request.status)) fail(403, 'forbidden')

  const { count } = await prisma.request.updateMany({
    where: { id, status: request.status },
    data: { status: 'CANCELLED' },
  })
  if (count !== 1) fail(409, 'already_decided')

  await audit(actor.id, 'request_cancelled', 'request', id)
  const updated = await prisma.request.findUniqueOrThrow({ where: { id }, include: requestInclude })
  return serializeRequest(updated, me)
})
