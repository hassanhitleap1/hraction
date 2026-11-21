// Detects the real type of an uploaded file from its first bytes (not from the browser or the name),
// so a renamed .exe can't be uploaded as a "PDF".

export interface FileKind {
  ext: string
  mime: string
  /** true = open in the browser (PDF / images); false = download (Word / Excel) */
  inline: boolean
}

const startsWith = (data: Uint8Array, bytes: number[], offset = 0) =>
  data.length >= offset + bytes.length && bytes.every((b, i) => data[offset + i] === b)

const ascii = (s: string) => [...s].map(c => c.charCodeAt(0))

export const ALLOWED_DOCUMENT_TYPES = 'PDF, JPG, PNG, WEBP, DOCX, XLSX'

export function detectDocumentType(data: Uint8Array, fileName: string): FileKind | null {
  const name = fileName.toLowerCase()
  if (startsWith(data, ascii('%PDF-'))) return { ext: 'pdf', mime: 'application/pdf', inline: true }
  if (startsWith(data, [0xFF, 0xD8, 0xFF])) return { ext: 'jpg', mime: 'image/jpeg', inline: true }
  if (startsWith(data, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return { ext: 'png', mime: 'image/png', inline: true }
  if (startsWith(data, ascii('RIFF')) && startsWith(data, ascii('WEBP'), 8)) return { ext: 'webp', mime: 'image/webp', inline: true }
  // Word / Excel are ZIP files: trust the extension only when the content really is a ZIP
  if (startsWith(data, [0x50, 0x4B, 0x03, 0x04])) {
    if (name.endsWith('.docx')) return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', inline: false }
    if (name.endsWith('.xlsx')) return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', inline: false }
  }
  return null
}
