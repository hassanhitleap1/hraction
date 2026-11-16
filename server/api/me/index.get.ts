// The logged-in user's profile, balances, this month's salary and unread notifications.
import { monthKey } from '#shared/business/calc'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { allowSetup: true })
  const settings = await getSettings()

  const [balances, salary, unread] = await Promise.all([
    getBalances(user, settings),
    getSalary(user, monthKey(new Date())),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ])

  return {
    user: serializeUser(user),
    balances,
    salary,
    unreadNotifications: unread,
    settings: {
      maxAdvanceInstallments: settings.maxAdvanceInstallments,
      weekendDays: settings.weekendDays,
    },
  }
})
