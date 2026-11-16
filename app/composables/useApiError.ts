// Turns an API error into a translated message (keys under `errors.*` in the locale files).
export function useApiError() {
  const { t, te } = useI18n()

  return (error: unknown): string => {
    const e = error as { data?: { data?: { code?: string, remaining?: number, max?: number }, statusMessage?: string }, statusCode?: number }
    const data = e?.data?.data
    const code = data?.code ?? e?.data?.statusMessage
    if (code && te(`errors.${code}`)) return t(`errors.${code}`, { remaining: data?.remaining, max: data?.max })
    if (e?.statusCode === 401) return t('errors.unauthorized')
    return t('errors.generic')
  }
}
