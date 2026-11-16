// Lets Node's test runner resolve extension-less TypeScript imports (./phone → ./phone.ts),
// the same way Nuxt/Vite does, so the business logic can be tested without extra packages.
import { register } from 'node:module'

register('./resolve-ts.mjs', import.meta.url)
