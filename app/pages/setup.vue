<script setup lang="ts">
// First login (shown once): new password + department (+ branch for Retail) + language.
import type { LookupsResponse } from '~/composables/types'

definePageMeta({ layout: 'auth' })

const { t, locale, setLocale } = useI18n()
const { user, fetch: refreshSession } = useUserSession()
const apiError = useApiError()

useHead({ title: () => t('setup.title') })

const { data: lookups } = await useFetch<LookupsResponse>('/api/lookups')

const form = reactive({
  newPassword: '',
  confirmPassword: '',
  departmentId: null as number | null,
  branchId: null as number | null,
  locale: (locale.value === 'en' ? 'en' : 'ar') as 'ar' | 'en',
})
const error = ref('')
const loading = ref(false)

const department = computed(() => lookups.value?.departments.find(d => d.id === form.departmentId))
const needsDepartment = computed(() => user.value?.role === 'EMPLOYEE' || user.value?.role === 'DIRECTOR')
watch(() => form.departmentId, () => (form.branchId = null))
watch(() => form.locale, l => setLocale(l))

async function submit() {
  error.value = ''
  if (form.newPassword !== form.confirmPassword) {
    error.value = t('errors.passwords_do_not_match')
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/setup', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo('/')
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="card space-y-4 p-6" @submit.prevent="submit">
    <div>
      <h2 class="text-lg font-bold text-slate-900">{{ t('setup.title') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('setup.subtitle') }}</p>
    </div>

    <AlertBox v-if="error">{{ error }}</AlertBox>

    <div>
      <label class="label" for="newPassword">{{ t('setup.newPassword') }}</label>
      <input id="newPassword" v-model="form.newPassword" class="input" type="password" autocomplete="new-password" required>
      <p class="mt-1.5 text-xs text-slate-500">{{ t('setup.passwordRules') }}</p>
    </div>

    <div>
      <label class="label" for="confirmPassword">{{ t('setup.confirmPassword') }}</label>
      <input id="confirmPassword" v-model="form.confirmPassword" class="input" type="password" autocomplete="new-password" required>
    </div>

    <div>
      <label class="label" for="department">
        {{ t('setup.department') }}
        <span v-if="!needsDepartment" class="font-normal text-slate-400">({{ t('common.optional') }})</span>
      </label>
      <select id="department" v-model="form.departmentId" class="input" :required="needsDepartment">
        <option :value="null" disabled>{{ t('common.choose') }}</option>
        <option v-for="d in lookups?.departments" :key="d.id" :value="d.id">{{ localName(d, locale) }}</option>
      </select>
    </div>

    <div v-if="department?.hasBranches">
      <label class="label" for="branch">{{ t('setup.branch') }}</label>
      <select id="branch" v-model="form.branchId" class="input" required>
        <option :value="null" disabled>{{ t('common.choose') }}</option>
        <option v-for="b in department.branches" :key="b.id" :value="b.id">{{ localName(b, locale) }}</option>
      </select>
    </div>

    <div>
      <span class="label">{{ t('setup.language') }}</span>
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" class="tab" :class="{ 'tab-active': form.locale === 'ar' }" @click="form.locale = 'ar'">العربية</button>
        <button type="button" class="tab" :class="{ 'tab-active': form.locale === 'en' }" @click="form.locale = 'en'">English</button>
      </div>
    </div>

    <button type="submit" class="btn-primary w-full" :disabled="loading">
      {{ loading ? t('common.loading') : t('setup.submit') }}
    </button>
  </form>
</template>
