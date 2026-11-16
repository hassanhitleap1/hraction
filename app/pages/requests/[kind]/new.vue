<script setup lang="ts">
// Request forms (from the paper sketches):
//  مغادرة: type (personal / work) · date · from–to time · reason (optional) · submit
//  إجازة : type (annual / sick) · from–to date · reason (optional) · submit
//  سلفة  : amount · installments · reason (optional) · submit
import { countVacationDays, hoursBetween, installmentPlan, parseDateOnly } from '#shared/business/calc'
import type { RequestItem } from '~/composables/types'

const route = useRoute()
const { t, locale } = useI18n()
const apiError = useApiError()

const slug = route.params.kind as KindSlug
const kind = KIND_BY_SLUG[slug]
if (!kind) throw createError({ statusCode: 404, statusMessage: 'Not found' })

useHead({ title: () => t(`requests.new.${kind}`) })

const { data: me } = await useMe()

const form = reactive({
  subtype: kind === 'HOURLY_LEAVE' ? 'personal' : 'annual',
  date: today(),
  fromTime: '09:00',
  toTime: '11:00',
  startDate: today(),
  endDate: today(),
  amount: null as number | null,
  installments: 1,
  reason: '',
})
const error = ref('')
const loading = ref(false)

// Live calculations shown under the fields
const hours = computed(() => hoursBetween(form.fromTime, form.toTime))
const days = computed(() => {
  const s = parseDateOnly(form.startDate)
  const e = parseDateOnly(form.endDate)
  return s && e ? countVacationDays(s, e, me.value?.settings.weekendDays ?? [5]) : 0
})
const remaining = computed(() => {
  const b = me.value?.balances
  if (!b) return null
  if (kind === 'HOURLY_LEAVE') return b.hourly.remaining
  if (kind === 'VACATION') return form.subtype === 'sick' ? b.sick.remaining : b.annual.remaining
  return null
})
const monthly = computed(() =>
  form.amount && form.amount > 0 ? installmentPlan(form.amount, form.installments, thisMonth())[0]!.amount : 0,
)
const maxInstallments = computed(() => me.value?.settings.maxAdvanceInstallments ?? 6)

watch(() => form.startDate, (v) => {
  if (form.endDate < v) form.endDate = v
})

async function submit() {
  error.value = ''
  loading.value = true
  const reason = form.reason.trim() || null
  const body
    = kind === 'HOURLY_LEAVE'
      ? { kind, subtype: form.subtype, date: form.date, fromTime: form.fromTime, toTime: form.toTime, reason }
      : kind === 'VACATION'
        ? { kind, subtype: form.subtype, startDate: form.startDate, endDate: form.endDate, reason }
        : { kind, amount: Number(form.amount), installments: Number(form.installments), reason }
  try {
    const created = await $fetch<RequestItem>('/api/requests', { method: 'POST', body })
    await refreshNuxtData('me')
    await navigateTo(`/request/${created.id}?sent=1`)
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
  <div class="mx-auto max-w-lg">
    <PageHeader :title="t(`requests.new.${kind}`)" :back="`/requests/${slug}`" />

    <form class="card space-y-4 p-5" @submit.prevent="submit">
      <AlertBox v-if="error">{{ error }}</AlertBox>

      <!-- Type -->
      <div v-if="kind !== 'ADVANCE'">
        <label class="label" for="subtype">{{ t(`requests.typeOf.${kind}`) }}</label>
        <select id="subtype" v-model="form.subtype" class="input">
          <template v-if="kind === 'HOURLY_LEAVE'">
            <option value="personal">{{ t('subtypes.personal') }}</option>
            <option value="work">{{ t('subtypes.work') }}</option>
          </template>
          <template v-else>
            <option value="annual">{{ t('subtypes.annual') }}</option>
            <option value="sick">{{ t('subtypes.sick') }}</option>
          </template>
        </select>
      </div>

      <!-- Hourly leave: date + time range -->
      <template v-if="kind === 'HOURLY_LEAVE'">
        <div>
          <label class="label" for="date">{{ t('requests.date') }}</label>
          <input id="date" v-model="form.date" type="date" class="input" required>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="fromTime">{{ t('requests.fromTime') }}</label>
            <input id="fromTime" v-model="form.fromTime" type="time" class="input" required>
          </div>
          <div>
            <label class="label" for="toTime">{{ t('requests.toTime') }}</label>
            <input id="toTime" v-model="form.toTime" type="time" class="input" required>
          </div>
        </div>
        <AlertBox v-if="hours > 0" type="info">{{ t('requests.hoursCount', { n: hours }) }} · {{ t('requests.remaining', { n: remaining }) }}</AlertBox>
      </template>

      <!-- Vacation: date range -->
      <template v-if="kind === 'VACATION'">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="startDate">{{ t('common.from') }}</label>
            <input id="startDate" v-model="form.startDate" type="date" class="input" required>
          </div>
          <div>
            <label class="label" for="endDate">{{ t('common.to') }}</label>
            <input id="endDate" v-model="form.endDate" type="date" class="input" :min="form.startDate" required>
          </div>
        </div>
        <AlertBox type="info">{{ t('requests.daysCount', { n: days }) }} · {{ t('requests.remainingDays', { n: remaining }) }}</AlertBox>
      </template>

      <!-- Advance: amount + installments -->
      <template v-if="kind === 'ADVANCE'">
        <div>
          <label class="label" for="amount">{{ t('requests.amount') }}</label>
          <input id="amount" v-model.number="form.amount" type="number" inputmode="decimal" min="1" step="0.001" class="input" required>
          <p v-if="me?.user.baseSalary" class="mt-1.5 text-xs text-slate-500">{{ t('requests.maxAdvance', { amount: formatMoney(me.user.baseSalary, locale) }) }}</p>
        </div>
        <div>
          <label class="label" for="installments">{{ t('requests.installments') }}</label>
          <select id="installments" v-model.number="form.installments" class="input">
            <option v-for="n in maxInstallments" :key="n" :value="n">{{ t('requests.installmentsCount', { n }) }}</option>
          </select>
        </div>
        <AlertBox v-if="monthly" type="info">{{ t('requests.monthlyDeduction', { amount: formatMoney(monthly, locale) }) }}</AlertBox>
      </template>

      <!-- Reason (optional) -->
      <div>
        <label class="label" for="reason">{{ t('requests.reason') }} <span class="font-normal text-slate-400">({{ t('common.optional') }})</span></label>
        <textarea id="reason" v-model="form.reason" rows="3" maxlength="1000" class="input" />
      </div>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? t('common.loading') : t('common.submit') }}
      </button>
    </form>
  </div>
</template>
