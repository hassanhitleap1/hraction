// HR / IT upload the employees Excel sheet (multipart: file=<xlsx>, update=true|false).
// New phone numbers → new users (password = phone number, must change it at first login).
import ExcelJS from 'exceljs'
import { parseUserRows } from '#shared/business/importUsers'
import { hashPassword } from '#shared/business/password'

const MAX_SIZE = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === 'file')
  const update = form?.find(f => f.name === 'update')?.data.toString() === 'true'

  if (!file?.data?.length) fail(400, 'file_required')
  if (file.data.length > MAX_SIZE) fail(400, 'file_too_large')
  if (!file.filename?.toLowerCase().endsWith('.xlsx')) fail(400, 'invalid_file_type')

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(file.data as unknown as Parameters<typeof workbook.xlsx.load>[0])
  }
  catch {
    fail(400, 'invalid_file_type')
  }
  const sheet = workbook.worksheets[0]
  if (!sheet) fail(400, 'empty_file')

  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: false }, row => rows.push((row.values as unknown[]).slice(1)))

  const [departments, branches] = await Promise.all([prisma.department.findMany(), prisma.branch.findMany()])
  const parsed = parseUserRows(rows, departments, branches)
  if (parsed.missingColumns.length) fail(400, 'missing_columns', { columns: parsed.missingColumns })

  let created = 0
  let updated = 0
  const skipped: { row: number, phone: string }[] = []

  for (const u of parsed.users) {
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
    const existing = await prisma.user.findUnique({ where: { phone: u.phone } })
    if (existing) {
      if (update) {
        await prisma.user.update({ where: { id: existing.id }, data })
        updated++
      }
      else skipped.push({ row: u.row, phone: u.phone })
      continue
    }
    await prisma.user.create({
      data: { ...data, phone: u.phone, passwordHash: await hashPassword(u.phone), mustChangePassword: true },
    })
    created++
  }

  await audit(actor.id, 'users_imported', 'user', null, { file: file.filename ?? null, created, updated, skipped: skipped.length })
  return { created, updated, skipped, errors: parsed.errors, warnings: parsed.warnings }
})
