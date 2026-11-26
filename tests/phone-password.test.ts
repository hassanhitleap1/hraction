import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone } from '../shared/business/phone.ts'
import { hashPassword, isStrongPassword, verifyPassword } from '../shared/business/password.ts'

test('normalizePhone accepts the common Jordanian formats', () => {
  for (const input of ['0791234567', '791234567', '+962791234567', '00962791234567', '962 79 123 4567', '079-123-4567', '٠٧٩١٢٣٤٥٦٧', 791234567]) {
    assert.equal(normalizePhone(input), '0791234567', String(input))
  }
  assert.equal(normalizePhone('0771234567'), '0771234567')
  assert.equal(normalizePhone('0781234567'), '0781234567')
})

test('normalizePhone rejects invalid numbers', () => {
  for (const input of ['', null, undefined, '0761234567', '079123456', '07912345678', '065123456', 'abc']) {
    assert.equal(normalizePhone(input), null, String(input))
  }
})

test('password hash round-trip', async () => {
  const hash = await hashPassword('0791234567')
  assert.match(hash, /^scrypt\$/)
  assert.equal(await verifyPassword('0791234567', hash), true)
  assert.equal(await verifyPassword('0791234568', hash), false)
  assert.equal(await verifyPassword('x', 'not-a-hash'), false)
  assert.notEqual(await hashPassword('same'), await hashPassword('same'), 'salted')
})

test('simple passwords are accepted (minimum 4 characters only)', () => {
  assert.equal(isStrongPassword('1234'), true)
  assert.equal(isStrongPassword('abc12345'), true)
  assert.equal(isStrongPassword('12345678'), true)
  assert.equal(isStrongPassword('كلمة'), true)
  assert.equal(isStrongPassword('123'), false)
  assert.equal(isStrongPassword(''), false)
})
