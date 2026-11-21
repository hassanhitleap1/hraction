// Submit a new hourly leave (مغادرة), vacation (إجازة) or salary advance (سلفة).
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { directorsOf, initialRequestStatus } from '#shared/business/access'
import { checkBalance, countVacationDays, effectiveWeekendDays, hoursBetween, isValidTime, parseDateOnly } from '#shared/business/calc'

const reason = z.string().trim().max(1000).optional().nullable()
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const schema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('HOURLY_LEAVE'),
    subtype: z.enum(['personal', 'work']),
    date: dateStr,
    fromTime: z.string().refine(isValidTime),
    toTime: z.string().refine(isValidTime),
    reason,
  }),
  z.object({
    kind: z.literal('VACATION'),
    subtype: z.enum(['annual', 'sick']),
    startDate: dateStr,
    endDate: dateStr,
    reason,
  }),
  z.object({
    kind: z.literal('ADVANCE'),
    amount: z.number().positive().max(1_000_000),
    installments: z.number().int().min(1).default(1),
    reason,
  }),
])

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await parseBody(event, schema)
  const settings = await getSettings()

  // Kind-specific columns, filled below
  let fields: Omit<Prisma.RequestUncheckedCreateInput, 'kind' | 'userId' | 'status' | 'reason'> = {}

  if (body.kind === 'HOURLY_LEAVE') {
    const date = parseDateOnly(body.date)
    if (!date) fail(400, 'invalid_date')
    const hours = hoursBetween(body.fromTime, body.toTime)
    if (hours <= 0) fail(400, 'invalid_time_range')

    const balances = await getBalances(user, settings, date)
    const check = checkBalance(balances.hourly.allowance, balances.hourly.used, hours)
    if (!check.ok) fail(400, 'insufficient_hourly_balance', { remaining: check.remaining })

    fields = { subtype: body.subtype, date, fromTime: body.fromTime, toTime: body.toTime, hours }
  }

  if (body.kind === 'VACATION') {
    const start = parseDateOnly(body.startDate)
    const end = parseDateOnly(body.endDate)
    if (!start || !end) fail(400, 'invalid_date')
    if (end < start) fail(400, 'end_before_start')
    if (start.getUTCFullYear() !== end.getUTCFullYear()) fail(400, 'vacation_must_be_same_year')

    // His own days off if HR set them, otherwise the company's
    const days = countVacationDays(start, end, effectiveWeekendDays(user.weekendDays, settings.weekendDays))
    if (days <= 0) fail(400, 'no_working_days')

    const overlapping = await prisma.request.count({
      where: {
        userId: user.id,
        kind: 'VACATION',
        status: { in: [...COUNTING_STATUSES] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    })
    if (overlapping) fail(400, 'overlapping_vacation')

    const balances = await getBalances(user, settings, start)
    const b = body.subtype === 'annual' ? balances.annual : balances.sick
    const check = checkBalance(b.allowance, b.used, days)
    if (!check.ok) fail(400, 'insufficient_vacation_balance', { remaining: check.remaining })

    fields = { subtype: body.subtype, startDate: start, endDate: end, days }
  }

  if (body.kind === 'ADVANCE') {
    const salary = Number(user.baseSalary)
    if (salary > 0 && body.amount > salary) fail(400, 'advance_exceeds_salary', { max: salary })
    if (body.installments > settings.maxAdvanceInstallments) {
      fail(400, 'too_many_installments', { max: settings.maxAdvanceInstallments })
    }
    const pending = await prisma.request.count({
      where: { userId: user.id, kind: 'ADVANCE', status: { in: ['PENDING_DIRECTOR', 'PENDING_HR'] } },
    })
    if (pending) fail(400, 'advance_already_pending')

    fields = { amount: body.amount, installments: body.installments }
  }

  // Who approves?
  const candidates = user.departmentId
    ? await prisma.user.findMany({ where: { role: 'DIRECTOR', isActive: true, departmentId: user.departmentId } })
    : []
  const directors = directorsOf(toOrgPerson(user), candidates)
  const status = initialRequestStatus(user.role, directors.length > 0)

  const request = await prisma.request.create({
    data: { ...fields, kind: body.kind, userId: user.id, reason: body.reason || null, status },
    include: requestInclude,
  })

  // Notify the director(s) and HR
  const payload = { requestId: request.id, kind: request.kind, name: user.name }
  const link = `/request/${request.id}`
  await notify([...directors.map(d => d.id), ...(await hrUserIds(user.id))], 'request_submitted', payload, link)
  await audit(user.id, 'request_submitted', 'request', request.id, { kind: request.kind, status })

  return serializeRequest(request, toOrgPerson(user))
})
