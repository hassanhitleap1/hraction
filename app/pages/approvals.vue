<script setup lang="ts">
// Approvals inbox: requests waiting for my decision (+ deductions waiting for HR review).
import type { DeductionItem, RequestItem } from '~/composables/types'

definePageMeta({ roles: ['DIRECTOR', 'HR', 'IT'] })

const { t, locale } = useI18n()
const apiError = useApiError()
useHead({ title: () => t('nav.approvals') })

const { data, refresh, pending } = await useFetch<{ requests: RequestItem[], deductions: DeductionItem[] }>('/api/approvals')

const kindFilter = ref<'' | RequestItem['kind']>('')
const requests = computed(() => (data.value?.requests ?? []).filter(r => !kindFilter.value || r.kind === kindFilter.value))

const error = ref('')
const busyId = ref<string | null>(null)

async function decide(type: 'request' | 'deduction', id: number, decision: 'approve' | 'reject') {
  let comment: string | null = null
  if (decision === 'reject') {
    comment = prompt(t('approvals.rejectReason'))
    if (comment === null) return // cancelled
  }
  error.value = ''
  busyId.value = `${type}-${id}`
  try {
    const url = type === 'request' ? `/api/requests/${id}/decide` : `/api/deductions/${id}/review`
    await $fetch(url, { method: 'POST', body: { decision, comment: comment || null } })
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <PageHeader :title="t('nav.approvals')" back="/" />
    <AlertBox v-if="error" class="mb-4">{{ error }}</AlertBox>

    <div class="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      <button type="button" class="tab whitespace-nowrap" :class="{ 'tab-active': kindFilter === '' }" @click="kindFilter = ''">{{ t('common.all') }}</button>
      <button v-for="k in (['HOURLY_LEAVE', 'VACATION', 'ADVANCE'] as const)" :key="k" type="button" class="tab whitespace-nowrap" :class="{ 'tab-active': kindFilter === k }" @click="kindFilter = k">
        {{ t(`kinds.${k}_plural`) }}
      </button>
    </div>

    <div v-if="pending && !data" class="py-10 text-center text-slate-400">{{ t('common.loading') }}</div>
    <EmptyState v-else-if="!requests.length && !data?.deductions.length" icon="check" :text="t('approvals.empty')" />

    <div class="space-y-3">
      <div v-for="r in requests" :key="`r-${r.id}`" class="space-y-2">
        <RequestCard :request="r" show-user />
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="btn-success" :disabled="busyId === `request-${r.id}`" @click="decide('request', r.id, 'approve')">
            <AppIcon name="check" :size="18" />{{ t('approvals.approve') }}
          </button>
          <button type="button" class="btn-danger" :disabled="busyId === `request-${r.id}`" @click="decide('request', r.id, 'reject')">
            <AppIcon name="x" :size="18" />{{ t('approvals.reject') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Deductions waiting for HR -->
    <template v-if="data?.deductions.length && !kindFilter">
      <h2 class="mb-3 mt-8 font-bold text-slate-900">{{ t('approvals.deductionsToReview') }}</h2>
      <div class="space-y-3">
        <div v-for="d in data.deductions" :key="`d-${d.id}`" class="card space-y-3 p-4">
          <div class="flex items-center gap-3">
            <UserAvatar :name="d.user.name" :src="d.user.photoUrl" :size="38" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ d.user.name }}</p>
              <p class="text-xs text-slate-500">{{ t('deductions.recordedBy', { name: d.createdBy.name }) }} · {{ formatMonth(d.month, locale) }}</p>
            </div>
            <span class="ltr-nums font-bold text-rose-700">{{ formatMoney(d.amount, locale) }}</span>
          </div>
          <p class="text-sm text-slate-600">{{ d.reason }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="btn-success" :disabled="busyId === `deduction-${d.id}`" @click="decide('deduction', d.id, 'approve')">{{ t('deductions.apply') }}</button>
            <button type="button" class="btn-danger" :disabled="busyId === `deduction-${d.id}`" @click="decide('deduction', d.id, 'reject')">{{ t('approvals.reject') }}</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
