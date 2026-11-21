// First login: new password + department (+ branch for Retail) + language. Shown only once.
import { z } from 'zod'
import { hashPassword, isStrongPassword } from '#shared/business/password'

const schema = z.object({
  newPassword: z.string().min(1).max(100),
  confirmPassword: z.string(),
  departmentId: z.number().int().positive().nullable().optional(),
  branchId: z.number().int().positive().nullable().optional(),
  locale: z.enum(['ar', 'en']),
})

export default defineEventHandler(async (event) => {
  await forbidWhileImpersonating(event)
  const user = await requireUser(event, { allowSetup: true })
  if (!user.mustChangePassword) fail(400, 'setup_already_done')

  const body = await parseBody(event, schema)
  if (body.newPassword !== body.confirmPassword) fail(400, 'passwords_do_not_match')
  if (!isStrongPassword(body.newPassword)) fail(400, 'weak_password')
  if (body.newPassword === user.phone) fail(400, 'password_same_as_phone')

  // Employees and directors must belong to a department; CEO / HR / IT may skip it
  const needsDepartment = user.role === 'EMPLOYEE' || user.role === 'DIRECTOR'
  let departmentId = body.departmentId ?? null
  let branchId: number | null = null

  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } })
    if (!department) fail(400, 'unknown_department')
    if (department.hasBranches) {
      if (!body.branchId) fail(400, 'branch_required')
      const branch = await prisma.branch.findFirst({ where: { id: body.branchId, departmentId } })
      if (!branch) fail(400, 'unknown_branch')
      branchId = branch.id
    }
  }
  else if (needsDepartment) {
    fail(400, 'department_required')
  }
  else {
    departmentId = null
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(body.newPassword),
      mustChangePassword: false,
      departmentId,
      branchId,
      locale: body.locale,
    },
  })

  await audit(user.id, 'setup_completed', 'user', user.id, { departmentId, branchId })
  await writeSession(event, updated)
  return { ok: true }
})
