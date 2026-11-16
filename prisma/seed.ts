// Seeds departments, retail branches, default settings and one test account per role.
// Run: npm run db:seed
//
// Test accounts: password = phone number. They are created already set up
// (mustChangePassword = false) so you can log in right away. Set SEED_FORCE_SETUP=1
// to have them go through the first-login screen instead.

import { PrismaClient, type Role } from '@prisma/client'
import { DEPARTMENTS, RETAIL_BRANCHES } from '../shared/business/org'
import { hashPassword } from '../shared/business/password'
import { DEFAULT_SETTINGS } from '../shared/business/types'

const prisma = new PrismaClient()

async function main() {
  // Departments
  for (const [i, d] of DEPARTMENTS.entries()) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { nameAr: d.nameAr, nameEn: d.nameEn, hasBranches: !!d.hasBranches, sortOrder: i },
      create: { code: d.code, nameAr: d.nameAr, nameEn: d.nameEn, hasBranches: !!d.hasBranches, sortOrder: i },
    })
  }
  const departments = await prisma.department.findMany()
  const dept = (code: string) => departments.find(d => d.code === code)!

  // Retail branches
  for (const [i, b] of RETAIL_BRANCHES.entries()) {
    await prisma.branch.upsert({
      where: { code: b.code },
      update: { nameAr: b.nameAr, nameEn: b.nameEn, sortOrder: i, departmentId: dept('retail').id },
      create: { code: b.code, nameAr: b.nameAr, nameEn: b.nameEn, sortOrder: i, departmentId: dept('retail').id },
    })
  }
  const branches = await prisma.branch.findMany()
  const branch = (code: string) => branches.find(b => b.code === code)!

  // Settings (only created if missing — never overwrite what HR changed)
  const settings: Record<string, string> = {
    annualLeaveDays: String(DEFAULT_SETTINGS.annualLeaveDays),
    sickLeaveDays: String(DEFAULT_SETTINGS.sickLeaveDays),
    hourlyLeaveHoursPerMonth: String(DEFAULT_SETTINGS.hourlyLeaveHoursPerMonth),
    weekendDays: DEFAULT_SETTINGS.weekendDays.join(','),
    maxAdvanceInstallments: String(DEFAULT_SETTINGS.maxAdvanceInstallments),
  }
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } })
  }

  // Test accounts
  const forceSetup = process.env.SEED_FORCE_SETUP === '1'
  const users: {
    phone: string
    name: string
    role: Role
    position: string
    department?: string
    branch?: string
    salary: number
  }[] = [
    { phone: '0790000001', name: 'المدير التنفيذي', role: 'CEO', position: 'CEO', salary: 3000 },
    { phone: '0790000002', name: 'مسؤول الموارد البشرية', role: 'HR', position: 'Head of HR', department: 'hr', salary: 1200 },
    { phone: '0790000003', name: 'مسؤول تقنية المعلومات', role: 'IT', position: 'IT Manager', salary: 1100 },
    { phone: '0790000004', name: 'مدير التسويق', role: 'DIRECTOR', position: 'Marketing Director', department: 'marketing', salary: 1000 },
    { phone: '0790000005', name: 'موظف تسويق', role: 'EMPLOYEE', position: 'Designer', department: 'marketing', salary: 500 },
    { phone: '0790000006', name: 'مدير المعارض', role: 'DIRECTOR', position: 'Retail Director', department: 'retail', salary: 1000 },
    { phone: '0790000007', name: 'موظف إكسبرس ماركا', role: 'EMPLOYEE', position: 'Sales', department: 'retail', branch: 'express_marka', salary: 400 },
  ]

  for (const u of users) {
    const data = {
      name: u.name,
      role: u.role,
      position: u.position,
      departmentId: u.department ? dept(u.department).id : null,
      branchId: u.branch ? branch(u.branch).id : null,
      baseSalary: u.salary,
      hireDate: new Date(Date.UTC(2024, 0, 1)),
    }
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: data,
      create: {
        ...data,
        phone: u.phone,
        passwordHash: await hashPassword(u.phone),
        mustChangePassword: forceSetup,
      },
    })
  }

  console.log(`Seeded ${departments.length} departments, ${branches.length} branches, ${users.length} test users.`)
  console.table(users.map(u => ({ role: u.role, phone: u.phone, password: u.phone })))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
