<script setup lang="ts">
// Request details + timeline + approve / reject (director, HR, IT) + cancel (owner).
import type { RequestItem } from '~/composables/types'

const route = useRoute()
const { t, locale } = useI18n()
const apiError = useApiError()

const id = Number(route.params.id)
const { data: request, error: loadError, refresh } = await useFetch<RequestItem>(`/api/requests/${id}`)
if (loadError.value) throw createError({ statusCode: loadError.value.statusCode ?? 404, statusMessage: 'Not found' })

useHead({ title: () => (request.value ? t(`kinds.${request.value.kind}`) : '') })

const sent = ref(route.query.sent === '1')
const comment = ref('')
const error = ref('')
const busy = ref(false)

async function act(action: 'approve' | 'reject' | 'cancel') {
  if (action === 'cancel' && !confirm(t('requests.confirmCancel'))) return
  error.value = ''
  busy.value = true
  try {
    if (action === 'cancel') await $fetch(`/api/requests/${id}/cancel`, { method: 'POST' })
    else await $fetch(`/api/requests/${id}/decide`, { method: 'POST', body: { decision: action, comment: comment.value || null } })
    sent.value = false
    comment.value = ''
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    busy.value = false
  }
}

const backTo = computed(() => (request.value ? `/requests/${SLUG_BY_KIND[request.value.kind]}` : '/'))
</script>

<template>
  <div v-if="request" class="mx-auto max-w-lg space-y-4">
    <PageHeader :title="t(`kinds.${request.kind}`)" :subtitle="`#${request.id}`" :back="backTo">
      <template #actions><StatusBadge :status="request.status" /></template>
    </PageHeader>

    <AlertBox v-if="sent" type="success">{{ t('requests.sent') }}</AlertBox>
    <AlertBox v-if="error">{{ error }}</AlertBox>

    <!-- Employee -->
    <div class="card flex items-center gap-3 p-4">
      <UserAvatar :name="request.user.name" :src="request.user.photoUrl" :size="44" />
      <div class="min-w-0">
        <p class="font-semibold text-slate-900">{{ request.user.name }}</p>
        <p class="text-sm text-slate-500">
          {{ request.user.position || '—' }}<template v-if="request.user.department"> · {{ localName(request.user.department, locale) }}</template><template v-if="request.user.branch"> · {{ localName(request.user.branch, locale) }}</template>
        </p>
      </div>
    </div>

    <!-- Details -->
    <dl class="card divide-y divide-slate-100 text-sm">
      <div v-if="request.subtype" class="flex justify-between p-4">
        <dt class="text-slate-500">{{ t(`requests.typeOf.${request.kind}`) }}</dt>
        <dd class="font-medium">{{ t(`subtypes.${request.subtype}`) }}</dd>
      </div>
      <template v-if="request.kind === 'HOURLY_LEAVE'">
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('requests.date') }}</dt><dd class="ltr-nums font-medium">{{ formatDate(request.date) }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('requests.time') }}</dt><dd class="ltr-nums font-medium">{{ request.fromTime }} – {{ request.toTime }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('requests.duration') }}</dt><dd class="font-medium">{{ t('requests.hoursCount', { n: request.hours }) }}</dd></div>
      </template>
      <template v-else-if="request.kind === 'VACATION'">
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('common.from') }}</dt><dd class="ltr-nums font-medium">{{ formatDate(request.startDate) }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('common.to') }}</dt><dd class="ltr-nums font-medium">{{ formatDate(request.endDate) }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('requests.duration') }}</dt><dd class="font-medium">{{ t('requests.daysCount', { n: request.days }) }}</dd></div>
      </template>
      <template v-else>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('requests.amount') }}</dt><dd class="ltr-nums font-bold">{{ formatMoney(request.amount, locale) }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('requests.installments') }}</dt><dd class="font-medium">{{ t('requests.installmentsCount', { n: request.installments }) }}</dd></div>
      </template>
      <div class="p-4">
        <dt class="mb-1 text-slate-500">{{ t('requests.reason') }}</dt>
        <dd class="whitespace-pre-line">{{ request.reason || '—' }}</dd>
      </div>
    </dl>

    <!-- Timeline -->
    <div class="card p-4">
      <h2 class="mb-3 font-bold text-slate-900">{{ t('requests.timeline') }}</h2>
      <ol class="space-y-4 border-s-2 border-slate-100 ps-4 text-sm">
        <li>
          <p class="font-medium">{{ t('requests.submittedBy', { name: request.user.name }) }}</p>
          <p class="ltr-nums text-xs text-slate-500">{{ formatDateTime(request.createdAt) }}</p>
        </li>
        <li v-if="request.directorDecision">
          <p class="font-medium" :class="request.directorDecision === 'approved' ? 'text-emerald-700' : 'text-rose-700'">
            {{ t(`requests.director_${request.directorDecision}`, { name: request.director?.name }) }}
          </p>
          <p v-if="request.directorComment" class="mt-0.5 text-slate-600">“{{ request.directorComment }}”</p>
          <p class="ltr-nums text-xs text-slate-500">{{ formatDateTime(request.directorDecidedAt) }}</p>
        </li>
        <li v-if="request.hrDecision">
          <p class="font-medium" :class="request.hrDecision === 'approved' ? 'text-emerald-700' : 'text-rose-700'">
            {{ t(`requests.hr_${request.hrDecision}`, { name: request.hr?.name }) }}
          </p>
          <p v-if="request.hrComment" class="mt-0.5 text-slate-600">“{{ request.hrComment }}”</p>
          <p class="ltr-nums text-xs text-slate-500">{{ formatDateTime(request.hrDecidedAt) }}</p>
        </li>
        <li v-if="request.status === 'PENDING_DIRECTOR' || request.status === 'PENDING_HR'">
          <p class="font-medium text-amber-700">{{ t(`status.${request.status}`) }}…</p>
        </li>
        <li v-if="request.status === 'CANCELLED'">
          <p class="font-medium text-slate-500">{{ t('status.CANCELLED') }}</p>
        </li>
      </ol>
    </div>

    <!-- Approve / reject -->
    <div v-if="request.canDecide" class="card space-y-3 p-4">
      <label class="label" for="comment">{{ t('approvals.comment') }} <span class="font-normal text-slate-400">({{ t('common.optional') }})</span></label>
      <textarea id="comment" v-model="comment" rows="2" maxlength="1000" class="input" />
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="btn-success" :disabled="busy" @click="act('approve')"><AppIcon name="check" :size="18" />{{ t('approvals.approve') }}</button>
        <button type="button" class="btn-danger" :disabled="busy" @click="act('reject')"><AppIcon name="x" :size="18" />{{ t('approvals.reject') }}</button>
      </div>
    </div>

    <button v-if="request.canCancel" type="button" class="btn-secondary w-full" :disabled="busy" @click="act('cancel')">
      {{ t('requests.cancel') }}
    </button>
  </div>
</template>
