// HR / IT delete an announcement (and the notifications it sent, and its PDF).
import { announcementsDir } from '~~/server/utils/announcements'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const id = idParam(event)
  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) fail(404, 'not_found')

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { type: 'announcement', data: { path: '$.id', equals: id } } }),
    prisma.announcement.delete({ where: { id } }),
  ])
  if (existing.attachmentFile) await unlink(join(announcementsDir(), existing.attachmentFile)).catch(() => {})
  await audit(actor.id, 'announcement_deleted', 'announcement', id, { title: existing.title })
  return { ok: true }
})
