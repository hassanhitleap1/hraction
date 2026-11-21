<script setup lang="ts">
// Action Group brand logos. The source files are 1600x1600 with a lot of
// transparent padding, so we crop to the artwork (x 300-1300, y 520-1100).
// The logos are white text, so always place them on a dark background.
import group from '~/assets/css/actiongroup.webp'
import express from '~/assets/css/actionexpress.webp'
import media from '~/assets/css/actionmedia.webp'
import mobile from '~/assets/css/actionmobile.webp'
import website from '~/assets/css/actionwebsite.webp'

type BrandName = 'group' | 'express' | 'media' | 'mobile' | 'website'

const props = defineProps<{ name: BrandName, alt?: string }>()

const SOURCES: Record<BrandName, string> = { group, express, media, mobile, website }
const src = computed(() => SOURCES[props.name])
</script>

<template>
  <div class="relative aspect-1000/580 w-full overflow-hidden">
    <img
      :src="src"
      :alt="alt ?? `Action ${name}`"
      class="pointer-events-none absolute max-w-none select-none"
      style="width: 160%; left: -30%; top: -89.66%;"
      draggable="false"
    >
  </div>
</template>
