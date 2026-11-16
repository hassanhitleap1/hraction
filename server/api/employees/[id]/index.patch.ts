import type { Prisma } from '@prisma/client'

// HR / IT edit an employee (salary, role, department, branch, balances, active…).
export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const id = idParam(event)
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) fail(404, 'not_found')

  const input = await parseBody(event, employeeSchema)
  const data = await toEmployeeData(input, id)
  if (id === actor.id && data.isActive === false) fail(400, 'cannot_disable_self')

  const user = await prisma.user.update({ where: { id }, data, include: { department: true, branch: true } })

  const changes: Record<string, Prisma.InputJsonValue> = {}
  if (Number(existing.baseSalary) !== data.baseSalary) changes.baseSalary = { from: Number(existing.baseSalary), to: data.baseSalary }
  if (existing.role !== data.role) changes.role = { from: existing.role, to: data.role }
  if (existing.departmentId !== data.departmentId) changes.departmentId = { from: existing.departmentId, to: data.departmentId }
  if (existing.branchId !== data.branchId) changes.branchId = { from: existing.branchId, to: data.branchId }
  await audit(actor.id, 'employee_updated', 'user', id, changes)

  return serializeUser(user)
})
