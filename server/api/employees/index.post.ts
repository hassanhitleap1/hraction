// HR / IT add an employee. Password = phone number, must be changed at first login.
import { hashPassword } from '#shared/business/password'

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const input = await parseBody(event, employeeSchema)
  const data = await toEmployeeData(input)

  const user = await prisma.user.create({
    data: { ...data, passwordHash: await hashPassword(data.phone), mustChangePassword: true },
    include: { department: true, branch: true },
  })
  await audit(actor.id, 'employee_created', 'user', user.id, { phone: user.phone, role: user.role })
  return serializeUser(user)
})
