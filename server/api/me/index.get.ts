// The logged-in user's profile, balances, this month's salary and unread notifications.
import { effectiveWeekendDays, monthKey } from '#shared/business/calc'

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
      // The days off that apply to him (used to count vacation days live in the form)
      weekendDays: effectiveWeekendDays(user.weekendDays, settings.weekendDays),
    },
  }
})
