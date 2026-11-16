// Imports employees from an Excel sheet.
// Usage:  npm run import:users -- ./employees.xlsx [--update]
//
//  - New phone numbers → new users, password = phone number, must change it on first login.
//  - Existing phone numbers are skipped, unless --update is passed (then name/position/department/
//    branch/salary/hire date/email are updated; the password is never touched).

import ExcelJS from 'exceljs'
import { PrismaClient } from '@prisma/client'
import { parseUserRows } from '../shared/business/importUsers'
import { hashPassword } from '../shared/business/password'

const prisma = new PrismaClient()

async function main() {
  const file = process.argv.slice(2).find(a => !a.startsWith('--'))
  const update = process.argv.includes('--update')
  if (!file) {
    console.error('Usage: npm run import:users -- <file.xlsx> [--update]')
    process.exit(1)
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(file)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('The workbook has no sheets')

  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // exceljs rows are 1-based; drop the empty index 0
    rows.push((row.values as unknown[]).slice(1))
  })

  const [departments, branches] = await Promise.all([prisma.department.findMany(), prisma.branch.findMany()])
  const parsed = parseUserRows(rows, departments, branches)

  if (parsed.missingColumns.length) {
    console.error(`Missing required columns: ${parsed.missingColumns.join(', ')}`)
    process.exit(1)
  }

  let created = 0
  let updated = 0
  let skipped = 0
  for (const u of parsed.users) {
    const existing = await prisma.user.findUnique({ where: { phone: u.phone } })
    const data = {
      name: u.name,
      position: u.position,
      email: u.email,
      departmentId: u.departmentId,
      branchId: u.branchId,
      baseSalary: u.baseSalary,
      hireDate: u.hireDate,
      role: u.role,
    }
    if (existing) {
      if (update) {
        await prisma.user.update({ where: { id: existing.id }, data })
        updated++
      }
      else skipped++
      continue
    }
    await prisma.user.create({
      data: { ...data, phone: u.phone, passwordHash: await hashPassword(u.phone), mustChangePassword: true },
    })
    created++
  }

  console.log(`Created: ${created}  Updated: ${updated}  Skipped (already exist): ${skipped}`)
  if (parsed.errors.length) {
    console.log('\nRows NOT imported:')
    console.table(parsed.errors)
  }
  if (parsed.warnings.length) {
    console.log('\nWarnings (row imported, field ignored):')
    console.table(parsed.warnings)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
