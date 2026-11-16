// Serves uploaded files (profile photos) to logged-in users only.
import { readFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const path = getRouterParam(event, 'path') ?? ''
  const [folder, file] = path.split('/')
  // Only /uploads/photos/<file> — never allow "../"
  if (folder !== 'photos' || !file || basename(file) !== file) fail(404, 'not_found')

  const type = MIME[extname(file).toLowerCase()]
  if (!type) fail(404, 'not_found')

  try {
    const data = await readFile(join(resolve(useRuntimeConfig().uploadDir), 'photos', file))
    setHeader(event, 'Content-Type', type)
    setHeader(event, 'Cache-Control', 'private, max-age=86400')
    return data
  }
  catch {
    fail(404, 'not_found')
  }
})
