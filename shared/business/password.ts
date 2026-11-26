// Password hashing with Node's built-in scrypt (no native dependency).
// Format: scrypt$N$r$p$saltBase64$hashBase64
// SERVER ONLY — never import this file from app/ (browser) code.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import type { ScryptOptions } from 'node:crypto'

const KEY_LENGTH = 64
const COST = 16384
const BLOCK_SIZE = 8
const PARALLELIZATION = 1

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEY_LENGTH, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION })
  return ['scrypt', COST, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, hashB64] = parts
  const expected = Buffer.from(hashB64!, 'base64')
  const key = await scrypt(password, Buffer.from(saltB64!, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** Password rule: simple passwords are allowed — just at least 4 characters (no letter/number/case requirements). */
export const MIN_PASSWORD_LENGTH = 4

export function isStrongPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}
