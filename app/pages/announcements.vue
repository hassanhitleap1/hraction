<script setup lang="ts">
// Announcements (تعاميم). Everyone reads them; HR / IT publish and delete.
import type { AnnouncementItem, AnnouncementsResponse, LookupsResponse } from '~/composables/types'

const { t, locale } = useI18n()
const perms = usePermissions()
const apiError = useApiError()
useHead({ title: () => t('announcements.title') })

const { data, refresh } = await useFetch<AnnouncementsResponse>('/api/announcements')
const items = computed(() => data.value?.items ?? [])

// Opening this page = reading what's on it: they leave the home page and their notifications are read.
// `fresh` keeps the "New" badge on them during this visit.
const fresh = ref(new Set<number>())
async function markRead() {
  const ids = items.value.filter(a => !a.read).map(a => a.id)
  if (!ids.length) return
  ids.forEach(id => fresh.value.add(id))
  await $fetch('/api/announcements/read', { method: 'POST', body: { ids } }).catch(() => {})
  await refreshNuxtData(['unread', 'home-announcements'])
}
onMounted(markRead)
watch(items, markRead)
const { data: lookups } = await useFetch<LookupsResponse>('/api/lookups', { immediate: perms.canManage.value })

const showForm = ref(false)
const form = reactive({ title: '', body: '', departmentId: null as number | null })
// Optional PDF attachment
const MAX_PDF_MB = 10
const pdf = ref<File | null>(null)
const pdfInput = ref<HTMLInputElement>()
function pickPdf(event: Event) {
  error.value = ''
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (file && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    error.value = t('errors.invalid_pdf')
    return clearPdf()
  }
  if (file && file.size > MAX_PDF_MB * 1024 * 1024) {
    error.value = t('errors.pdf_too_large')
    return clearPdf()
  }
  pdf.value = file
}
function clearPdf() {
  pdf.value = null
  if (pdfInput.value) pdfInput.value.value = ''
}
const fileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const error = ref('')
const message = ref('')
const saving = ref(false)

async function publish() {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    const body = new FormData()
    body.append('title', form.title)
    body.append('body', form.body)
    if (form.departmentId) body.append('departmentId', String(form.departmentId))
    if (pdf.value) body.append('attachment', pdf.value)
    const res = await $fetch<{ recipients: number }>('/api/announcements', { method: 'POST', body })
    Object.assign(form, { title: '', body: '', departmentId: null })
    clearPdf()
    showForm.value = false
    message.value = t('announcements.published', { n: res.recipients })
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    saving.value = false
  }
}

async function remove(a: AnnouncementItem) {
  if (!confirm(t('announcements.confirmDelete'))) return
  try {
    await $fetch(`/api/announcements/${a.id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e) {
    error.value = apiError(e)
  }
}

// Coming from a notification (/announcements#a12): highlight that announcement
const route = useRoute()
const highlighted = computed(() => Number(route.hash.replace('#a', '')) || null)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="t('announcements.title')" back="/">
      <template v-if="perms.canManage.value && !showForm" #actions>
        <button type="button" class="btn-primary" @click="showForm = true">
          <AppIcon name="plus" :size="18" />{{ t('announcements.new') }}
        </button>
      </template>
    </PageHeader>

    <AlertBox v-if="error" class="mb-4">{{ error }}</AlertBox>
    <AlertBox v-if="message" type="success" class="mb-4">{{ message }}</AlertBox>

    <!-- Publish (HR / IT) -->
    <form v-if="showForm" class="card mb-4 space-y-4 p-5" @submit.prevent="publish">
      <div>
        <label class="label" for="a-title">{{ t('announcements.subject') }}</label>
        <input id="a-title" v-model="form.title" class="input" maxlength="200" required>
      </div>
      <div>
        <label class="label" for="a-body">{{ t('announcements.body') }}</label>
        <textarea id="a-body" v-model="form.body" class="input min-h-36" maxlength="5000" required />
      </div>
      <div>
        <label class="label" for="a-dept">{{ t('announcements.audience') }}</label>
        <select id="a-dept" v-model="form.departmentId" class="input">
          <option :value="null">{{ t('announcements.everyone') }}</option>
          <option v-for="d in lookups?.departments" :key="d.id" :value="d.id">{{ localName(d, locale) }}</option>
        </select>
      </div>
      <div>
        <span class="label">{{ t('announcements.attachment') }}</span>
        <input ref="pdfInput" type="file" accept="application/pdf,.pdf" class="hidden" @change="pickPdf">
        <div v-if="pdf" class="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><AppIcon name="file" :size="20" /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-900" dir="auto">{{ pdf.name }}</p>
            <p class="ltr-nums text-xs text-slate-500">{{ fileSize(pdf.size) }}</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" :aria-label="t('announcements.removeAttachment')" @click="clearPdf">
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <button v-else type="button" class="btn-secondary w-full border-dashed" @click="pdfInput?.click()">
          <AppIcon name="paperclip" :size="18" />{{ t('announcements.addPdf') }}
        </button>
        <p class="mt-1.5 text-xs text-slate-500">{{ t('announcements.pdfHint', { max: MAX_PDF_MB }) }}</p>
      </div>
      <div class="flex gap-3">
        <button type="submit" class="btn-primary flex-1" :disabled="saving">
          <AppIcon name="megaphone" :size="18" />{{ saving ? t('common.loading') : t('announcements.publish') }}
        </button>
        <button type="button" class="btn-secondary" @click="showForm = false">{{ t('common.cancel') }}</button>
      </div>
    </form>

    <EmptyState v-if="!items.length" icon="megaphone" :text="t('announcements.empty')" />

    <div v-else class="space-y-3">
      <article
        v-for="a in items"
        :id="`a${a.id}`"
        :key="a.id"
        class="card scroll-mt-24 p-5"
        :class="highlighted === a.id ? 'ring-2 ring-violet-400' : ''"
      >
        <div class="mb-3 flex items-center gap-3">
          <UserAvatar :name="a.author.name" :src="a.author.photoUrl" :size="36" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-900">{{ a.author.name }}</p>
            <p class="text-xs text-slate-500">
              <span class="ltr-nums">{{ formatDateTime(a.createdAt) }}</span>
              · {{ a.department ? localName(a.department, locale) : t('announcements.everyone') }}
            </p>
          </div>
          <button
            v-if="perms.canManage.value"
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            :aria-label="t('announcements.delete')"
            @click="remove(a)"
          >
            <AppIcon name="trash" :size="18" />
          </button>
        </div>
        <h2 class="text-lg font-bold text-slate-900">
          <span v-if="fresh.has(a.id)" class="chip me-1 bg-violet-100 align-middle text-violet-700">{{ t('announcements.new_badge') }}</span>{{ a.title }}
        </h2>
        <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{{ a.body }}</p>
        <a
          v-if="a.attachment"
          :href="a.attachment.url"
          target="_blank"
          rel="noopener"
          class="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><AppIcon name="file" :size="20" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-slate-900" dir="auto">{{ a.attachment.name }}</span>
            <span class="block text-xs font-semibold text-brand-600">{{ t('announcements.openPdf') }}</span>
          </span>
          <AppIcon name="forward" :size="18" class="text-slate-300 rtl:rotate-180" />
        </a>
      </article>
    </div>
  </div>
</template>
