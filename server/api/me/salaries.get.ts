// Salary history of the logged-in user (generated monthly by HR).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const records = await prisma.salaryRecord.findMany({
    where: { userId: user.id },
    orderBy: { month: 'desc' },
    take: 24,
  })
  return records.map(r => ({
    month: r.month,
    baseSalary: Number(r.baseSalary),
    advances: Number(r.advances),
    deductions: Number(r.deductions),
    net: Number(r.net),
  }))
})
