// HR / IT change the leave allowances and rules.
import { z } from 'zod'

const schema = z.object({
  annualLeaveDays: z.number().int().min(0).max(365),
  sickLeaveDays: z.number().int().min(0).max(365),
  hourlyLeaveHoursPerMonth: z.number().int().min(0).max(744),
  weekendDays: z.array(z.number().int().min(0).max(6)).max(6),
  maxAdvanceInstallments: z.number().int().min(1).max(36),
})

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)
  const settings = await parseBody(event, schema)
  await saveSettings({ ...settings, weekendDays: [...new Set(settings.weekendDays)].sort() })
  await audit(actor.id, 'settings_updated', 'setting', null, settings)
  return getSettings()
})
