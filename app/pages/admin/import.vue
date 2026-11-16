<script setup lang="ts">
// HR / IT: import employees from the Excel sheet. Password = phone number for new users.
definePageMeta({ roles: ['HR', 'IT'] })

const { t } = useI18n()
const apiError = useApiError()
useHead({ title: () => t('nav.import') })

interface Issue { row: number, code: string, value?: string }
interface ImportResult {
  created: number
  updated: number
  skipped: { row: number, phone: string }[]
  errors: Issue[]
  warnings: Issue[]
}

const file = ref<File | null>(null)
const update = ref(false)
const loading = ref(false)
const error = ref('')
const result = ref<ImportResult | null>(null)

function pick(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  result.value = null
}

async function upload() {
  if (!file.value) return
  error.value = ''
  loading.value = true
  const body = new FormData()
  body.append('file', file.value)
  body.append('update', String(update.value))
  try {
    result.value = await $fetch<ImportResult>('/api/admin/import-users', { method: 'POST', body })
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
  <div class="mx-auto max-w-2xl space-y-4">
    <PageHeader :title="t('nav.import')" back="/" />

    <div class="card space-y-4 p-5">
      <AlertBox type="info">
        <p>{{ t('import.help') }}</p>
        <p class="mt-1 text-xs">{{ t('import.columns') }}</p>
      </AlertBox>
      <AlertBox v-if="error">{{ error }}</AlertBox>

      <label class="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-400 hover:bg-brand-50/40">
        <AppIcon name="upload" :size="32" class="text-brand-500" />
        <span class="font-semibold text-slate-700">{{ file ? file.name : t('import.choose') }}</span>
        <span class="text-xs text-slate-500">.xlsx</span>
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden" @change="pick">
      </label>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="update" type="checkbox" class="h-5 w-5 rounded accent-brand-600">
        {{ t('import.updateExisting') }}
      </label>

      <button type="button" class="btn-primary w-full" :disabled="!file || loading" @click="upload">
        {{ loading ? t('common.loading') : t('import.start') }}
      </button>
    </div>

    <template v-if="result">
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="card p-4"><p class="text-2xl font-bold text-emerald-600">{{ result.created }}</p><p class="text-xs text-slate-500">{{ t('import.created') }}</p></div>
        <div class="card p-4"><p class="text-2xl font-bold text-sky-600">{{ result.updated }}</p><p class="text-xs text-slate-500">{{ t('import.updated') }}</p></div>
        <div class="card p-4"><p class="text-2xl font-bold text-slate-500">{{ result.skipped.length }}</p><p class="text-xs text-slate-500">{{ t('import.skipped') }}</p></div>
      </div>

      <div v-if="result.errors.length" class="card p-4">
        <h3 class="mb-2 font-bold text-rose-700">{{ t('import.errorsTitle') }}</h3>
        <ul class="space-y-1 text-sm">
          <li v-for="(e, i) in result.errors" :key="i">
            <span class="font-semibold">{{ t('import.row', { n: e.row }) }}:</span> {{ t(`import.issues.${e.code}`) }}
            <span v-if="e.value" class="ltr-nums text-slate-500">({{ e.value }})</span>
          </li>
        </ul>
      </div>

      <div v-if="result.warnings.length" class="card p-4">
        <h3 class="mb-2 font-bold text-amber-700">{{ t('import.warningsTitle') }}</h3>
        <ul class="space-y-1 text-sm">
          <li v-for="(w, i) in result.warnings" :key="i">
            <span class="font-semibold">{{ t('import.row', { n: w.row }) }}:</span> {{ t(`import.issues.${w.code}`) }}
            <span v-if="w.value" class="text-slate-500">({{ w.value }})</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
