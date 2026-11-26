// Creates (or resets) a super user with role IT.
// Usage (on the server, in the app folder with DATABASE_URL set):
//   SUPER_PHONE=07XXXXXXXX SUPER_PASSWORD='...' SUPER_NAME='Name' npx tsx scripts/create-super-user.ts
import { PrismaClient } from '@prisma/client'
import { normalizePhone } from '../shared/business/phone'
import { hashPassword } from '../shared/business/password'

const prisma = new PrismaClient()

async function main() {
  const phone = normalizePhone(process.env.SUPER_PHONE)
  const password = process.env.SUPER_PASSWORD
  if (!phone) throw new Error('SUPER_PHONE is missing or not a valid Jordanian mobile number')
  if (!password || password.length < 8) throw new Error('SUPER_PASSWORD is missing or shorter than 8 characters')

  const passwordHash = await hashPassword(password)
  const name = process.env.SUPER_NAME || 'Super Admin'

  const user = await prisma.user.upsert({
    where: { phone },
    update: { passwordHash, role: 'IT', isActive: true, mustChangePassword: false },
    create: { phone, name, passwordHash, role: 'IT', position: 'Super Admin', mustChangePassword: false, isActive: true },
  })
  console.log(`Super user ready: id=${user.id} phone=${user.phone} role=${user.role}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
