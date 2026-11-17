<script setup lang="ts">
const { t, locale } = useI18n()
useHead({ title: () => t('nav.notifications') })

interface NotificationItem {
  id: number
  type: string
  data: Record<string, unknown> | null
  link: string | null
  read: boolean
  createdAt: string
}

const { data, refresh } = await useFetch<{ unread: number, items: NotificationItem[] }>('/api/notifications')

function text(n: NotificationItem) {
  const d = n.data ?? {}
  const kind = typeof d.kind === 'string' ? t(`kinds.${d.kind}`) : ''
  const amount = typeof d.amount === 'number' ? formatMoney(d.amount, locale.value) : ''
  return t(`notifications.types.${n.type}`, { ...d, kind, amount })
}

const ICONS: Record<string, { icon: string, color: string }> = {
  request_submitted: { icon: 'inbox', color: 'bg-sky-50 text-sky-600' },
  request_awaiting_hr: { icon: 'inbox', color: 'bg-sky-50 text-sky-600' },
  request_director_approved: { icon: 'check', color: 'bg-emerald-50 text-emerald-600' },
  request_approved: { icon: 'check', color: 'bg-emerald-50 text-emerald-600' },
  request_rejected: { icon: 'x', color: 'bg-rose-50 text-rose-600' },
  deduction_pending: { icon: 'deduction', color: 'bg-amber-50 text-amber-600' },
  deduction_applied: { icon: 'deduction', color: 'bg-rose-50 text-rose-600' },
  deduction_rejected: { icon: 'x', color: 'bg-slate-100 text-slate-600' },
  registration_pending: { icon: 'inbox', color: 'bg-sky-50 text-sky-600' },
}

async function open(n: NotificationItem) {
  if (!n.read) await $fetch('/api/notifications/read', { method: 'POST', body: { ids: [n.id] } })
  if (n.link) await navigateTo(n.link)
  else await refresh()
}

async function readAll() {
  await $fetch('/api/notifications/read', { method: 'POST', body: {} })
  await refresh()
  await refreshNuxtData('unread')
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <PageHeader :title="t('nav.notifications')" back="/">
      <template v-if="data?.unread" #actions>
        <button type="button" class="btn-ghost text-brand-700" @click="readAll">{{ t('notifications.readAll') }}</button>
      </template>
    </PageHeader>

    <EmptyState v-if="!data?.items.length" icon="bell" :text="t('notifications.empty')" />
    <div v-else class="card divide-y divide-slate-100">
      <button
        v-for="n in data.items"
        :key="n.id"
        type="button"
        class="flex w-full items-start gap-3 p-4 text-start hover:bg-slate-50"
        :class="{ 'bg-brand-50/50': !n.read }"
        @click="open(n)"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" :class="ICONS[n.type]?.color ?? 'bg-slate-100 text-slate-600'">
          <AppIcon :name="ICONS[n.type]?.icon ?? 'bell'" :size="20" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm" :class="n.read ? 'text-slate-600' : 'font-semibold text-slate-900'">{{ text(n) }}</span>
          <span v-if="n.data?.comment" class="mt-0.5 block text-xs text-slate-500">“{{ n.data.comment }}”</span>
          <span class="ltr-nums mt-1 block text-xs text-slate-400">{{ formatDateTime(n.createdAt) }}</span>
        </span>
        <span v-if="!n.read" class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent-500" />
      </button>
    </div>
  </div>
</template>
