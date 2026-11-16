<script setup lang="ts">
defineProps<{ icon?: string, text: string }>()
</script>

<template>
  <div class="card flex flex-col items-center gap-3 px-6 py-12 text-center text-slate-500">
    <span class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <AppIcon :name="icon ?? 'inbox'" :size="26" />
    </span>
    <p class="text-sm">{{ text }}</p>
    <slot />
  </div>
</template>
