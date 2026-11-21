// Ends "log in as" and puts HR / IT back on their own account.
import { canManage } from '#shared/business/access'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (!session.impersonator) fail(400, 'not_impersonating')

  const admin = await prisma.user.findUnique({ where: { id: session.impersonator.id } })
  if (!admin || !admin.isActive || !canManage(admin.role)) {
    await clearUserSession(event)
    fail(401, 'unauthorized')
  }

  const targetId = session.user.id
  await writeSession(event, admin, null)
  await audit(admin.id, 'impersonation_stopped', 'user', targetId)
  return { ok: true, mustChangePassword: admin.mustChangePassword, locale: admin.locale }
})
