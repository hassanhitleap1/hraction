<script setup lang="ts">
const { locale, setLocale } = useI18n()
const toggle = () => setLocale(locale.value === 'ar' ? 'en' : 'ar')
</script>

<template>
  <div class="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0b1118] px-4 py-10">
    <!-- Ambient brand glows (same look as the welcome page) -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <div class="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#5e7387]/30 blur-3xl" />
      <div class="absolute -bottom-32 -start-32 h-72 w-72 rounded-full bg-[#cf1f2f]/15 blur-3xl" />
      <div class="absolute -bottom-32 -end-32 h-72 w-72 rounded-full bg-[#2ba3dc]/15 blur-3xl" />
    </div>

    <NuxtLink
      to="/welcome"
      class="absolute start-4 top-4 z-10 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20"
    >
      <AppIcon name="back" :size="18" class="rtl:rotate-180" />
      {{ $t('common.back') }}
    </NuxtLink>
    <button
      type="button"
      class="absolute end-4 top-4 z-10 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20"
      @click="toggle"
    >
      <AppIcon name="globe" :size="18" />
      {{ locale === 'ar' ? 'English' : 'العربية' }}
    </button>

    <div class="relative mb-6 text-center text-white">
      <NuxtLink to="/welcome" class="mx-auto block w-48">
        <BrandLogo name="group" alt="Action Group" />
      </NuxtLink>
      <h1 class="mt-2 text-xl font-bold">{{ $t('app.name') }}</h1>
      <p class="mt-1 text-sm text-slate-400">{{ $t('app.tagline') }}</p>
    </div>

    <div class="relative w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
