<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t, setLocale } = useI18n()
const { fetch: refreshSession } = useUserSession()
const apiError = useApiError()

const form = reactive({ phone: '', password: '' })
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

useHead({ title: () => t('login.title') })

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ mustChangePassword: boolean, locale: string }>('/api/auth/login', {
      method: 'POST',
      body: form,
    })
    await refreshSession()
    if (res.locale === 'ar' || res.locale === 'en') await setLocale(res.locale)
    await navigateTo(res.mustChangePassword ? '/setup' : '/')
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
    <h2 class="text-lg font-bold text-slate-900">{{ t('login.title') }}</h2>

    <AlertBox v-if="error">{{ error }}</AlertBox>

    <div>
      <label class="label" for="phone">{{ t('login.phone') }}</label>
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
      <label class="label" for="password">{{ t('login.password') }}</label>
      <div class="relative">
        <input
          id="password"
          v-model="form.password"
          class="input pe-16"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          required
        >
        <button
          type="button"
          class="absolute inset-y-0 end-0 px-3 text-xs font-semibold text-brand-600"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? t('login.hide') : t('login.show') }}
        </button>
      </div>
      <p class="mt-1.5 text-xs text-slate-500">{{ t('login.firstTimeHint') }}</p>
    </div>

    <button type="submit" class="btn-primary w-full" :disabled="loading">
      {{ loading ? t('common.loading') : t('login.submit') }}
    </button>

    <p class="text-center text-sm text-slate-500">
      {{ t('login.noAccount') }}
      <NuxtLink to="/register" class="font-semibold text-brand-600">{{ t('login.registerLink') }}</NuxtLink>
    </p>
  </form>
</template>
