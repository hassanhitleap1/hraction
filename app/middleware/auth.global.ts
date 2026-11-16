// Every page needs a logged-in user, except /login.
// Users who haven't changed their default password are kept on /setup.
// Pages can restrict roles with: definePageMeta({ roles: ['HR', 'IT'] })
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (to.path === '/login') {
    if (loggedIn.value) return navigateTo(user.value?.mustChangePassword ? '/setup' : '/')
    return
  }

  if (!loggedIn.value || !user.value) return navigateTo('/login')

  if (user.value.mustChangePassword && to.path !== '/setup') return navigateTo('/setup')
  if (!user.value.mustChangePassword && to.path === '/setup') return navigateTo('/')

  const roles = to.meta.roles
  if (roles && !roles.includes(user.value.role)) return navigateTo('/')
})
