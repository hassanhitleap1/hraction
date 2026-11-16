import { z } from 'zod'
import { normalizePhone } from '#shared/business/phone'
import { verifyPassword } from '#shared/business/password'

const schema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { phone, password } = await parseBody(event, schema)

  const normalized = normalizePhone(phone)
  const user = normalized ? await prisma.user.findUnique({ where: { phone: normalized } }) : null

  // Same error for "unknown phone" and "wrong password"
  if (!user || !(await verifyPassword(password, user.passwordHash))) fail(401, 'invalid_credentials')
  if (!user.isActive) fail(403, 'account_disabled')

  await writeSession(event, user)
  return { mustChangePassword: user.mustChangePassword, locale: user.locale }
})
