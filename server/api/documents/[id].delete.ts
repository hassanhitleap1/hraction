// HR / IT delete a ملحق (and its file, for older file ملحقات).
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { documentsDir } from '~~/server/utils/documents'

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const id = idParam(event)
  const doc = await prisma.employeeDocument.findUnique({ where: { id } })
  if (!doc) fail(404, 'not_found')

  await prisma.employeeDocument.delete({ where: { id } })
  if (doc.file) await unlink(join(documentsDir(), doc.file)).catch(() => {})
  await audit(actor.id, 'document_deleted', 'user', doc.userId, { documentId: id, title: doc.title })
  return { ok: true }
})
