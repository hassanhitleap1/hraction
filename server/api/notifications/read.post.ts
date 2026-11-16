// Mark notifications as read: { ids: [1, 2] } or {} for all.
import { z } from 'zod'

const schema = z.object({ ids: z.array(z.number().int().positive()).optional() })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { ids } = await parseBody(event, schema)
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  })
  return { ok: true }
})
