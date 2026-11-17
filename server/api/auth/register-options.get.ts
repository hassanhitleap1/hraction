// Public: departments (with branches) for the registration form.
export default defineEventHandler(async () => {
  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { branches: { orderBy: { sortOrder: 'asc' } } },
  })
  return {
    departments: departments.map(d => ({
      ...serializeDepartment(d)!,
      branches: d.branches.map(b => serializeBranch(b)!),
    })),
  }
})
