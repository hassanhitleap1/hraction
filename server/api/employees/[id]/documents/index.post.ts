// HR / IT add a ملحق (written text: title + content) to an employee's file. The employee is notified.
import { documentSchema, serializeDocument } from '~~/server/utils/documents'

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const id = idParam(event)
  const owner = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!owner) fail(404, 'not_found')

  const input = await parseBody(event, documentSchema)
  const doc = await prisma.employeeDocument.create({
    data: { userId: id, title: input.title, body: input.body, uploadedById: actor.id },
    include: { uploadedBy: { select: { name: true } } },
  })

  if (id !== actor.id) await notify([id], 'document_added', { id: doc.id, title: doc.title, by: actor.name }, `/documents#d${doc.id}`)
  await audit(actor.id, 'document_added', 'user', id, { documentId: doc.id, title: doc.title })
  return serializeDocument(doc)
})
