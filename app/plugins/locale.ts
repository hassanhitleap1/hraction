import type { Ref } from 'vue'

// Apply the language saved on the user's profile when the app starts.
export default defineNuxtPlugin(async (nuxtApp) => {
  const { user } = useUserSession()
  const i18n = nuxtApp.$i18n as { locale: Ref<string>, setLocale: (l: 'ar' | 'en') => Promise<void> }
  const saved = user.value?.locale
  if ((saved === 'ar' || saved === 'en') && saved !== i18n.locale.value) {
    await i18n.setLocale(saved)
  }
})
