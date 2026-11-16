<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const goHome = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
    <p class="text-6xl font-bold text-brand-600">{{ props.error.statusCode }}</p>
    <p class="text-slate-600">{{ props.error.statusCode === 404 ? t('errors.not_found') : t('errors.generic') }}</p>
    <button type="button" class="btn-primary" @click="goHome">{{ t('nav.home') }}</button>
  </div>
</template>
