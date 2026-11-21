// Opens an announcement's PDF — only for users who may see that announcement.
// Shown inline in the browser (the employee can still download it from the PDF viewer).
import { visibleAnnouncementsWhere, announcementsDir } from '~~/server/utils/announcements'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = idParam(event)
  const a = await prisma.announcement.findFirst({ where: { id, ...visibleAnnouncementsWhere(user) } })
  if (!a?.attachmentFile) fail(404, 'not_found')

  let data: Buffer
  try {
    data = await readFile(join(announcementsDir(), a.attachmentFile))
  }
  catch {
    fail(404, 'not_found')
  }

  const name = a.attachmentName ?? 'document.pdf'
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return data
})
