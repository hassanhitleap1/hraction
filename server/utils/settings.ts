import { prisma } from './prisma'
import { DEFAULT_SETTINGS, type HrSettings } from '#shared/business/types'

const toInt = (v: string | undefined, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** Reads the HR settings (falls back to the defaults for anything missing). */
export async function getSettings(): Promise<HrSettings> {
  const rows = await prisma.setting.findMany()
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    annualLeaveDays: toInt(map.annualLeaveDays, DEFAULT_SETTINGS.annualLeaveDays),
    sickLeaveDays: toInt(map.sickLeaveDays, DEFAULT_SETTINGS.sickLeaveDays),
    hourlyLeaveHoursPerMonth: toInt(map.hourlyLeaveHoursPerMonth, DEFAULT_SETTINGS.hourlyLeaveHoursPerMonth),
    weekendDays: map.weekendDays !== undefined
      ? map.weekendDays.split(',').filter(Boolean).map(Number).filter(d => d >= 0 && d <= 6)
      : DEFAULT_SETTINGS.weekendDays,
    maxAdvanceInstallments: Math.max(1, toInt(map.maxAdvanceInstallments, DEFAULT_SETTINGS.maxAdvanceInstallments)),
  }
}

export async function saveSettings(settings: HrSettings) {
  const entries: Record<string, string> = {
    annualLeaveDays: String(settings.annualLeaveDays),
    sickLeaveDays: String(settings.sickLeaveDays),
    hourlyLeaveHoursPerMonth: String(settings.hourlyLeaveHoursPerMonth),
    weekendDays: settings.weekendDays.join(','),
    maxAdvanceInstallments: String(settings.maxAdvanceInstallments),
  }
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
  )
}
