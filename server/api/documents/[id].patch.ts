// HR / IT edit a ملحق (title + text).
import { documentSchema, serializeDocument } from '~~/server/utils/documents'

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const id = idParam(event)
  const existing = await prisma.employeeDocument.findUnique({ where: { id } })
  if (!existing) fail(404, 'not_found')

  const input = await parseBody(event, documentSchema)
  const doc = await prisma.employeeDocument.update({
    where: { id },
    data: { title: input.title, body: input.body },
    include: { uploadedBy: { select: { name: true } } },
  })
  await audit(actor.id, 'document_updated', 'user', existing.userId, { documentId: id, title: doc.title })
  return serializeDocument(doc)
})
