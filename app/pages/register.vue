<script setup lang="ts">
// Public self-registration. The account stays inactive until HR activates it.
import type { LookupsResponse } from '~/composables/types'

definePageMeta({ layout: 'auth' })

const { t, locale } = useI18n()
const apiError = useApiError()

useHead({ title: () => t('register.title') })

const { data: options } = await useFetch<Pick<LookupsResponse, 'departments'>>('/api/auth/register-options')

const form = reactive({
  name: '',
  phone: '',
  password: '',
  confirmPassword: '',
  departmentId: null as number | null,
  branchId: null as number | null,
})
const error = ref('')
const loading = ref(false)
const done = ref(false)

const department = computed(() => options.value?.departments.find(d => d.id === form.departmentId))
watch(() => form.departmentId, () => (form.branchId = null))

async function submit() {
  error.value = ''
  if (form.password !== form.confirmPassword) {
    error.value = t('errors.passwords_do_not_match')
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { ...form, locale: locale.value === 'en' ? 'en' : 'ar' },
    })
    done.value = true
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
  <div v-if="done" class="card space-y-4 p-6 text-center">
    <h2 class="text-lg font-bold text-slate-900">{{ t('register.doneTitle') }}</h2>
    <p class="text-sm text-slate-600">{{ t('register.doneText') }}</p>
    <NuxtLink to="/login" class="btn-primary w-full">{{ t('register.loginLink') }}</NuxtLink>
  </div>

  <form v-else class="card space-y-4 p-6" @submit.prevent="submit">
    <div>
      <h2 class="text-lg font-bold text-slate-900">{{ t('register.title') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('register.subtitle') }}</p>
    </div>

    <AlertBox v-if="error">{{ error }}</AlertBox>

    <div>
      <label class="label" for="name">{{ t('register.name') }}</label>
      <input id="name" v-model="form.name" class="input" type="text" autocomplete="name" minlength="2" maxlength="150" required>
    </div>

    <div>
      <label class="label" for="phone">{{ t('register.phone') }}</label>
      <input
        id="phone"
        v-model="form.phone"
        class="input text-start"
        type="tel"
        inputmode="tel"
        autocomplete="username"
        dir="ltr"
        placeholder="07XXXXXXXX"
        required
      >
    </div>

    <div>
      <label class="label" for="department">{{ t('register.department') }}</label>
      <select id="department" v-model="form.departmentId" class="input" required>
        <option :value="null" disabled>{{ t('common.choose') }}</option>
        <option v-for="d in options?.departments" :key="d.id" :value="d.id">{{ localName(d, locale) }}</option>
      </select>
    </div>

    <div v-if="department?.hasBranches">
      <label class="label" for="branch">{{ t('register.branch') }}</label>
      <select id="branch" v-model="form.branchId" class="input" required>
        <option :value="null" disabled>{{ t('common.choose') }}</option>
        <option v-for="b in department.branches" :key="b.id" :value="b.id">{{ localName(b, locale) }}</option>
      </select>
    </div>

    <div>
      <label class="label" for="password">{{ t('register.password') }}</label>
      <input id="password" v-model="form.password" class="input" type="password" autocomplete="new-password" required>
      <p class="mt-1.5 text-xs text-slate-500">{{ t('register.passwordRules') }}</p>
    </div>

    <div>
      <label class="label" for="confirmPassword">{{ t('register.confirmPassword') }}</label>
      <input id="confirmPassword" v-model="form.confirmPassword" class="input" type="password" autocomplete="new-password" required>
    </div>

    <button type="submit" class="btn-primary w-full" :disabled="loading">
      {{ loading ? t('common.loading') : t('register.submit') }}
    </button>

    <p class="text-center text-sm text-slate-500">
      {{ t('register.haveAccount') }}
      <NuxtLink to="/login" class="font-semibold text-brand-600">{{ t('register.loginLink') }}</NuxtLink>
    </p>
  </form>
</template>
