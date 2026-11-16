<script setup lang="ts">
// Salaries of a month: base − advance installments − deductions = net.
// Directors see their team; HR / IT / CEO see everyone; HR / IT save the month.
import type { LookupsResponse, UserSummary } from '~/composables/types'

definePageMeta({ roles: ['DIRECTOR', 'HR', 'IT', 'CEO'] })

const { t, locale } = useI18n()
const perms = usePermissions()
const apiError = useApiError()
useHead({ title: () => t('nav.payroll') })

interface Row { user: UserSummary, baseSalary: number, advances: number, deductions: number, net: number, saved: boolean }
interface Payroll { month: string, rows: Row[], totals: { baseSalary: number, advances: number, deductions: number, net: number } }

const month = ref(thisMonth())
const departmentId = ref('')
const query = computed(() => ({ month: month.value, ...(departmentId.value ? { departmentId: departmentId.value } : {}) }))

const { data: lookups } = await useFetch<LookupsResponse>('/api/lookups')
const { data, refresh, pending } = await useFetch<Payroll>('/api/payroll', { query })

const error = ref('')
const message = ref('')
const generating = ref(false)
async function generate() {
  if (!confirm(t('payroll.confirmGenerate', { month: formatMonth(month.value, locale.value) }))) return
  error.value = ''
  message.value = ''
  generating.value = true
  try {
    const res = await $fetch<{ count: number }>('/api/payroll/generate', { method: 'POST', body: { month: month.value } })
    message.value = t('payroll.generated', { n: res.count })
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    generating.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader :title="t('nav.payroll')" back="/" />
    <AlertBox v-if="error" class="mb-4">{{ error }}</AlertBox>
    <AlertBox v-if="message" type="success" class="mb-4">{{ message }}</AlertBox>

    <div class="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
      <div>
        <label class="label" for="month">{{ t('deductions.month') }}</label>
        <input id="month" v-model="month" type="month" class="input">
      </div>
      <div v-if="perms.canViewAll.value">
        <label class="label" for="dept">{{ t('employees.department') }}</label>
        <select id="dept" v-model="departmentId" class="input">
          <option value="">{{ t('employees.allDepartments') }}</option>
          <option v-for="d in lookups?.departments" :key="d.id" :value="String(d.id)">{{ localName(d, locale) }}</option>
        </select>
      </div>
      <div v-if="perms.canManage.value" class="flex items-end">
        <button type="button" class="btn-primary w-full" :disabled="generating" @click="generate">{{ t('payroll.generate') }}</button>
      </div>
    </div>

    <div v-if="data" class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="card p-4"><p class="text-xs text-slate-500">{{ t('salary.base') }}</p><p class="ltr-nums mt-1 font-bold">{{ formatMoney(data.totals.baseSalary, locale) }}</p></div>
      <div class="card p-4"><p class="text-xs text-slate-500">{{ t('salary.advances') }}</p><p class="ltr-nums mt-1 font-bold text-amber-700">{{ formatMoney(data.totals.advances, locale) }}</p></div>
      <div class="card p-4"><p class="text-xs text-slate-500">{{ t('salary.deductions') }}</p><p class="ltr-nums mt-1 font-bold text-rose-700">{{ formatMoney(data.totals.deductions, locale) }}</p></div>
      <div class="card p-4"><p class="text-xs text-slate-500">{{ t('salary.net') }}</p><p class="ltr-nums mt-1 font-bold text-brand-700">{{ formatMoney(data.totals.net, locale) }}</p></div>
    </div>

    <div v-if="pending && !data" class="py-10 text-center text-slate-400">{{ t('common.loading') }}</div>
    <EmptyState v-else-if="!data?.rows.length" icon="money" :text="t('employees.empty')" />
    <div v-else class="card overflow-x-auto">
      <table class="w-full min-w-[640px] text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th class="p-3 text-start font-semibold">{{ t('deductions.employee') }}</th>
            <th class="p-3 text-end font-semibold">{{ t('salary.base') }}</th>
            <th class="p-3 text-end font-semibold">{{ t('salary.advances') }}</th>
            <th class="p-3 text-end font-semibold">{{ t('salary.deductions') }}</th>
            <th class="p-3 text-end font-semibold">{{ t('salary.net') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="r in data.rows" :key="r.user.id" class="hover:bg-slate-50">
            <td class="p-3">
              <NuxtLink :to="`/employees/${r.user.id}`" class="flex items-center gap-2 font-medium text-slate-900">
                <UserAvatar :name="r.user.name" :src="r.user.photoUrl" :size="30" />
                <span>{{ r.user.name }}</span>
                <span v-if="r.saved" class="chip bg-emerald-50 text-emerald-700" :title="t('payroll.saved')">✓</span>
              </NuxtLink>
            </td>
            <td class="ltr-nums p-3 text-end">{{ formatMoney(r.baseSalary, locale) }}</td>
            <td class="ltr-nums p-3 text-end text-amber-700">{{ r.advances ? formatMoney(r.advances, locale) : '—' }}</td>
            <td class="ltr-nums p-3 text-end text-rose-700">{{ r.deductions ? formatMoney(r.deductions, locale) : '—' }}</td>
            <td class="ltr-nums p-3 text-end font-bold text-brand-700">{{ formatMoney(r.net, locale) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
