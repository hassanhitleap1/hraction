import { z } from 'zod'
import { hashPassword, isStrongPassword, verifyPassword } from '#shared/business/password'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1).max(100),
  confirmPassword: z.string(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await parseBody(event, schema)

  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) fail(400, 'wrong_current_password')
  if (body.newPassword !== body.confirmPassword) fail(400, 'passwords_do_not_match')
  if (!isStrongPassword(body.newPassword)) fail(400, 'weak_password')
  if (body.newPassword === user.phone) fail(400, 'password_same_as_phone')

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  })
  await audit(user.id, 'password_changed', 'user', user.id)
  return { ok: true }
})
