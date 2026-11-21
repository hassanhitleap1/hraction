import { passwordData } from '~~/server/utils/employeeInput'
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
  // HR / IT change their own password from the profile page (it asks for the current one)
  if (id === actor.id && input.password) fail(400, 'use_profile_to_change_password')
  const password = await passwordData(input, data.phone)

  const user = await prisma.user.update({
    where: { id },
    data: { ...data, ...password },
    include: { department: true, branch: true },
  })

  const changes: Record<string, Prisma.InputJsonValue> = {}
  if (Number(existing.baseSalary) !== data.baseSalary) changes.baseSalary = { from: Number(existing.baseSalary), to: data.baseSalary }
  if (existing.role !== data.role) changes.role = { from: existing.role, to: data.role }
  if (existing.departmentId !== data.departmentId) changes.departmentId = { from: existing.departmentId, to: data.departmentId }
  if (existing.branchId !== data.branchId) changes.branchId = { from: existing.branchId, to: data.branchId }
  if ('weekendDays' in data && existing.weekendDays !== data.weekendDays) changes.weekendDays = { from: existing.weekendDays, to: data.weekendDays ?? null }
  if (password.passwordHash) changes.password = password.mustChangePassword ? 'set_must_change' : 'set' // never the password itself
  await audit(actor.id, 'employee_updated', 'user', id, changes)

  return serializeUser(user)
})
