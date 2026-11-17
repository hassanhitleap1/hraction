// Applies pending Prisma migrations (used by `npm run build:hostinger`).
//
// If the database already has tables that were created earlier with
// `prisma db push` (no migration history), Prisma refuses with P3005.
// In that case we mark 0_init as already applied (baseline) and retry,
// so existing data is kept.
import { execSync } from 'node:child_process'

const run = (cmd) => execSync(cmd, { stdio: 'pipe', encoding: 'utf8' })

function deploy() {
  const out = run('npx prisma migrate deploy')
  process.stdout.write(out)
}

try {
  deploy()
} catch (err) {
  const text = `${err.stdout ?? ''}${err.stderr ?? ''}`
  if (!text.includes('P3005')) {
    process.stderr.write(text)
    process.exit(1)
  }
  console.log('Existing database without migration history: baselining 0_init...')
  process.stdout.write(run('npx prisma migrate resolve --applied 0_init'))
  deploy()
}
