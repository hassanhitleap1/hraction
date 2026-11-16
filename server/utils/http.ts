import { createError, getQuery, getRouterParam, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { ZodTypeAny, z } from 'zod'

/**
 * Throws an HTTP error with a machine-readable code.
 * The client translates it with the i18n key `errors.<code>`.
 */
export function fail(statusCode: number, code: string, extra?: Record<string, unknown>): never {
  throw createError({ statusCode, statusMessage: code, data: { code, ...extra } })
}

/** Reads and validates the JSON body with a zod schema. */
export async function parseBody<T extends ZodTypeAny>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const body = await readBody(event).catch(() => ({}))
  const result = schema.safeParse(body ?? {})
  if (!result.success) fail(400, 'validation_error', { issues: result.error.issues })
  return result.data
}

/** Reads and validates the query string with a zod schema. */
export function parseQuery<T extends ZodTypeAny>(event: H3Event, schema: T): z.infer<T> {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) fail(400, 'validation_error', { issues: result.error.issues })
  return result.data
}

/** Reads a numeric route param such as /api/requests/:id */
export function idParam(event: H3Event, name = 'id'): number {
  const id = Number(getRouterParam(event, name))
  if (!Number.isInteger(id) || id <= 0) fail(400, 'invalid_id')
  return id
}
