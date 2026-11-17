import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['nuxt-auth-utils', '@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      title: 'HR Action',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0f4c5c' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'ar',
    locales: [
      { code: 'ar', language: 'ar-JO', dir: 'rtl', name: 'العربية', file: 'ar.json' },
      { code: 'en', language: 'en-US', dir: 'ltr', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'hr_locale',
      redirectOn: 'root',
      fallbackLocale: 'ar',
    },
  },

  runtimeConfig: {
    // Folder where uploaded profile photos are stored (outside the build output)
    uploadDir: './uploads',
    session: {
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  },
})
