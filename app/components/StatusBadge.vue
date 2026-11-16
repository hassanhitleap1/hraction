<script setup lang="ts">
const props = defineProps<{ status: string }>()
const { t } = useI18n()

const color = computed(() => {
  switch (props.status) {
    case 'APPROVED':
    case 'APPLIED':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
    default:
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  }
})
</script>

<template>
  <span class="chip" :class="color">{{ t(`status.${status}`) }}</span>
</template>
