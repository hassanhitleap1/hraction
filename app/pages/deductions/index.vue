<script setup lang="ts">
// Deductions: employees see theirs; directors record deductions for their team (HR reviews them).
import type { DeductionItem } from '~/composables/types'

const route = useRoute()
const { t, locale } = useI18n()
const perms = usePermissions()
const apiError = useApiError()
useHead({ title: () => t('nav.deductions') })

const filters = reactive({
  scope: (route.query.scope === 'team' && perms.hasTeam.value ? 'team' : 'mine') as 'mine' | 'team',
  month: (route.query.month as string) || '',
  status: '',
})
const query = computed(() => ({
  scope: filters.scope,
  ...(filters.month ? { month: filters.month } : {}),
  ...(filters.status ? { status: filters.status } : {}),
}))

const { data: items, refresh, pending } = await useFetch<DeductionItem[]>('/api/deductions', { query })
const total = computed(() => (items.value ?? []).filter(d => d.status === 'APPLIED').reduce((a, d) => a + d.amount, 0))

const error = ref('')
async function review(id: number, decision: 'approve' | 'reject') {
  let comment: string | null = null
  if (decision === 'reject') {
    comment = prompt(t('approvals.rejectReason'))
    if (comment === null) return
  }
  try {
    await $fetch(`/api/deductions/${id}/review`, { method: 'POST', body: { decision, comment } })
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
}
</script>

<template>
  <div>
    <PageHeader :title="t('nav.deductions')" back="/" />
    <AlertBox v-if="error" class="mb-4">{{ error }}</AlertBox>

    <div v-if="perms.hasTeam.value" class="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
      <button type="button" class="tab" :class="{ 'tab-active': filters.scope === 'mine' }" @click="filters.scope = 'mine'">{{ t('requests.mine') }}</button>
      <button type="button" class="tab" :class="{ 'tab-active': filters.scope === 'team' }" @click="filters.scope = 'team'">
        {{ perms.canViewAll.value ? t('requests.everyone') : t('requests.team') }}
      </button>
    </div>

    <div class="card mb-4 grid grid-cols-2 gap-3 p-4">
      <div>
        <label class="label" for="month">{{ t('deductions.month') }}</label>
        <input id="month" v-model="filters.month" type="month" class="input">
      </div>
      <div>
        <label class="label" for="dstatus">{{ t('requests.status') }}</label>
        <select id="dstatus" v-model="filters.status" class="input">
          <option value="">{{ t('common.all') }}</option>
          <option value="PENDING_HR">{{ t('status.PENDING_HR') }}</option>
          <option value="APPLIED">{{ t('status.APPLIED') }}</option>
          <option value="REJECTED">{{ t('status.REJECTED') }}</option>
        </select>
      </div>
    </div>

    <div v-if="items?.length" class="mb-3 flex items-center justify-between px-1 text-sm">
      <span class="text-slate-500">{{ t('deductions.totalApplied') }}</span>
      <span class="ltr-nums font-bold text-rose-700">{{ formatMoney(total, locale) }}</span>
    </div>

    <div v-if="pending && !items" class="py-10 text-center text-slate-400">{{ t('common.loading') }}</div>
    <EmptyState v-else-if="!items?.length" icon="deduction" :text="t('deductions.empty')" />
    <div v-else class="space-y-3">
      <div v-for="d in items" :key="d.id" class="card p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <UserAvatar v-if="filters.scope === 'team'" :name="d.user.name" :src="d.user.photoUrl" :size="38" />
            <div class="min-w-0">
              <p v-if="filters.scope === 'team'" class="truncate font-semibold">{{ d.user.name }}</p>
              <p class="ltr-nums text-lg font-bold text-rose-700">{{ formatMoney(d.amount, locale) }}</p>
            </div>
          </div>
          <StatusBadge :status="d.status" />
        </div>
        <p class="mt-2 text-sm text-slate-700">{{ d.reason }}</p>
        <p class="mt-2 text-xs text-slate-500">
          {{ formatMonth(d.month, locale) }} · {{ t('deductions.recordedBy', { name: d.createdBy.name }) }}
          <template v-if="d.reviewComment"> · “{{ d.reviewComment }}”</template>
        </p>
        <div v-if="d.canReview" class="mt-3 grid grid-cols-2 gap-2">
          <button type="button" class="btn-success" @click="review(d.id, 'approve')">{{ t('deductions.apply') }}</button>
          <button type="button" class="btn-danger" @click="review(d.id, 'reject')">{{ t('approvals.reject') }}</button>
        </div>
      </div>
    </div>

    <template v-if="perms.canRecordDeductions.value">
      <NuxtLink
        to="/deductions/new"
        class="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] end-5 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-rose-600 px-5 font-semibold text-white shadow-lg hover:bg-rose-700"
      >
        <AppIcon name="plus" />
        {{ t('deductions.new') }}
      </NuxtLink>
      <div class="h-20" />
    </template>
  </div>
</template>
