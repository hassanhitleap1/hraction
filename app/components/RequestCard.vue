<script setup lang="ts">
import type { RequestItem } from '~/composables/types'

defineProps<{ request: RequestItem, showUser?: boolean }>()
const { t, locale } = useI18n()
</script>

<template>
  <NuxtLink :to="`/request/${request.id}`" class="card block p-4 transition hover:ring-brand-300">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <UserAvatar v-if="showUser" :name="request.user.name" :src="request.user.photoUrl" :size="38" />
        <div class="min-w-0">
          <p v-if="showUser" class="truncate font-semibold text-slate-900">{{ request.user.name }}</p>
          <p class="text-sm font-semibold" :class="showUser ? 'text-slate-500' : 'text-slate-900'">
            {{ t(`kinds.${request.kind}`) }}<template v-if="request.subtype"> · {{ t(`subtypes.${request.subtype}`) }}</template>
          </p>
        </div>
      </div>
      <StatusBadge :status="request.status" />
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
      <template v-if="request.kind === 'HOURLY_LEAVE'">
        <span class="ltr-nums">{{ formatDate(request.date) }}</span>
        <span class="ltr-nums">{{ request.fromTime }} – {{ request.toTime }}</span>
        <span>{{ t('requests.hoursCount', { n: request.hours }) }}</span>
      </template>
      <template v-else-if="request.kind === 'VACATION'">
        <span class="ltr-nums">{{ formatDate(request.startDate) }} → {{ formatDate(request.endDate) }}</span>
        <span>{{ t('requests.daysCount', { n: request.days }) }}</span>
      </template>
      <template v-else>
        <span class="font-semibold text-slate-800">{{ formatMoney(request.amount, locale) }}</span>
        <span>{{ t('requests.installmentsCount', { n: request.installments }) }}</span>
      </template>
    </div>

    <p v-if="request.reason" class="mt-2 line-clamp-2 text-sm text-slate-500">{{ request.reason }}</p>
  </NuxtLink>
</template>
