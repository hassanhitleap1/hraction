// Departments (with their branches) and roles, in Arabic and English.
import { ROLES } from '#shared/business/org'

export default defineEventHandler(async (event) => {
  await requireUser(event, { allowSetup: true })
  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { branches: { orderBy: { sortOrder: 'asc' } } },
  })
  return {
    departments: departments.map(d => ({
      ...serializeDepartment(d)!,
      branches: d.branches.map(b => serializeBranch(b)!),
    })),
    roles: ROLES,
    // Default yearly leave days (used to preview a new employee's balance)
    defaults: await getSettings().then(s => ({ annualLeaveDays: s.annualLeaveDays, sickLeaveDays: s.sickLeaveDays })),
  }
})
