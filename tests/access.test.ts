import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canCancel,
  canDecide,
  canRecordDeductionFor,
  canReviewDeduction,
  canViewPerson,
  decideRequest,
  directorsOf,
  initialDeductionStatus,
  initialRequestStatus,
} from '../shared/business/access.ts'
import type { OrgPerson } from '../shared/business/types.ts'

const MARKETING = 1
const RETAIL = 8
const MARKA = 4
const UNIVERSITY = 5

const ceo: OrgPerson = { id: 1, role: 'CEO', departmentId: null, branchId: null }
const hr: OrgPerson = { id: 2, role: 'HR', departmentId: 2, branchId: null }
const it: OrgPerson = { id: 3, role: 'IT', departmentId: null, branchId: null }
const mktDirector: OrgPerson = { id: 4, role: 'DIRECTOR', departmentId: MARKETING, branchId: null }
const mktEmployee: OrgPerson = { id: 5, role: 'EMPLOYEE', departmentId: MARKETING, branchId: null }
const retailDirector: OrgPerson = { id: 6, role: 'DIRECTOR', departmentId: RETAIL, branchId: null }
const markaEmployee: OrgPerson = { id: 7, role: 'EMPLOYEE', departmentId: RETAIL, branchId: MARKA }
const markaManager: OrgPerson = { id: 8, role: 'DIRECTOR', departmentId: RETAIL, branchId: MARKA }
const uniEmployee: OrgPerson = { id: 9, role: 'EMPLOYEE', departmentId: RETAIL, branchId: UNIVERSITY }

test('visibility: employee sees only himself', () => {
  assert.equal(canViewPerson(mktEmployee, mktEmployee), true)
  assert.equal(canViewPerson(mktEmployee, markaEmployee), false)
  assert.equal(canViewPerson(mktEmployee, mktDirector), false)
})

test('visibility: director sees only his department / branch', () => {
  assert.equal(canViewPerson(mktDirector, mktEmployee), true)
  assert.equal(canViewPerson(mktDirector, markaEmployee), false)
  assert.equal(canViewPerson(retailDirector, markaEmployee), true)
  assert.equal(canViewPerson(retailDirector, uniEmployee), true)
  assert.equal(canViewPerson(markaManager, markaEmployee), true)
  assert.equal(canViewPerson(markaManager, uniEmployee), false, 'branch manager limited to his branch')
})

test('visibility: HR, IT and CEO see everyone', () => {
  for (const actor of [hr, it, ceo]) {
    assert.equal(canViewPerson(actor, mktEmployee), true)
    assert.equal(canViewPerson(actor, uniEmployee), true)
  }
})

test('directorsOf finds the right approvers', () => {
  const all = [ceo, hr, it, mktDirector, retailDirector, markaManager]
  assert.deepEqual(directorsOf(mktEmployee, all).map(d => d.id), [4])
  assert.deepEqual(directorsOf(markaEmployee, all).map(d => d.id), [6, 8])
  assert.deepEqual(directorsOf(uniEmployee, all).map(d => d.id), [6])
  assert.deepEqual(directorsOf(mktDirector, all).map(d => d.id), [], 'a director is not his own approver')
})

test('initial status', () => {
  assert.equal(initialRequestStatus('EMPLOYEE', true), 'PENDING_DIRECTOR')
  assert.equal(initialRequestStatus('EMPLOYEE', false), 'PENDING_HR')
  assert.equal(initialRequestStatus('DIRECTOR', true), 'PENDING_HR')
  assert.equal(initialRequestStatus('HR', false), 'PENDING_HR')
})

test('workflow: director approves then HR approves', () => {
  const step1 = decideRequest({ actor: mktDirector, requester: mktEmployee, status: 'PENDING_DIRECTOR', decision: 'approve' })
  assert.deepEqual(step1, { ok: true, stage: 'director', status: 'PENDING_HR' })
  const step2 = decideRequest({ actor: hr, requester: mktEmployee, status: 'PENDING_HR', decision: 'approve' })
  assert.deepEqual(step2, { ok: true, stage: 'hr', status: 'APPROVED' })
})

test('workflow: director rejection is final', () => {
  const r = decideRequest({ actor: mktDirector, requester: mktEmployee, status: 'PENDING_DIRECTOR', decision: 'reject' })
  assert.deepEqual(r, { ok: true, stage: 'director', status: 'REJECTED' })
})

test('workflow: HR/IT can decide while still waiting for the director', () => {
  assert.deepEqual(
    decideRequest({ actor: it, requester: mktEmployee, status: 'PENDING_DIRECTOR', decision: 'reject' }),
    { ok: true, stage: 'hr', status: 'REJECTED' },
  )
})

test('workflow: forbidden cases', () => {
  const d = (actor: OrgPerson, requester: OrgPerson, status: 'PENDING_DIRECTOR' | 'PENDING_HR' | 'APPROVED') =>
    decideRequest({ actor, requester, status, decision: 'approve' })
  assert.deepEqual(d(mktEmployee, mktEmployee, 'PENDING_DIRECTOR'), { ok: false, error: 'cannot_decide_own' })
  assert.deepEqual(d(hr, hr, 'PENDING_HR'), { ok: false, error: 'cannot_decide_own' })
  // The CEO has full access: he decides like HR (final)
  assert.deepEqual(d(ceo, mktEmployee, 'PENDING_HR'), { ok: true, stage: 'hr', status: 'APPROVED' })
  assert.deepEqual(d(ceo, mktEmployee, 'PENDING_DIRECTOR'), { ok: true, stage: 'hr', status: 'APPROVED' })
  assert.deepEqual(d(mktEmployee, markaEmployee, 'PENDING_DIRECTOR'), { ok: false, error: 'forbidden' })
  assert.deepEqual(d(mktDirector, markaEmployee, 'PENDING_DIRECTOR'), { ok: false, error: 'out_of_scope' })
  assert.deepEqual(d(mktDirector, mktEmployee, 'PENDING_HR'), { ok: false, error: 'forbidden' })
  assert.deepEqual(d(hr, mktEmployee, 'APPROVED'), { ok: false, error: 'not_pending' })
  assert.equal(canDecide(markaManager, uniEmployee, 'PENDING_DIRECTOR'), false)
  assert.equal(canDecide(markaManager, markaEmployee, 'PENDING_DIRECTOR'), true)
})

test('cancel only own pending requests', () => {
  assert.equal(canCancel(mktEmployee, 5, 'PENDING_DIRECTOR'), true)
  assert.equal(canCancel(mktEmployee, 5, 'PENDING_HR'), true)
  assert.equal(canCancel(mktEmployee, 5, 'APPROVED'), false)
  assert.equal(canCancel(mktDirector, 5, 'PENDING_DIRECTOR'), false)
})

test('deductions: who can record and how they start', () => {
  assert.equal(canRecordDeductionFor(mktDirector, mktEmployee), true)
  assert.equal(canRecordDeductionFor(mktDirector, markaEmployee), false)
  assert.equal(canRecordDeductionFor(mktEmployee, mktEmployee), false)
  assert.equal(canRecordDeductionFor(ceo, mktEmployee), true, 'the CEO has full access')
  assert.equal(canRecordDeductionFor(hr, uniEmployee), true)
  assert.equal(canRecordDeductionFor(hr, hr), false)
  assert.equal(initialDeductionStatus('DIRECTOR'), 'PENDING_HR')
  assert.equal(initialDeductionStatus('HR'), 'APPLIED')
  assert.equal(canReviewDeduction(hr, 5, 'PENDING_HR'), true)
  assert.equal(canReviewDeduction(mktDirector, 5, 'PENDING_HR'), false)
  assert.equal(canReviewDeduction(hr, 2, 'PENDING_HR'), false)
})
