<script setup lang="ts">
// List of hourly leaves / vacations / advances — "Mine" and, for directors/HR/IT/CEO, "Team".
import type { RequestItem } from '~/composables/types'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const perms = usePermissions()

const slug = route.params.kind as KindSlug
const kind = KIND_BY_SLUG[slug]
if (!kind) throw createError({ statusCode: 404, statusMessage: 'Not found' })

useHead({ title: () => t(`kinds.${kind}_plural`) })

const filters = reactive({
  scope: (route.query.scope === 'team' && perms.hasTeam.value ? 'team' : 'mine') as 'mine' | 'team',
  status: (route.query.status as string) || '',
  from: (route.query.from as string) || '',
  to: (route.query.to as string) || '',
  userId: (route.query.userId as string) || '',
})
const showFilters = ref(!!(filters.status || filters.from || filters.to))

const query = computed(() => ({
  kind,
  scope: filters.scope,
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.from ? { from: filters.from } : {}),
  ...(filters.to ? { to: filters.to } : {}),
  ...(filters.scope === 'team' && filters.userId ? { userId: filters.userId } : {}),
}))

// Keep the filters in the URL so the page can be shared / refreshed
watch(query, q => router.replace({ query: { ...q, kind: undefined } }))

const { data: items, pending } = await useFetch<RequestItem[]>('/api/requests', { query })
const { data: me } = await useMe()

const balanceText = computed(() => {
  const b = me.value?.balances
  if (!b) return ''
  if (kind === 'HOURLY_LEAVE') return t('home.hoursLeft', { n: b.hourly.remaining, total: b.hourly.allowance })
  if (kind === 'VACATION') {
    return `${t('subtypes.annual')}: ${b.annual.remaining}/${b.annual.allowance} · ${t('subtypes.sick')}: ${b.sick.remaining}/${b.sick.allowance}`
  }
  return me.value ? `${t('salary.base')}: ${formatMoney(me.value.user.baseSalary, locale.value)}` : ''
})

function clearFilters() {
  filters.status = ''
  filters.from = ''
  filters.to = ''
  filters.userId = ''
}
</script>

<template>
  <div>
    <PageHeader :title="t(`kinds.${kind}_plural`)" :subtitle="filters.scope === 'mine' ? balanceText : undefined" back="/">
      <template #actions>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200"
          :class="showFilters ? 'bg-brand-50 text-brand-700' : 'bg-white text-slate-600'"
          :aria-label="t('common.filter')"
          @click="showFilters = !showFilters"
        >
          <AppIcon name="filter" :size="18" />
        </button>
      </template>
    </PageHeader>

    <!-- Mine / Team -->
    <div v-if="perms.hasTeam.value" class="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
      <button type="button" class="tab" :class="{ 'tab-active': filters.scope === 'mine' }" @click="filters.scope = 'mine'">{{ t('requests.mine') }}</button>
      <button type="button" class="tab" :class="{ 'tab-active': filters.scope === 'team' }" @click="filters.scope = 'team'">
        {{ perms.canViewAll.value ? t('requests.everyone') : t('requests.team') }}
      </button>
    </div>

    <!-- Filters: status + date range -->
    <div v-if="showFilters" class="card mb-4 grid gap-3 p-4 sm:grid-cols-4">
      <div>
        <label class="label" for="status">{{ t('requests.status') }}</label>
        <select id="status" v-model="filters.status" class="input">
          <option value="">{{ t('common.all') }}</option>
          <option value="PENDING">{{ t('status.PENDING') }}</option>
          <option value="APPROVED">{{ t('status.APPROVED') }}</option>
          <option value="REJECTED">{{ t('status.REJECTED') }}</option>
          <option value="CANCELLED">{{ t('status.CANCELLED') }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="from">{{ t('common.from') }}</label>
        <input id="from" v-model="filters.from" type="date" class="input">
      </div>
      <div>
        <label class="label" for="to">{{ t('common.to') }}</label>
        <input id="to" v-model="filters.to" type="date" class="input">
      </div>
      <div class="flex items-end">
        <button type="button" class="btn-ghost w-full" @click="clearFilters">{{ t('common.clear') }}</button>
      </div>
    </div>

    <div v-if="pending && !items" class="py-10 text-center text-slate-400">{{ t('common.loading') }}</div>
    <EmptyState v-else-if="!items?.length" :icon="kind === 'HOURLY_LEAVE' ? 'leave' : kind === 'VACATION' ? 'vacation' : 'advance'" :text="t('requests.empty')" />
    <div v-else class="space-y-3">
      <RequestCard v-for="item in items" :key="item.id" :request="item" :show-user="filters.scope === 'team'" />
    </div>

    <!-- New request button -->
    <NuxtLink
      :to="`/requests/${slug}/new`"
      class="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] end-5 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-brand-600 px-5 font-semibold text-white shadow-lg hover:bg-brand-700"
    >
      <AppIcon name="plus" />
      {{ t(`requests.new.${kind}`) }}
    </NuxtLink>
    <div class="h-20" />
  </div>
</template>
