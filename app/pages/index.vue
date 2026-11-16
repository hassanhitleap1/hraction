<script setup lang="ts">
const { t, locale } = useI18n()
const perms = usePermissions()
const { data: me, refresh } = await useMe()

useHead({ title: () => t('nav.home') })
onMounted(() => refresh())

// Pending approvals count for directors / HR / IT
const { data: approvals } = await useFetch<{ requests: unknown[], deductions: unknown[] }>('/api/approvals', {
  immediate: perms.isApprover.value,
})
const pendingCount = computed(() => (approvals.value?.requests.length ?? 0) + (approvals.value?.deductions.length ?? 0))

const tiles = computed(() => {
  const b = me.value?.balances
  const s = me.value?.salary
  return [
    {
      to: '/requests/hourly-leave',
      icon: 'leave',
      title: t('kinds.HOURLY_LEAVE'),
      hint: b ? t('home.hoursLeft', { n: b.hourly.remaining, total: b.hourly.allowance }) : '',
      color: 'bg-sky-50 text-sky-600',
    },
    {
      to: '/requests/vacation',
      icon: 'vacation',
      title: t('kinds.VACATION'),
      hint: b ? t('home.daysLeft', { n: b.annual.remaining, total: b.annual.allowance }) : '',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      to: '/requests/advance',
      icon: 'advance',
      title: t('kinds.ADVANCE'),
      hint: s && s.advances > 0 ? t('home.advanceThisMonth', { amount: formatMoney(s.advances, locale.value) }) : t('home.requestAdvance'),
      color: 'bg-amber-50 text-amber-600',
    },
    {
      to: '/deductions',
      icon: 'deduction',
      title: t('nav.deductions'),
      hint: s && s.deductions > 0 ? formatMoney(s.deductions, locale.value) : t('home.noDeductions'),
      color: 'bg-rose-50 text-rose-600',
    },
  ]
})
</script>

<template>
  <div>
    <div class="mb-5">
      <p class="text-sm text-slate-500">{{ t('home.welcome') }}</p>
      <h1 class="text-2xl font-bold text-slate-900">{{ me?.user.name }}</h1>
      <p v-if="me" class="mt-0.5 text-sm text-slate-500">
        {{ t(`roles.${me.user.role}`) }}<template v-if="me.user.department"> · {{ localName(me.user.department, locale) }}</template><template v-if="me.user.branch"> · {{ localName(me.user.branch, locale) }}</template>
      </p>
    </div>

    <!-- Approvals waiting for me -->
    <NuxtLink
      v-if="perms.isApprover.value && pendingCount > 0"
      to="/approvals"
      class="mb-4 flex items-center gap-3 rounded-2xl bg-accent-500 p-4 text-white shadow-sm hover:bg-accent-600"
    >
      <AppIcon name="inbox" />
      <span class="flex-1 font-semibold">{{ t('home.pendingApprovals', { n: pendingCount }) }}</span>
      <AppIcon name="forward" class="rtl:rotate-180" />
    </NuxtLink>

    <!-- The 4 main tiles -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NuxtLink
        v-for="tile in tiles"
        :key="tile.to"
        :to="tile.to"
        class="card flex aspect-square flex-col justify-between p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:aspect-auto sm:min-h-36"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-2xl" :class="tile.color">
          <AppIcon :name="tile.icon" :size="26" />
        </span>
        <span>
          <span class="block text-lg font-bold text-slate-900">{{ tile.title }}</span>
          <span class="mt-0.5 block text-xs text-slate-500">{{ tile.hint }}</span>
        </span>
      </NuxtLink>
    </div>

    <!-- This month's salary -->
    <div v-if="me" class="card mt-4 p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-bold text-slate-900">{{ t('home.salaryThisMonth') }}</h2>
        <span class="text-sm text-slate-500">{{ formatMonth(me.salary.month, locale) }}</span>
      </div>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between"><dt class="text-slate-500">{{ t('salary.base') }}</dt><dd class="ltr-nums">{{ formatMoney(me.salary.baseSalary, locale) }}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">{{ t('salary.advances') }}</dt><dd class="ltr-nums text-amber-700">− {{ formatMoney(me.salary.advances, locale) }}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-500">{{ t('salary.deductions') }}</dt><dd class="ltr-nums text-rose-700">− {{ formatMoney(me.salary.deductions, locale) }}</dd></div>
        <div class="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><dt>{{ t('salary.net') }}</dt><dd class="ltr-nums text-brand-700">{{ formatMoney(me.salary.net, locale) }}</dd></div>
      </dl>
    </div>

    <!-- Vacation balances -->
    <div v-if="me" class="mt-4 grid grid-cols-2 gap-3">
      <div class="card p-4">
        <p class="text-xs text-slate-500">{{ t('subtypes.annual') }}</p>
        <p class="mt-1 text-xl font-bold text-slate-900">{{ me.balances.annual.remaining }} <span class="text-sm font-normal text-slate-400">/ {{ me.balances.annual.allowance }}</span></p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-slate-500">{{ t('subtypes.sick') }}</p>
        <p class="mt-1 text-xl font-bold text-slate-900">{{ me.balances.sick.remaining }} <span class="text-sm font-normal text-slate-400">/ {{ me.balances.sick.allowance }}</span></p>
      </div>
    </div>
  </div>
</template>
