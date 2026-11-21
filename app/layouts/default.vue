<script setup lang="ts">
const { t, locale, setLocale } = useI18n()
const { user, session, clear, fetch: refreshSession } = useUserSession()
const perms = usePermissions()
const route = useRoute()

const menuOpen = ref(false)
watch(() => route.fullPath, () => (menuOpen.value = false))

// Unread notifications badge (refreshed every minute and on every navigation)
const { data: unread, refresh: refreshUnread } = useFetch<{ unread: number }>('/api/notifications/unread-count', {
  key: 'unread',
})
watch(() => route.fullPath, () => refreshUnread())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => (timer = setInterval(() => refreshUnread(), 60_000)))
onBeforeUnmount(() => clearInterval(timer))

const nav = computed(() => [
  { to: '/', icon: 'home', label: t('nav.home'), show: true },
  { to: '/announcements', icon: 'megaphone', label: t('nav.announcements'), show: true },
  { to: '/requests/hourly-leave', icon: 'leave', label: t('kinds.HOURLY_LEAVE_plural'), show: true },
  { to: '/requests/vacation', icon: 'vacation', label: t('kinds.VACATION_plural'), show: true },
  { to: '/requests/advance', icon: 'advance', label: t('kinds.ADVANCE_plural'), show: true },
  { to: '/deductions', icon: 'deduction', label: t('nav.deductions'), show: true },
  { to: '/approvals', icon: 'inbox', label: t('nav.approvals'), show: perms.isApprover.value },
  { to: '/employees', icon: 'users', label: t('nav.employees'), show: perms.hasTeam.value },
  { to: '/admin/payroll', icon: 'money', label: t('nav.payroll'), show: perms.hasTeam.value },
  { to: '/admin/import', icon: 'upload', label: t('nav.import'), show: perms.canManage.value },
  { to: '/admin/settings', icon: 'settings', label: t('nav.settings'), show: perms.canViewAll.value },
  { to: '/documents', icon: 'paperclip', label: t('nav.documents'), show: true },
  { to: '/profile', icon: 'user', label: t('nav.profile'), show: true },
].filter(i => i.show))

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

async function switchLanguage() {
  const next = locale.value === 'ar' ? 'en' : 'ar'
  await setLocale(next)
  await $fetch('/api/me', { method: 'PATCH', body: { locale: next } }).catch(() => {})
  await refreshSession()
}

// "Log in as": HR / IT go back to their own account
const impersonator = computed(() => session.value?.impersonator)
const stopping = ref(false)
async function stopImpersonating() {
  stopping.value = true
  try {
    await $fetch('/api/auth/stop-impersonating', { method: 'POST' })
    window.location.href = '/employees'
  }
  catch {
    stopping.value = false
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh pb-[env(safe-area-inset-bottom)]">
    <!-- "Log in as" banner -->
    <div v-if="impersonator" class="fixed inset-x-0 bottom-0 z-40 bg-amber-400 pb-[env(safe-area-inset-bottom)] text-amber-950 shadow-[0_-4px_12px_rgba(0,0,0,.12)]">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <AppIcon name="user" :size="18" />
        <p class="flex-1 font-medium">{{ t('impersonate.banner', { name: user?.name, admin: impersonator.name }) }}</p>
        <button type="button" class="rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-60" :disabled="stopping" @click="stopImpersonating">
          {{ t('impersonate.stop') }}
        </button>
      </div>
    </div>

    <!-- Top bar -->
    <header class="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
          :aria-label="t('nav.menu')"
          @click="menuOpen = true"
        >
          <AppIcon name="menu" />
        </button>

        <NuxtLink to="/" class="flex-1 truncate text-lg font-bold text-brand-700">{{ t('app.name') }}</NuxtLink>

        <NuxtLink
          to="/notifications"
          class="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
          :aria-label="t('nav.notifications')"
        >
          <AppIcon name="bell" />
          <span
            v-if="unread?.unread"
            class="absolute end-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white"
          >{{ unread.unread > 99 ? '99+' : unread.unread }}</span>
        </NuxtLink>

        <NuxtLink to="/profile" :aria-label="t('nav.profile')" class="ms-1">
          <UserAvatar :name="user?.name" :src="user?.photoUrl" :size="38" />
        </NuxtLink>
      </div>
    </header>

    <!-- Side menu -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="menuOpen" class="fixed inset-0 z-40 bg-slate-900/40" @click="menuOpen = false" />
    </Transition>
    <aside
      class="fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200"
      :class="menuOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'"
      :aria-hidden="!menuOpen"
    >
      <div class="flex items-center gap-3 border-b border-slate-100 p-4">
        <UserAvatar :name="user?.name" :src="user?.photoUrl" :size="44" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-slate-900">{{ user?.name }}</p>
          <p class="text-xs text-slate-500">{{ t(`roles.${user?.role}`) }}</p>
        </div>
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" :aria-label="t('common.close')" @click="menuOpen = false">
          <AppIcon name="close" />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto p-3">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
          :class="isActive(item.to) ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'"
        >
          <AppIcon :name="item.icon" :size="20" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="space-y-1 border-t border-slate-100 p-3">
        <button type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="switchLanguage">
          <AppIcon name="globe" :size="20" />
          {{ locale === 'ar' ? 'English' : 'العربية' }}
        </button>
        <button type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50" @click="logout">
          <AppIcon name="logout" :size="20" class="rtl:rotate-180" />
          {{ t('nav.logout') }}
        </button>
      </div>
    </aside>

    <main class="mx-auto max-w-5xl px-4 py-5" :class="{ 'pb-24': impersonator }">
      <slot />
    </main>
  </div>
</template>
