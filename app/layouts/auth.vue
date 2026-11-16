<script setup lang="ts">
const { locale, setLocale } = useI18n()
const toggle = () => setLocale(locale.value === 'ar' ? 'en' : 'ar')
</script>

<template>
  <div class="relative flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-700 to-brand-900 px-4 py-10">
    <button
      type="button"
      class="absolute end-4 top-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
      @click="toggle"
    >
      <AppIcon name="globe" :size="18" />
      {{ locale === 'ar' ? 'English' : 'العربية' }}
    </button>

    <div class="mb-6 text-center text-white">
      <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">HR</div>
      <h1 class="text-2xl font-bold">{{ $t('app.name') }}</h1>
      <p class="mt-1 text-sm text-brand-100">{{ $t('app.tagline') }}</p>
    </div>

    <div class="w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
