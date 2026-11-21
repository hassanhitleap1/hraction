import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectDocumentType } from '../shared/business/files.ts'

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap(p => (typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p)))

test('detectDocumentType recognises allowed files by content', () => {
  assert.equal(detectDocumentType(bytes('%PDF-1.7 ...'), 'x.pdf')?.ext, 'pdf')
  assert.equal(detectDocumentType(bytes([0xFF, 0xD8, 0xFF, 0xE0]), 'photo.jpeg')?.ext, 'jpg')
  assert.equal(detectDocumentType(bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), 'a.png')?.ext, 'png')
  assert.equal(detectDocumentType(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '), 'a.webp')?.ext, 'webp')
  assert.equal(detectDocumentType(bytes([0x50, 0x4B, 0x03, 0x04]), 'Contract.DOCX')?.ext, 'docx')
  assert.equal(detectDocumentType(bytes([0x50, 0x4B, 0x03, 0x04]), 'salaries.xlsx')?.inline, false)
})

test('detectDocumentType rejects everything else, whatever the name says', () => {
  assert.equal(detectDocumentType(bytes('MZ\x90\x00'), 'contract.pdf'), null) // renamed .exe
  assert.equal(detectDocumentType(bytes([0x50, 0x4B, 0x03, 0x04]), 'archive.zip'), null)
  assert.equal(detectDocumentType(bytes('<html>'), 'page.pdf'), null)
  assert.equal(detectDocumentType(new Uint8Array(), 'empty.pdf'), null)
})
