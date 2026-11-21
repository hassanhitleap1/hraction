// Every page needs a logged-in user, except the public pages below.
// Visitors who aren't logged in land on the Action Group welcome page first.
// Users who haven't changed their default password are kept on /setup.
// Pages can restrict roles with: definePageMeta({ roles: ['HR', 'IT', 'CEO'] })
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  // The landing page is open to everyone (logged in or not)
  if (to.path === '/welcome') return

  if (to.path === '/login' || to.path === '/register') {
    if (loggedIn.value) return navigateTo(user.value?.mustChangePassword ? '/setup' : '/')
    return
  }

  if (!loggedIn.value || !user.value) return navigateTo('/welcome')

  if (user.value.mustChangePassword && to.path !== '/setup') return navigateTo('/setup')
  if (!user.value.mustChangePassword && to.path === '/setup') return navigateTo('/')

  const roles = to.meta.roles
  if (roles && !roles.includes(user.value.role)) return navigateTo('/')
})
