import type { Role } from '#shared/business/types'

declare module '#app' {
  interface PageMeta {
    /** Only these roles can open the page */
    roles?: Role[]
  }
}

export {}
