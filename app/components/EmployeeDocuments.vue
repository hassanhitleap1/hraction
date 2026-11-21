<script setup lang="ts">
// ملحقات of one employee: written text (title + content).
// HR / IT (canEdit) add, edit and delete; the employee only reads his own.
import type { EmployeeDocumentItem } from '~/composables/types'

const props = defineProps<{ userId: number, canEdit?: boolean }>()

const { t } = useI18n()
const apiError = useApiError()
const route = useRoute()

const { data: docs, refresh } = await useFetch<EmployeeDocumentItem[]>(() => `/api/employees/${props.userId}/documents`, {
  key: `documents-${props.userId}`,
})

// Add / edit form (HR / IT). editingId = null → adding a new ملحق
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ title: '', body: '' })
const saving = ref(false)
const error = ref('')
const message = ref('')

function openNew() {
  Object.assign(form, { title: '', body: '' })
  editingId.value = null
  formOpen.value = true
  message.value = ''
}
function openEdit(d: EmployeeDocumentItem) {
  Object.assign(form, { title: d.title, body: d.body ?? '' })
  editingId.value = d.id
  formOpen.value = true
  message.value = ''
}
function closeForm() {
  formOpen.value = false
  editingId.value = null
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/documents/${editingId.value}`, { method: 'PATCH', body: form })
      message.value = t('common.saved')
    }
    else {
      await $fetch(`/api/employees/${props.userId}/documents`, { method: 'POST', body: form })
      message.value = t('documents.added')
    }
    closeForm()
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    saving.value = false
  }
}

async function remove(d: EmployeeDocumentItem) {
  if (!confirm(t('documents.confirmDelete', { title: d.title }))) return
  try {
    await $fetch(`/api/documents/${d.id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
}

// Coming from a notification (/documents#d12): highlight that ملحق
const highlighted = computed(() => Number(route.hash.replace('#d', '')) || null)
</script>

<template>
  <section class="card p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="flex items-center gap-2 font-bold text-slate-900">
        <AppIcon name="file" :size="20" class="text-brand-600" />{{ t('documents.title') }}
      </h2>
      <button v-if="canEdit && !formOpen" type="button" class="btn-secondary" @click="openNew">
        <AppIcon name="plus" :size="18" />{{ t('documents.add') }}
      </button>
    </div>

    <AlertBox v-if="error" class="mb-3">{{ error }}</AlertBox>
    <AlertBox v-if="message" type="success" class="mb-3">{{ message }}</AlertBox>

    <!-- Write / edit (HR / IT) -->
    <form v-if="canEdit && formOpen" class="mb-4 space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200" @submit.prevent="save">
      <div>
        <label class="label" for="doc-title">{{ t('documents.docTitle') }}</label>
        <input id="doc-title" v-model="form.title" class="input" maxlength="200" :placeholder="t('documents.titlePlaceholder')" required>
      </div>
      <div>
        <label class="label" for="doc-body">{{ t('documents.body') }}</label>
        <textarea id="doc-body" v-model="form.body" class="input min-h-48" maxlength="20000" :placeholder="t('documents.bodyPlaceholder')" required />
      </div>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary flex-1" :disabled="saving">
          {{ saving ? t('common.loading') : editingId ? t('common.save') : t('documents.save') }}
        </button>
        <button type="button" class="btn-secondary" :disabled="saving" @click="closeForm">{{ t('common.cancel') }}</button>
      </div>
    </form>

    <!-- List -->
    <p v-if="!docs?.length" class="py-6 text-center text-sm text-slate-500">{{ t('documents.empty') }}</p>
    <div v-else class="space-y-3">
      <article
        v-for="d in docs"
        :id="`d${d.id}`"
        :key="d.id"
        class="scroll-mt-24 rounded-xl p-4 ring-1 ring-slate-200"
        :class="highlighted === d.id ? 'ring-2 ring-brand-400' : ''"
      >
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <h3 class="font-bold text-slate-900">{{ d.title }}</h3>
            <p class="mt-0.5 text-xs text-slate-500">
              <span class="ltr-nums">{{ formatDate(d.createdAt) }}</span>
              <template v-if="d.uploadedBy"> · {{ d.uploadedBy }}</template>
              <template v-if="d.updatedAt.slice(0, 16) !== d.createdAt.slice(0, 16)"> · {{ t('documents.edited') }}</template>
            </p>
          </div>
          <template v-if="canEdit">
            <button type="button" class="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50" @click="openEdit(d)">
              {{ t('common.edit') }}
            </button>
            <button
              type="button"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              :aria-label="t('documents.delete')"
              @click="remove(d)"
            >
              <AppIcon name="trash" :size="18" />
            </button>
          </template>
        </div>
        <p v-if="d.body" class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700" dir="auto">{{ d.body }}</p>
        <!-- Older ملحقات that were uploaded as a file -->
        <a v-if="d.file" :href="d.file.url" target="_blank" rel="noopener" class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
          <AppIcon name="paperclip" :size="16" /><span dir="auto">{{ d.file.name }}</span>
        </a>
      </article>
    </div>
  </section>
</template>
