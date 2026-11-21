// Shape of the logged-in user stored in the encrypted session cookie (nuxt-auth-utils).
declare module '#auth-utils' {
  interface User {
    id: number
    name: string
    role: 'EMPLOYEE' | 'DIRECTOR' | 'HR' | 'IT' | 'CEO'
    mustChangePassword: boolean
    locale: string
    photoUrl: string | null
  }

  interface UserSession {
    /** Set while HR / IT are logged in as another user ("log in as"). The real account behind the session. */
    impersonator?: { id: number, name: string }
  }
}

export {}
