export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ])
  return {
    unread,
    items: items.map(n => ({
      id: n.id,
      type: n.type,
      data: n.data,
      link: n.link,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    })),
  }
})
