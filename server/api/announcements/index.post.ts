// HR / IT publish an announcement (تعميم) to everyone or to one department, with an optional PDF.
// Multipart form: title, body, departmentId (optional), attachment (optional PDF, max 10 MB).
// Every active employee in the audience gets a notification.
import { announcementsDir, MAX_PDF_SIZE } from '~~/server/utils/announcements'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const actor = await requireManager(event)

  const form = (await readMultipartFormData(event)) ?? []
  const field = (name: string) => form.find(f => f.name === name && !f.filename)?.data.toString('utf8')
  const parsed = schema.safeParse({
    title: field('title'),
    body: field('body'),
    departmentId: field('departmentId') || null,
  })
  if (!parsed.success) fail(400, 'validation_error', { issues: parsed.error.issues })
  const input = parsed.data

  const departmentId = input.departmentId ?? null
  if (departmentId && !(await prisma.department.findUnique({ where: { id: departmentId } }))) fail(400, 'unknown_department')

  // Optional PDF — checked by its content (%PDF header), not only by the browser's type
  const pdf = form.find(f => f.name === 'attachment' && f.filename && f.data?.length)
  let attachmentFile: string | null = null
  if (pdf) {
    if (pdf.data.subarray(0, 5).toString('latin1') !== '%PDF-') fail(400, 'invalid_pdf')
    if (pdf.data.length > MAX_PDF_SIZE) fail(400, 'pdf_too_large')
    await mkdir(announcementsDir(), { recursive: true })
    attachmentFile = `${randomUUID()}.pdf`
    await writeFile(join(announcementsDir(), attachmentFile), pdf.data)
  }

  let announcement
  try {
    announcement = await prisma.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        departmentId,
        authorId: actor.id,
        attachmentFile,
        attachmentName: pdf ? (pdf.filename ?? 'document.pdf').slice(0, 255) : null,
      },
    })
  }
  catch (e) {
    if (attachmentFile) await unlink(join(announcementsDir(), attachmentFile)).catch(() => {})
    throw e
  }

  // The author has obviously read it
  await prisma.announcementRead.create({ data: { announcementId: announcement.id, userId: actor.id } })

  const audience = await prisma.user.findMany({
    where: { isActive: true, id: { not: actor.id }, ...(departmentId ? { departmentId } : {}) },
    select: { id: true },
  })
  await notify(
    audience.map(u => u.id),
    'announcement',
    { id: announcement.id, title: announcement.title, by: actor.name },
    `/announcements#a${announcement.id}`,
  )
  await audit(actor.id, 'announcement_created', 'announcement', announcement.id, {
    departmentId,
    recipients: audience.length,
    attachment: attachmentFile !== null,
  })

  return { id: announcement.id, recipients: audience.length }
})
