// HR / IT add an employee.
// Password: the one typed by HR / IT (with an optional "must change at first login"),
// or, when left empty, the phone number (must be changed at first login).
import { passwordData } from '~~/server/utils/employeeInput'
import { hashPassword } from '#shared/business/password'

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const input = await parseBody(event, employeeSchema)
  const data = await toEmployeeData(input)

  const user = await prisma.user.create({
    data: {
      ...data,
      passwordHash: await hashPassword(data.phone),
      mustChangePassword: true,
      ...(await passwordData(input, data.phone)),
    },
    include: { department: true, branch: true },
  })
  await audit(actor.id, 'employee_created', 'user', user.id, { phone: user.phone, role: user.role })
  return serializeUser(user)
})
