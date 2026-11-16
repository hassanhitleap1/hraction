<script setup lang="ts">
// Leave allowances & rules. HR / IT edit; CEO views.
import type { HrSettings } from '#shared/business/types'

definePageMeta({ roles: ['HR', 'IT', 'CEO'] })

const { t } = useI18n()
const perms = usePermissions()
const apiError = useApiError()
useHead({ title: () => t('nav.settings') })

const { data } = await useFetch<HrSettings>('/api/settings')
const form = reactive<HrSettings>({
  annualLeaveDays: 14,
  sickLeaveDays: 14,
  hourlyLeaveHoursPerMonth: 8,
  weekendDays: [5],
  maxAdvanceInstallments: 6,
})
watchEffect(() => data.value && Object.assign(form, data.value, { weekendDays: [...data.value.weekendDays] }))

const DAYS = [6, 0, 1, 2, 3, 4, 5] // Saturday → Friday
const error = ref('')
const saved = ref(false)
const saving = ref(false)

function toggleDay(d: number) {
  form.weekendDays = form.weekendDays.includes(d) ? form.weekendDays.filter(x => x !== d) : [...form.weekendDays, d]
}

async function save() {
  error.value = ''
  saved.value = false
  saving.value = true
  try {
    data.value = await $fetch<HrSettings>('/api/settings', {
      method: 'PUT',
      body: {
        annualLeaveDays: Number(form.annualLeaveDays),
        sickLeaveDays: Number(form.sickLeaveDays),
        hourlyLeaveHoursPerMonth: Number(form.hourlyLeaveHoursPerMonth),
        weekendDays: form.weekendDays,
        maxAdvanceInstallments: Number(form.maxAdvanceInstallments),
      },
    })
    saved.value = true
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <PageHeader :title="t('nav.settings')" back="/" />

    <form class="card space-y-4 p-5" @submit.prevent="save">
      <AlertBox v-if="error">{{ error }}</AlertBox>
      <AlertBox v-if="saved" type="success">{{ t('common.saved') }}</AlertBox>

      <fieldset :disabled="!perms.canManage.value" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="annual">{{ t('settings.annualLeaveDays') }}</label>
            <input id="annual" v-model.number="form.annualLeaveDays" type="number" min="0" class="input" required>
          </div>
          <div>
            <label class="label" for="sick">{{ t('settings.sickLeaveDays') }}</label>
            <input id="sick" v-model.number="form.sickLeaveDays" type="number" min="0" class="input" required>
          </div>
          <div>
            <label class="label" for="hourly">{{ t('settings.hourlyLeaveHoursPerMonth') }}</label>
            <input id="hourly" v-model.number="form.hourlyLeaveHoursPerMonth" type="number" min="0" class="input" required>
          </div>
          <div>
            <label class="label" for="inst">{{ t('settings.maxAdvanceInstallments') }}</label>
            <input id="inst" v-model.number="form.maxAdvanceInstallments" type="number" min="1" max="36" class="input" required>
          </div>
        </div>

        <div>
          <span class="label">{{ t('settings.weekendDays') }}</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="d in DAYS"
              :key="d"
              type="button"
              class="chip px-3 py-1.5 text-sm ring-1"
              :class="form.weekendDays.includes(d) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300'"
              @click="toggleDay(d)"
            >
              {{ t(`days.${d}`) }}
            </button>
          </div>
          <p class="mt-1.5 text-xs text-slate-500">{{ t('settings.weekendHint') }}</p>
        </div>
      </fieldset>

      <button v-if="perms.canManage.value" type="submit" class="btn-primary w-full" :disabled="saving">{{ t('common.save') }}</button>
    </form>
  </div>
</template>
