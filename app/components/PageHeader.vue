<script setup lang="ts">
defineProps<{ title: string, subtitle?: string, back?: string }>()
</script>

<template>
  <div class="mb-5 flex items-center gap-3">
    <NuxtLink
      v-if="back"
      :to="back"
      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      :aria-label="$t('common.back')"
    >
      <AppIcon name="back" class="rtl:rotate-180" />
    </NuxtLink>
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-xl font-bold text-slate-900">{{ title }}</h1>
      <p v-if="subtitle" class="mt-0.5 text-sm text-slate-500">{{ subtitle }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>
