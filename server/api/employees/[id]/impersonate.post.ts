// HR / IT log in as another user ("log in as") to see the portal exactly as he does.
// The real account is kept in the session so they can switch back (POST /api/auth/stop-impersonating).
import { canManage } from '#shared/business/access'

export default defineEventHandler(async (event) => {
  await forbidWhileImpersonating(event) // no chains: switch back first
  const actor = await requireManager(event)
  const id = idParam(event)
  if (id === actor.id) fail(400, 'cannot_impersonate_self')

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) fail(404, 'not_found')
  if (!target.isActive) fail(400, 'account_disabled')
  // HR / IT accounts can't be impersonated (no privilege games between admins)
  if (canManage(target.role)) fail(403, 'cannot_impersonate_admin')

  await writeSession(event, target, actor)
  await audit(actor.id, 'impersonation_started', 'user', target.id)
  return { ok: true }
})
