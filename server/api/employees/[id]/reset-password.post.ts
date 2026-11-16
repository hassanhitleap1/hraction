// HR / IT reset an employee's password back to his phone number (he must change it at next login).
import { hashPassword } from '#shared/business/password'

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const id = idParam(event)
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) fail(404, 'not_found')

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(user.phone), mustChangePassword: true },
  })
  await audit(actor.id, 'password_reset', 'user', id)
  return { ok: true }
})
