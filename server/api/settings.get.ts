export default defineEventHandler(async (event) => {
  await requireRole(event, ['HR', 'IT', 'CEO'])
  return getSettings()
})
