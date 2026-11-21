<script setup lang="ts">
// "My documents" (ملحقاتي): the files HR / IT attached to my file. Each employee sees only his own.
const { t } = useI18n()
const { user } = useUserSession()
useHead({ title: () => t('documents.mine') })
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="t('documents.mine')" :subtitle="t('documents.mineHint')" back="/" />
    <EmployeeDocuments v-if="user" :user-id="user.id" />
  </div>
</template>
