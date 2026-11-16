import { canViewPerson } from '#shared/business/access'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const id = idParam(event)
  const request = await prisma.request.findUnique({ where: { id }, include: requestInclude })
  if (!request) fail(404, 'not_found')

  const me = toOrgPerson(actor)
  if (!canViewPerson(me, toOrgPerson(request.user))) fail(403, 'forbidden')
  return serializeRequest(request, me)
})
