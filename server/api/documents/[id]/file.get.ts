// Opens an older ملحق that was uploaded as a file — only for its owner and HR / IT.
// PDFs and images open in the browser; Word / Excel are downloaded.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { detectDocumentType } from '#shared/business/files'
import { canSeeDocumentsOf, documentsDir } from '~~/server/utils/documents'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const doc = await prisma.employeeDocument.findUnique({ where: { id: idParam(event) } })
  // Same answer for "doesn't exist" and "not yours", so ids can't be probed
  if (!doc?.file || !canSeeDocumentsOf(actor, doc.userId)) fail(404, 'not_found')

  let data: Buffer
  try {
    data = await readFile(join(documentsDir(), doc.file))
  }
  catch {
    fail(404, 'not_found')
  }

  const fileName = doc.fileName ?? 'file'
  const inline = detectDocumentType(data, fileName)?.inline ?? false
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')
  setHeader(event, 'Content-Type', doc.mimeType ?? 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'private, no-store')
  return data
})
