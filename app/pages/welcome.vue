<script setup lang="ts">
// Public landing page for Action Group: brand logos, what the portal does,
// and a call to action that leads to login / sign up.

definePageMeta({ layout: false })

const { t, locale, setLocale } = useI18n()
const { loggedIn } = useUserSession()
const toggleLocale = () => setLocale(locale.value === 'ar' ? 'en' : 'ar')

useHead({ title: () => t('welcome.title') })

const companies = [
  { name: 'express', label: 'Action Express', color: '#cf1f2f' },
  { name: 'media', label: 'Action Media', color: '#f7981f' },
  { name: 'mobile', label: 'Action Mobile', color: '#2ba3dc' },
  { name: 'website', label: 'Action Website', color: '#853577' },
] as const

const features = computed(() => [
  { icon: 'leave', title: t('kinds.HOURLY_LEAVE'), text: t('welcome.features.leave') },
  { icon: 'vacation', title: t('kinds.VACATION'), text: t('welcome.features.vacation') },
  { icon: 'advance', title: t('kinds.ADVANCE'), text: t('welcome.features.advance') },
  { icon: 'money', title: t('welcome.features.salaryTitle'), text: t('welcome.features.salary') },
])

const year = new Date().getFullYear()
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden bg-[#0b1118] text-white">
    <!-- Ambient brand glows -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <div class="absolute -top-40 start-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#5e7387]/30 blur-3xl rtl:translate-x-1/2" />
      <div class="absolute top-[28rem] -start-40 h-80 w-80 rounded-full bg-[#cf1f2f]/20 blur-3xl" />
      <div class="absolute top-[34rem] -end-40 h-80 w-80 rounded-full bg-[#2ba3dc]/20 blur-3xl" />
      <div class="absolute bottom-0 start-1/3 h-72 w-72 rounded-full bg-[#853577]/20 blur-3xl" />
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
    </div>

    <!-- Top bar -->
    <header class="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <div class="w-28 sm:w-32">
        <BrandLogo name="group" alt="Action Group" />
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/20"
          @click="toggleLocale"
        >
          <AppIcon name="globe" :size="18" />
          {{ locale === 'ar' ? 'English' : 'العربية' }}
        </button>
        <NuxtLink
          :to="loggedIn ? '/' : '/login'"
          class="hidden min-h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:inline-flex"
        >
          {{ loggedIn ? t('welcome.openPortal') : t('login.title') }}
        </NuxtLink>
      </div>
    </header>

    <main class="relative z-10">
      <!-- Hero -->
      <section class="mx-auto max-w-4xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-16">
        <div class="mx-auto w-64 animate-[fadeUp_.7s_ease-out_both] sm:w-96">
          <BrandLogo name="group" alt="Action Group" />
        </div>
        <span class="mt-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-white/10">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {{ t('welcome.badge') }}
        </span>
        <h1 class="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
          {{ t('welcome.headline') }}
        </h1>
        <p class="mx-auto mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
          {{ t('app.tagline') }}
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink
            :to="loggedIn ? '/' : '/login'"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-slate-900 shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            {{ loggedIn ? t('welcome.openPortal') : t('login.title') }}
            <AppIcon name="forward" :size="18" class="rtl:rotate-180" />
          </NuxtLink>
          <NuxtLink
            v-if="!loggedIn"
            to="/register"
            class="inline-flex min-h-12 items-center justify-center rounded-xl bg-white/5 px-6 text-base font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/10"
          >
            {{ t('register.title') }}
          </NuxtLink>
        </div>
      </section>

      <!-- Group companies -->
      <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div class="mb-8 text-center">
          <h2 class="text-2xl font-bold sm:text-3xl">{{ t('welcome.companiesTitle') }}</h2>
          <p class="mt-2 text-slate-400">{{ t('welcome.companiesSubtitle') }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <div
            v-for="c in companies"
            :key="c.name"
            class="group relative overflow-hidden rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/[.07] sm:p-6"
          >
            <div class="absolute inset-x-0 top-0 h-1" :style="{ background: c.color }" />
            <div
              class="absolute -bottom-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-0 blur-2xl transition duration-300 group-hover:opacity-40"
              :style="{ background: c.color }"
            />
            <div class="relative mx-auto w-full max-w-48">
              <BrandLogo :name="c.name" :alt="c.label" />
            </div>
            <p class="relative mt-2 text-center text-xs font-semibold tracking-wide text-slate-400" dir="ltr">{{ c.label }}</p>
          </div>
        </div>
      </section>

      <!-- What the portal does -->
      <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div class="mb-8 text-center">
          <h2 class="text-2xl font-bold sm:text-3xl">{{ t('welcome.featuresTitle') }}</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          <div v-for="f in features" :key="f.icon" class="rounded-2xl bg-white/[.04] p-5 ring-1 ring-white/10">
            <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
              <AppIcon :name="f.icon" />
            </div>
            <h3 class="font-semibold">{{ f.title }}</h3>
            <p class="mt-1 text-sm text-slate-400">{{ f.text }}</p>
          </div>
        </div>
      </section>

      <!-- Final call to action -->
      <section class="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b2836] to-[#0f1922] p-8 text-center ring-1 ring-white/10 sm:p-12">
          <div aria-hidden="true" class="absolute inset-x-0 top-0 flex h-1">
            <span class="flex-1 bg-[#cf1f2f]" /><span class="flex-1 bg-[#f7981f]" /><span class="flex-1 bg-[#2ba3dc]" /><span class="flex-1 bg-[#853577]" />
          </div>
          <h2 class="text-2xl font-bold sm:text-3xl">{{ t('welcome.ctaTitle') }}</h2>
          <p class="mx-auto mt-2 max-w-md text-slate-300">{{ t('welcome.ctaText') }}</p>
          <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <NuxtLink
              :to="loggedIn ? '/' : '/login'"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              {{ loggedIn ? t('welcome.openPortal') : t('welcome.start') }}
              <AppIcon name="forward" :size="18" class="rtl:rotate-180" />
            </NuxtLink>
            <NuxtLink
              v-if="!loggedIn"
              to="/register"
              class="inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-base font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/10"
            >
              {{ t('register.title') }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <footer class="relative z-10 border-t border-white/10 py-6 text-center text-xs text-slate-500">
      © <span class="ltr-nums">{{ year }}</span> Action Group · {{ t('welcome.rights') }}
    </footer>
  </div>
</template>

<style>
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}
</style>
