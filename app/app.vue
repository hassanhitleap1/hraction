<script setup lang="ts">
const { locale, locales } = useI18n()

// <html lang dir> follows the selected language (Arabic = RTL, English = LTR)
const dir = computed(() => {
  const current = (locales.value as { code: string, dir?: string }[]).find(l => l.code === locale.value)
  return current?.dir ?? 'rtl'
})

useHead({
  htmlAttrs: { lang: locale, dir },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
