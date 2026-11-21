// An employee's ملحقات. Visible only to the employee himself and HR / IT.
import { canSeeDocumentsOf, serializeDocument } from '~~/server/utils/documents'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const id = idParam(event)
  if (!canSeeDocumentsOf(actor, id)) fail(403, 'forbidden')

  const docs = await prisma.employeeDocument.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: { select: { name: true } } },
  })
  return docs.map(serializeDocument)
})
