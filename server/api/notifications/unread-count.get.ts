export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { unread: await prisma.notification.count({ where: { userId: user.id, readAt: null } }) }
})
