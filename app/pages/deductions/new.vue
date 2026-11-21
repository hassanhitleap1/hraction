<script setup lang="ts">
// Record a deduction for an employee (directors: their team; HR / IT: anyone).
import type { EmployeeItem } from '~/composables/types'

definePageMeta({ roles: ['DIRECTOR', 'HR', 'IT', 'CEO'] })

const route = useRoute()
const { t, locale } = useI18n()
const perms = usePermissions()
const apiError = useApiError()
const { user } = useUserSession()
useHead({ title: () => t('deductions.new') })

const { data: employees } = await useFetch<EmployeeItem[]>('/api/employees')
const options = computed(() => (employees.value ?? []).filter(e => e.id !== user.value?.id))

const form = reactive({
  userId: route.query.userId ? Number(route.query.userId) : (null as number | null),
  amount: null as number | null,
  month: thisMonth(),
  reason: '',
})
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/deductions', {
      method: 'POST',
      body: { userId: form.userId, amount: Number(form.amount), month: form.month, reason: form.reason },
    })
    await navigateTo('/deductions?scope=team')
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
    <PageHeader :title="t('deductions.new')" back="/deductions?scope=team" />

    <form class="card space-y-4 p-5" @submit.prevent="submit">
      <AlertBox v-if="error">{{ error }}</AlertBox>
      <AlertBox v-if="!perms.canManage.value" type="info">{{ t('deductions.goesToHr') }}</AlertBox>

      <div>
        <label class="label" for="employee">{{ t('deductions.employee') }}</label>
        <select id="employee" v-model="form.userId" class="input" required>
          <option :value="null" disabled>{{ t('common.choose') }}</option>
          <option v-for="e in options" :key="e.id" :value="e.id">
            {{ e.name }}<template v-if="e.branch"> — {{ localName(e.branch, locale) }}</template><template v-else-if="e.department"> — {{ localName(e.department, locale) }}</template>
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="amount">{{ t('requests.amount') }}</label>
          <input id="amount" v-model.number="form.amount" type="number" inputmode="decimal" min="0.001" step="0.001" class="input" required>
        </div>
        <div>
          <label class="label" for="month">{{ t('deductions.month') }}</label>
          <input id="month" v-model="form.month" type="month" class="input" required>
        </div>
      </div>

      <div>
        <label class="label" for="reason">{{ t('requests.reason') }}</label>
        <textarea id="reason" v-model="form.reason" rows="3" maxlength="1000" class="input" required />
      </div>

      <button type="submit" class="btn-danger w-full" :disabled="loading">
        {{ loading ? t('common.loading') : t('deductions.save') }}
      </button>
    </form>
  </div>
</template>
