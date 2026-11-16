// What the employee can change himself: language (photo has its own endpoint).
import { z } from 'zod'

const schema = z.object({
  locale: z.enum(['ar', 'en']),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { allowSetup: true })
  const body = await parseBody(event, schema)
  const updated = await prisma.user.update({ where: { id: user.id }, data: { locale: body.locale } })
  await writeSession(event, updated)
  return { ok: true }
})
