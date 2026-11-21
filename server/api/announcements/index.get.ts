// Announcements (تعاميم) the user can see: the ones for everyone + the ones for his department.
// HR / IT see all of them.
//   ?unread=1&limit=3 → the home page (only what he hasn't read yet)
// Always returns `unread`: how many visible announcements he hasn't read (for the home tile).
import { visibleAnnouncementsWhere } from '~~/server/utils/announcements'
import { z } from 'zod'

const query = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unread: z.enum(['0', '1']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { limit, unread: onlyUnread } = parseQuery(event, query)

  const visible = visibleAnnouncementsWhere(user)
  const notReadByMe = { reads: { none: { userId: user.id } } }

  const [items, unread] = await Promise.all([
    prisma.announcement.findMany({
      where: onlyUnread === '1' ? { AND: [visible, notReadByMe] } : visible,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, name: true, photoUrl: true } },
        department: true,
        reads: { where: { userId: user.id }, select: { userId: true } },
      },
    }),
    prisma.announcement.count({ where: { AND: [visible, notReadByMe] } }),
  ])

  return {
    unread,
    items: items.map(a => ({
      id: a.id,
      title: a.title,
      body: a.body,
      createdAt: a.createdAt.toISOString(),
      read: a.reads.length > 0,
      author: a.author,
      department: a.department ? { id: a.department.id, nameAr: a.department.nameAr, nameEn: a.department.nameEn } : null,
      attachment: a.attachmentFile ? { name: a.attachmentName ?? 'document.pdf', url: `/api/announcements/${a.id}/file` } : null,
    })),
  }
})
