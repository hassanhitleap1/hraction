import { z } from 'zod'
import { normalizePhone } from '#shared/business/phone'
import { parseDateOnly } from '#shared/business/calc'
import { prisma } from './prisma'
import { fail } from './http'

/** Fields HR / IT can set on an employee. */
export const employeeSchema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().min(1),
  email: z.string().trim().email().max(150).nullable().optional().or(z.literal('')),
  position: z.string().trim().max(150).nullable().optional(),
  role: z.enum(['EMPLOYEE', 'DIRECTOR', 'HR', 'IT', 'CEO']),
  departmentId: z.number().int().positive().nullable().optional(),
  branchId: z.number().int().positive().nullable().optional(),
  baseSalary: z.number().min(0).max(1_000_000),
  hireDate: z.string().nullable().optional(), // YYYY-MM-DD
  isActive: z.boolean().optional(),
  annualLeaveDays: z.number().int().min(0).max(365).nullable().optional(),
  sickLeaveDays: z.number().int().min(0).max(365).nullable().optional(),
})

export type EmployeeInput = z.infer<typeof employeeSchema>

/** Validates the relations and converts the input to Prisma data. */
export async function toEmployeeData(input: EmployeeInput, currentId?: number) {
  const phone = normalizePhone(input.phone)
  if (!phone) fail(400, 'invalid_phone')

  const duplicate = await prisma.user.findFirst({ where: { phone, ...(currentId ? { id: { not: currentId } } : {}) } })
  if (duplicate) fail(400, 'phone_taken')

  let departmentId = input.departmentId ?? null
  let branchId = input.branchId ?? null
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } })
    if (!branch) fail(400, 'unknown_branch')
    if (departmentId && departmentId !== branch.departmentId) fail(400, 'branch_not_in_department')
    departmentId = branch.departmentId
  }
  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } })
    if (!department) fail(400, 'unknown_department')
    if (!department.hasBranches) branchId = null
  }

  let hireDate: Date | null = null
  if (input.hireDate) {
    hireDate = parseDateOnly(input.hireDate)
    if (!hireDate) fail(400, 'invalid_date')
  }

  return {
    name: input.name,
    phone,
    email: input.email || null,
    position: input.position || null,
    role: input.role,
    departmentId,
    branchId,
    baseSalary: input.baseSalary,
    hireDate,
    annualLeaveDays: input.annualLeaveDays ?? null,
    sickLeaveDays: input.sickLeaveDays ?? null,
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  }
}
