// Marks announcements as read (they leave the home page) and their notifications as read too.
import { visibleAnnouncementsWhere } from '~~/server/utils/announcements'
import { z } from 'zod'

const schema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { ids } = await parseBody(event, schema)

  // Only announcements this user is allowed to see
  const visible = await prisma.announcement.findMany({
    where: { AND: [{ id: { in: ids } }, visibleAnnouncementsWhere(user)] },
    select: { id: true },
  })
  const visibleIds = visible.map(a => a.id)
  if (!visibleIds.length) return { ok: true }

  await prisma.announcementRead.createMany({
    data: visibleIds.map(announcementId => ({ announcementId, userId: user.id })),
    skipDuplicates: true,
  })
  const now = new Date()
  await Promise.all(visibleIds.map(id => prisma.notification.updateMany({
    where: { userId: user.id, type: 'announcement', readAt: null, data: { path: '$.id', equals: id } },
    data: { readAt: now },
  })))
  return { ok: true }
})
