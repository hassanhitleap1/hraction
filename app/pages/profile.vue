<script setup lang="ts">
// My Profile (sketch): photo · name · email · position · department · salary · hire date
// + change password + language + salary history.
const { t, locale, setLocale } = useI18n()
const { fetch: refreshSession, clear, session } = useUserSession()
const apiError = useApiError()
useHead({ title: () => t('nav.profile') })

const { data: me, refresh } = await useMe()
const { data: salaries } = await useFetch<{ month: string, baseSalary: number, advances: number, deductions: number, net: number }[]>('/api/me/salaries')

// Photo
const fileInput = ref<HTMLInputElement | null>(null)
const photoError = ref('')
const uploading = ref(false)
async function uploadPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  photoError.value = ''
  uploading.value = true
  const body = new FormData()
  body.append('photo', file)
  try {
    await $fetch('/api/me/photo', { method: 'POST', body })
    await Promise.all([refresh(), refreshSession()])
  }
  catch (e) {
    photoError.value = apiError(e)
  }
  finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// Change password
const pw = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwError = ref('')
const pwDone = ref(false)
const pwSaving = ref(false)
async function changePassword() {
  pwError.value = ''
  pwDone.value = false
  if (pw.newPassword !== pw.confirmPassword) {
    pwError.value = t('errors.passwords_do_not_match')
    return
  }
  pwSaving.value = true
  try {
    await $fetch('/api/auth/change-password', { method: 'POST', body: pw })
    Object.assign(pw, { currentPassword: '', newPassword: '', confirmPassword: '' })
    pwDone.value = true
  }
  catch (e) {
    pwError.value = apiError(e)
  }
  finally {
    pwSaving.value = false
  }
}

async function changeLanguage(next: 'ar' | 'en') {
  await setLocale(next)
  await $fetch('/api/me', { method: 'PATCH', body: { locale: next } })
  await refreshSession()
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div v-if="me" class="mx-auto max-w-lg space-y-4">
    <PageHeader :title="t('nav.profile')" back="/" />

    <!-- Photo + name -->
    <div class="card flex flex-col items-center p-6 text-center">
      <button type="button" class="group relative" :aria-label="t('profile.changePhoto')" :disabled="uploading" @click="fileInput?.click()">
        <UserAvatar :name="me.user.name" :src="me.user.photoUrl" :size="96" />
        <span class="absolute bottom-0 end-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white ring-4 ring-white group-hover:bg-brand-700">
          <AppIcon name="camera" :size="18" />
        </span>
      </button>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="uploadPhoto">
      <p v-if="uploading" class="mt-2 text-xs text-slate-500">{{ t('common.loading') }}</p>
      <AlertBox v-if="photoError" class="mt-3 w-full">{{ photoError }}</AlertBox>
      <h2 class="mt-3 text-xl font-bold text-slate-900">{{ me.user.name }}</h2>
      <p class="text-sm text-slate-500">{{ t(`roles.${me.user.role}`) }}</p>
    </div>

    <!-- Details (read-only — HR edits them) -->
    <dl class="card divide-y divide-slate-100 text-sm">
      <div class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('profile.email') }}</dt><dd class="truncate">{{ me.user.email || '—' }}</dd></div>
      <div class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('profile.phone') }}</dt><dd class="ltr-nums">{{ me.user.phone }}</dd></div>
      <div class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('profile.position') }}</dt><dd>{{ me.user.position || '—' }}</dd></div>
      <div class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('profile.department') }}</dt><dd>{{ localName(me.user.department, locale) }}</dd></div>
      <div v-if="me.user.branch" class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('profile.branch') }}</dt><dd>{{ localName(me.user.branch, locale) }}</dd></div>
      <div class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('salary.base') }}</dt><dd class="ltr-nums font-semibold">{{ formatMoney(me.user.baseSalary, locale) }}</dd></div>
      <div class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('profile.hireDate') }}</dt><dd class="ltr-nums">{{ formatDate(me.user.hireDate) }}</dd></div>
    </dl>
    <p class="px-1 text-xs text-slate-500">{{ t('profile.contactHr') }}</p>

    <!-- Salary history -->
    <div v-if="salaries?.length" class="card p-4">
      <h3 class="mb-3 font-bold text-slate-900">{{ t('profile.salaryHistory') }}</h3>
      <div class="divide-y divide-slate-100 text-sm">
        <div v-for="s in salaries" :key="s.month" class="flex items-center justify-between py-2.5">
          <span>{{ formatMonth(s.month, locale) }}</span>
          <span class="text-xs text-slate-500">
            <template v-if="s.advances">− {{ formatMoney(s.advances, locale) }} </template>
            <template v-if="s.deductions">− {{ formatMoney(s.deductions, locale) }}</template>
          </span>
          <span class="ltr-nums font-semibold text-brand-700">{{ formatMoney(s.net, locale) }}</span>
        </div>
      </div>
    </div>

    <!-- Language -->
    <div class="card p-4">
      <h3 class="mb-3 font-bold text-slate-900">{{ t('setup.language') }}</h3>
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" class="tab" :class="{ 'tab-active': locale === 'ar' }" @click="changeLanguage('ar')">العربية</button>
        <button type="button" class="tab" :class="{ 'tab-active': locale === 'en' }" @click="changeLanguage('en')">English</button>
      </div>
    </div>

    <!-- Change password -->
    <form v-if="!session?.impersonator" class="card space-y-3 p-4" @submit.prevent="changePassword">
      <h3 class="font-bold text-slate-900">{{ t('profile.changePassword') }}</h3>
      <AlertBox v-if="pwError">{{ pwError }}</AlertBox>
      <AlertBox v-if="pwDone" type="success">{{ t('profile.passwordChanged') }}</AlertBox>
      <div>
        <label class="label" for="current">{{ t('profile.currentPassword') }}</label>
        <input id="current" v-model="pw.currentPassword" type="password" class="input" autocomplete="current-password" required>
      </div>
      <div>
        <label class="label" for="new">{{ t('setup.newPassword') }}</label>
        <input id="new" v-model="pw.newPassword" type="password" class="input" autocomplete="new-password" required>
        <p class="mt-1.5 text-xs text-slate-500">{{ t('setup.passwordRules') }}</p>
      </div>
      <div>
        <label class="label" for="confirm">{{ t('setup.confirmPassword') }}</label>
        <input id="confirm" v-model="pw.confirmPassword" type="password" class="input" autocomplete="new-password" required>
      </div>
      <button type="submit" class="btn-primary w-full" :disabled="pwSaving">{{ t('common.save') }}</button>
    </form>

    <button type="button" class="btn w-full bg-rose-50 text-rose-700 hover:bg-rose-100" @click="logout">
      <AppIcon name="logout" :size="18" class="rtl:rotate-180" />{{ t('nav.logout') }}
    </button>
  </div>
</template>
