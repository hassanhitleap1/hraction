<script setup lang="ts">
// One employee: profile, balances, salary, quick links — and the edit form for HR / IT.
// /employees/new opens the same form empty (add employee).
import type { Balance } from '~/composables/useMe'
import type { EmployeeItem, LookupsResponse } from '~/composables/types'

definePageMeta({ roles: ['DIRECTOR', 'HR', 'IT', 'CEO'] })

const route = useRoute()
const { t, locale } = useI18n()
const perms = usePermissions()
const apiError = useApiError()

const isNew = route.params.id === 'new'
if (isNew && !perms.canManage.value) await navigateTo('/employees')

interface EmployeeDetails {
  user: EmployeeItem
  balances: { annual: Balance, sick: Balance, hourly: Balance }
  salary: { month: string, baseSalary: number, advances: number, deductions: number, net: number }
}

const { data: lookups } = await useFetch<LookupsResponse>('/api/lookups')
const { data: details, refresh, error: loadError } = await useFetch<EmployeeDetails>(`/api/employees/${route.params.id}`, {
  immediate: !isNew,
})
if (loadError.value) throw createError({ statusCode: 404, statusMessage: 'Not found' })

useHead({ title: () => (isNew ? t('employees.add') : details.value?.user.name ?? '') })

const editing = ref(isNew)
const form = reactive({
  name: '',
  phone: '',
  email: '',
  position: '',
  role: 'EMPLOYEE' as EmployeeItem['role'],
  departmentId: null as number | null,
  branchId: null as number | null,
  baseSalary: 0,
  hireDate: '',
  isActive: true,
  annualLeaveDays: null as number | null,
  sickLeaveDays: null as number | null,
  // Weekly days off: null = company setting
  weekendDays: null as number[] | null,
  // Optional: HR / IT type the password (empty = phone number for new / unchanged for existing)
  password: '',
  mustChangePassword: true,
})
const showPassword = ref(false)

function fillForm() {
  const u = details.value?.user
  if (!u) return
  Object.assign(form, {
    name: u.name,
    phone: u.phone,
    email: u.email ?? '',
    position: u.position ?? '',
    role: u.role,
    departmentId: u.departmentId,
    branchId: u.branchId,
    baseSalary: u.baseSalary,
    hireDate: u.hireDate ?? '',
    isActive: u.isActive,
    annualLeaveDays: u.annualLeaveDays,
    sickLeaveDays: u.sickLeaveDays,
    weekendDays: u.weekendDays ? [...u.weekendDays] : null,
    password: '',
    mustChangePassword: true,
  })
}
fillForm()

const department = computed(() => lookups.value?.departments.find(d => d.id === form.departmentId))

// Weekly days off (Saturday → Friday). Default = the company setting (admin settings page).
const DAYS = [6, 0, 1, 2, 3, 4, 5]
const useCompanyDays = computed({
  get: () => form.weekendDays === null,
  set: (v: boolean) => (form.weekendDays = v ? null : [5]),
})
function toggleDay(d: number) {
  const days = form.weekendDays ?? []
  form.weekendDays = days.includes(d) ? days.filter(x => x !== d) : [...days, d]
}
const daysLabel = (days: number[] | null) =>
  days === null
    ? t('employees.companyDaysOff')
    : days.length
      ? DAYS.filter(d => days.includes(d)).map(d => t(`days.${d}`)).join('، ')
      : t('employees.noDaysOff')

const error = ref('')
const message = ref('')
const saving = ref(false)

async function save() {
  error.value = ''
  message.value = ''
  saving.value = true
  const { password, mustChangePassword, ...fields } = form
  const body = {
    ...fields,
    ...(password ? { password, mustChangePassword } : {}),
    email: form.email || null,
    position: form.position || null,
    hireDate: form.hireDate || null,
    baseSalary: Number(form.baseSalary),
    annualLeaveDays: form.annualLeaveDays === null || (form.annualLeaveDays as unknown) === '' ? null : Number(form.annualLeaveDays),
    sickLeaveDays: form.sickLeaveDays === null || (form.sickLeaveDays as unknown) === '' ? null : Number(form.sickLeaveDays),
  }
  try {
    if (isNew) {
      const created = await $fetch<EmployeeItem>('/api/employees', { method: 'POST', body })
      await navigateTo(`/employees/${created.id}`)
      return
    }
    await $fetch(`/api/employees/${route.params.id}`, { method: 'PATCH', body })
    await refresh()
    fillForm()
    editing.value = false
    message.value = t('common.saved')
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    saving.value = false
  }
}

// HR / IT / CEO: log in as this employee (not as another admin, not as themselves)
const { user: sessionUser, session } = useUserSession()
const canLoginAs = computed(() => {
  const u = details.value?.user
  return !!u && perms.canManage.value && !session.value?.impersonator
    && u.id !== sessionUser.value?.id && u.isActive && u.role !== 'HR' && u.role !== 'IT' && u.role !== 'CEO'
})
const loggingInAs = ref(false)

async function loginAs() {
  if (!details.value || !confirm(t('impersonate.confirm', { name: details.value.user.name }))) return
  loggingInAs.value = true
  try {
    await $fetch(`/api/employees/${route.params.id}/impersonate`, { method: 'POST' })
    // Full reload so no data from the HR account stays cached on the page
    window.location.href = '/'
  }
  catch (e) {
    error.value = apiError(e)
    loggingInAs.value = false
  }
}

async function resetPassword() {
  if (!confirm(t('employees.confirmReset'))) return
  try {
    await $fetch(`/api/employees/${route.params.id}/reset-password`, { method: 'POST' })
    message.value = t('employees.resetDone')
  }
  catch (e) {
    error.value = apiError(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <PageHeader :title="isNew ? t('employees.add') : details?.user.name ?? ''" back="/employees">
      <template v-if="!isNew && perms.canManage.value && !editing" #actions>
        <button type="button" class="btn-secondary" @click="editing = true">{{ t('common.edit') }}</button>
      </template>
    </PageHeader>

    <AlertBox v-if="error">{{ error }}</AlertBox>
    <AlertBox v-if="message" type="success">{{ message }}</AlertBox>

    <!-- View -->
    <template v-if="details && !editing">
      <div class="card flex items-center gap-4 p-5">
        <UserAvatar :name="details.user.name" :src="details.user.photoUrl" :size="64" />
        <div class="min-w-0">
          <p class="text-lg font-bold text-slate-900">{{ details.user.name }}</p>
          <p class="text-sm text-slate-500">{{ details.user.position || '—' }} · {{ t(`roles.${details.user.role}`) }}</p>
          <p class="text-sm text-slate-500">
            {{ localName(details.user.department, locale) }}<template v-if="details.user.branch"> · {{ localName(details.user.branch, locale) }}</template>
          </p>
        </div>
      </div>

      <dl class="card divide-y divide-slate-100 text-sm">
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('profile.phone') }}</dt><dd class="ltr-nums">{{ details.user.phone }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('profile.email') }}</dt><dd>{{ details.user.email || '—' }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('profile.hireDate') }}</dt><dd class="ltr-nums">{{ formatDate(details.user.hireDate) }}</dd></div>
        <div class="flex justify-between gap-4 p-4"><dt class="text-slate-500">{{ t('employees.daysOff') }}</dt><dd class="text-end">{{ daysLabel(details.user.weekendDays) }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('salary.base') }}</dt><dd class="ltr-nums">{{ formatMoney(details.user.baseSalary, locale) }}</dd></div>
        <div class="flex justify-between p-4"><dt class="text-slate-500">{{ t('salary.netThisMonth') }}</dt><dd class="ltr-nums font-bold text-brand-700">{{ formatMoney(details.salary.net, locale) }}</dd></div>
      </dl>

      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="card p-3"><p class="text-xs text-slate-500">{{ t('subtypes.annual') }}</p><p class="mt-1 font-bold">{{ details.balances.annual.remaining }}/{{ details.balances.annual.allowance }}</p></div>
        <div class="card p-3"><p class="text-xs text-slate-500">{{ t('subtypes.sick') }}</p><p class="mt-1 font-bold">{{ details.balances.sick.remaining }}/{{ details.balances.sick.allowance }}</p></div>
        <div class="card p-3"><p class="text-xs text-slate-500">{{ t('kinds.HOURLY_LEAVE') }}</p><p class="mt-1 font-bold">{{ details.balances.hourly.remaining }}/{{ details.balances.hourly.allowance }}</p></div>
      </div>

      <div class="card divide-y divide-slate-100 text-sm font-medium">
        <NuxtLink v-for="k in (['hourly-leave', 'vacation', 'advance'] as const)" :key="k" :to="`/requests/${k}?scope=team&userId=${details.user.id}`" class="flex items-center justify-between p-4 hover:bg-slate-50">
          {{ t(`kinds.${KIND_BY_SLUG[k]}_plural`) }}<AppIcon name="forward" :size="18" class="text-slate-300 rtl:rotate-180" />
        </NuxtLink>
        <NuxtLink v-if="perms.canRecordDeductions.value" :to="`/deductions/new?userId=${details.user.id}`" class="flex items-center justify-between p-4 text-rose-700 hover:bg-rose-50">
          {{ t('deductions.new') }}<AppIcon name="forward" :size="18" class="rtl:rotate-180" />
        </NuxtLink>
      </div>

      <EmployeeDocuments v-if="perms.canManage.value" :user-id="details.user.id" can-edit />

      <button v-if="canLoginAs" type="button" class="btn-primary w-full" :disabled="loggingInAs" @click="loginAs">
        <AppIcon name="user" :size="18" />{{ loggingInAs ? t('common.loading') : t('impersonate.button') }}
      </button>

      <button v-if="perms.canManage.value" type="button" class="btn-secondary w-full" @click="resetPassword">
        <AppIcon name="lock" :size="18" />{{ t('employees.resetPassword') }}
      </button>
    </template>

    <!-- Edit / add form (HR / IT) -->
    <form v-if="editing" class="card grid gap-4 p-5 sm:grid-cols-2" @submit.prevent="save">
      <div class="sm:col-span-2">
        <label class="label" for="name">{{ t('profile.name') }}</label>
        <input id="name" v-model="form.name" class="input" required>
      </div>
      <div>
        <label class="label" for="phone">{{ t('profile.phone') }}</label>
        <input id="phone" v-model="form.phone" class="input" type="tel" dir="ltr" placeholder="07XXXXXXXX" required>
      </div>
      <div>
        <label class="label" for="password">{{ t('employees.password') }}</label>
        <div class="relative">
          <input
            id="password"
            v-model="form.password"
            class="input pe-16"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            dir="ltr"
          >
          <button type="button" class="absolute inset-y-0 end-0 px-3 text-xs font-semibold text-brand-600" @click="showPassword = !showPassword">
            {{ showPassword ? t('login.hide') : t('login.show') }}
          </button>
        </div>
        <p class="mt-1.5 text-xs text-slate-500">
          {{ isNew ? t('employees.passwordHintNew') : t('employees.passwordHintEdit') }} {{ t('register.passwordRules') }}
        </p>
      </div>
      <label v-if="form.password" class="flex items-center gap-2 text-sm font-medium sm:col-span-2">
        <input v-model="form.mustChangePassword" type="checkbox" class="h-5 w-5 rounded accent-brand-600">
        {{ t('employees.mustChangePassword') }}
      </label>
      <div>
        <label class="label" for="email">{{ t('profile.email') }}</label>
        <input id="email" v-model="form.email" class="input" type="email" dir="ltr">
      </div>
      <div>
        <label class="label" for="position">{{ t('profile.position') }}</label>
        <input id="position" v-model="form.position" class="input">
      </div>
      <div>
        <label class="label" for="role">{{ t('employees.role') }}</label>
        <select id="role" v-model="form.role" class="input">
          <option v-for="r in lookups?.roles" :key="r.code" :value="r.code">{{ localName(r, locale) }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="department">{{ t('employees.department') }}</label>
        <select id="department" v-model="form.departmentId" class="input" @change="form.branchId = null">
          <option :value="null">—</option>
          <option v-for="d in lookups?.departments" :key="d.id" :value="d.id">{{ localName(d, locale) }}</option>
        </select>
      </div>
      <div v-if="department?.hasBranches">
        <label class="label" for="branch">{{ t('employees.branch') }}</label>
        <select id="branch" v-model="form.branchId" class="input">
          <option :value="null">{{ form.role === 'DIRECTOR' ? t('employees.allBranches') : '—' }}</option>
          <option v-for="b in department.branches" :key="b.id" :value="b.id">{{ localName(b, locale) }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="salary">{{ t('salary.base') }}</label>
        <input id="salary" v-model.number="form.baseSalary" class="input" type="number" min="0" step="0.001" required>
      </div>
      <div>
        <label class="label" for="hireDate">{{ t('profile.hireDate') }}</label>
        <input id="hireDate" v-model="form.hireDate" class="input" type="date">
      </div>
      <div>
        <label class="label" for="annual">{{ t('employees.annualOverride') }}</label>
        <input id="annual" v-model.number="form.annualLeaveDays" class="input" type="number" min="0" :placeholder="t('employees.useDefault')">
      </div>
      <div>
        <label class="label" for="sick">{{ t('employees.sickOverride') }}</label>
        <input id="sick" v-model.number="form.sickLeaveDays" class="input" type="number" min="0" :placeholder="t('employees.useDefault')">
      </div>
      <div class="sm:col-span-2">
        <span class="label">{{ t('employees.daysOff') }}</span>
        <label class="mb-2 flex items-center gap-2 text-sm">
          <input v-model="useCompanyDays" type="checkbox" class="h-5 w-5 rounded accent-brand-600">
          {{ t('employees.useCompanyDaysOff') }}
        </label>
        <div v-if="!useCompanyDays" class="flex flex-wrap gap-2">
          <button
            v-for="d in DAYS"
            :key="d"
            type="button"
            class="chip px-3 py-1.5 text-sm ring-1"
            :class="form.weekendDays?.includes(d) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300'"
            :aria-pressed="form.weekendDays?.includes(d) ?? false"
            @click="toggleDay(d)"
          >
            {{ t(`days.${d}`) }}
          </button>
        </div>
        <p class="mt-1.5 text-xs text-slate-500">{{ t('employees.daysOffHint') }}</p>
      </div>
      <label v-if="!isNew" class="flex items-center gap-2 text-sm font-medium sm:col-span-2">
        <input v-model="form.isActive" type="checkbox" class="h-5 w-5 rounded accent-brand-600">
        {{ t('employees.active') }}
      </label>
      <div class="flex gap-3 sm:col-span-2">
        <button type="submit" class="btn-primary flex-1" :disabled="saving">{{ saving ? t('common.loading') : t('common.save') }}</button>
        <button v-if="!isNew" type="button" class="btn-secondary" @click="editing = false; fillForm()">{{ t('common.cancel') }}</button>
      </div>
    </form>
  </div>
</template>
