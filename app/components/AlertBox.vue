<script setup lang="ts">
withDefaults(defineProps<{ type?: 'error' | 'success' | 'info' }>(), { type: 'error' })
</script>

<template>
  <div
    role="alert"
    class="rounded-xl px-4 py-3 text-sm font-medium"
    :class="{
      'bg-rose-50 text-rose-700 ring-1 ring-rose-200': type === 'error',
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200': type === 'success',
      'bg-sky-50 text-sky-700 ring-1 ring-sky-200': type === 'info',
    }"
  >
    <slot />
  </div>
</template>
