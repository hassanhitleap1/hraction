// One employee: profile, balances and this month's salary (director: his team only).
import { canViewPerson } from '#shared/business/access'
import { monthKey } from '#shared/business/calc'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const id = idParam(event)
  const user = await prisma.user.findUnique({ where: { id }, include: { department: true, branch: true } })
  if (!user) fail(404, 'not_found')
  if (!canViewPerson(toOrgPerson(actor), toOrgPerson(user))) fail(403, 'forbidden')

  const settings = await getSettings()
  const [balances, salary] = await Promise.all([
    getBalances(user, settings),
    getSalary(user, monthKey(new Date())),
  ])
  return { user: serializeUser(user), balances, salary }
})
