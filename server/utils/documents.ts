import { resolve } from 'node:path'
import { z } from 'zod'
import type { EmployeeDocument } from '@prisma/client'
import { canManage } from '#shared/business/access'
import type { CurrentUser } from './auth'

/** Folder holding older file-based ملحقات (new ones are text). */
export const documentsDir = () => resolve(useRuntimeConfig().uploadDir, 'documents')

/** A ملحق written by HR / IT: title + text. */
export const documentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
})

/** Employee ملحقات: only the employee himself and HR / IT. */
export const canSeeDocumentsOf = (actor: CurrentUser, ownerId: number) =>
  actor.id === ownerId || canManage(actor.role)

export const serializeDocument = (d: EmployeeDocument & { uploadedBy?: { name: string } | null }) => ({
  id: d.id,
  title: d.title,
  body: d.body,
  createdAt: d.createdAt.toISOString(),
  updatedAt: d.updatedAt.toISOString(),
  uploadedBy: d.uploadedBy?.name ?? null,
  // Older ملحقات uploaded as files keep their protected link
  file: d.file ? { name: d.fileName ?? 'file', mimeType: d.mimeType ?? '', url: `/api/documents/${d.id}/file` } : null,
})
