import type { Prisma } from '@prisma/client'
import { resolve } from 'node:path'
import { canManage } from '#shared/business/access'
import type { CurrentUser } from './auth'

/** Announcements a user may see: everyone's + his department's. HR / IT see all. */
export function visibleAnnouncementsWhere(user: CurrentUser): Prisma.AnnouncementWhereInput {
  if (canManage(user.role)) return {}
  return { OR: [{ departmentId: null }, ...(user.departmentId ? [{ departmentId: user.departmentId }] : [])] }
}

/** Folder holding announcement PDFs (outside the build output, like profile photos). */
export const announcementsDir = () => resolve(useRuntimeConfig().uploadDir, 'announcements')

export const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10 MB
