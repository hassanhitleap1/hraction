<script setup lang="ts">
const props = withDefaults(defineProps<{ name?: string | null, src?: string | null, size?: number }>(), { size: 40 })

const initials = computed(() =>
  (props.name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join(''),
)
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size / 2.6)}px` }"
  >
    <img v-if="src" :src="src" :alt="name ?? ''" class="h-full w-full object-cover">
    <span v-else>{{ initials }}</span>
  </span>
</template>
