// Public self-registration. Creates an EMPLOYEE account that stays inactive until HR / IT approves it
// (HR activates it from the Employees page). Role, salary and hire date are never taken from the client.
import { z } from 'zod'
import { normalizePhone } from '#shared/business/phone'
import { hashPassword, isStrongPassword } from '#shared/business/password'

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().min(1),
  password: z.string().min(1).max(100),
  confirmPassword: z.string(),
  departmentId: z.number().int().positive(),
  branchId: z.number().int().positive().nullable().optional(),
  locale: z.enum(['ar', 'en']).default('ar'),
})

export default defineEventHandler(async (event) => {
  const body = await parseBody(event, schema)

  const phone = normalizePhone(body.phone)
  if (!phone) fail(400, 'invalid_phone')
  if (body.password !== body.confirmPassword) fail(400, 'passwords_do_not_match')
  if (!isStrongPassword(body.password)) fail(400, 'weak_password')
  if (body.password === phone) fail(400, 'password_same_as_phone')

  const department = await prisma.department.findUnique({ where: { id: body.departmentId } })
  if (!department) fail(400, 'unknown_department')
  let branchId: number | null = null
  if (department.hasBranches) {
    if (!body.branchId) fail(400, 'branch_required')
    const branch = await prisma.branch.findFirst({ where: { id: body.branchId, departmentId: department.id } })
    if (!branch) fail(400, 'unknown_branch')
    branchId = branch.id
  }

  if (await prisma.user.findUnique({ where: { phone } })) fail(409, 'phone_already_registered')

  const user = await prisma.user.create({
    data: {
      name: body.name,
      phone,
      passwordHash: await hashPassword(body.password),
      role: 'EMPLOYEE',
      departmentId: department.id,
      branchId,
      locale: body.locale,
      mustChangePassword: false,
      isActive: false,
    },
  })

  await audit(null, 'self_registered', 'user', user.id, { phone })
  await notify(await hrUserIds(), 'registration_pending', { name: user.name }, `/employees/${user.id}`)
  return { ok: true }
})
