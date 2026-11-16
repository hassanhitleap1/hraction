// Upload / replace the profile photo (multipart form, field name "photo").
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'

const MAX_SIZE = 3 * 1024 * 1024 // 3 MB
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === 'photo')

  if (!file || !file.data?.length) fail(400, 'photo_required')
  const ext = TYPES[file.type ?? '']
  if (!ext) fail(400, 'invalid_photo_type')
  if (file.data.length > MAX_SIZE) fail(400, 'photo_too_large')

  const dir = resolve(useRuntimeConfig().uploadDir, 'photos')
  await mkdir(dir, { recursive: true })
  const filename = `${user.id}-${randomUUID()}.${ext}`
  await writeFile(join(dir, filename), file.data)

  // Remove the previous photo
  if (user.photoUrl?.startsWith('/uploads/photos/')) {
    await unlink(join(dir, basename(user.photoUrl))).catch(() => {})
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { photoUrl: `/uploads/photos/${filename}` },
  })
  await writeSession(event, updated)
  return { photoUrl: updated.photoUrl }
})
