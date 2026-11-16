import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseUserRows, parseSheetDate } from '../shared/business/importUsers.ts'

const departments = [
  { id: 1, code: 'marketing', nameAr: 'التسويق', nameEn: 'Marketing' },
  { id: 8, code: 'retail', nameAr: 'المعارض (التجزئة)', nameEn: 'Retail' },
]
const branches = [
  { id: 4, code: 'express_marka', nameAr: 'إكسبرس ماركا', nameEn: 'Express Marka', departmentId: 8 },
]

test('parses Arabic headers in any order and normalizes phones', () => {
  const rows = [
    ['رقم الهاتف', 'الاسم', 'القسم', 'الفرع', 'الراتب', 'تاريخ التعيين', 'المسمى الوظيفي'],
    ['+962791111111', 'أحمد علي', 'التسويق', null, '450', '01/03/2024', 'مصمم'],
    [792222222, { richText: [{ text: 'سارة ' }, { text: 'خالد' }] }, null, 'Express Marka', 380.5, new Date(2023, 5, 15), null],
    [null, null, null, null, null, null, null],
    ['0791111111', 'مكرر', null, null, null, null, null],
    ['12345', 'رقم خطأ', null, null, null, null, null],
    ['0793333333', null, null, null, null, null, null],
    ['0794444444', 'قسم غير معروف', 'Sales', null, null, 'yesterday', null],
  ]
  const r = parseUserRows(rows, departments, branches)

  assert.deepEqual(r.missingColumns, [])
  assert.equal(r.users.length, 3)

  const [ahmad, sara, unknown] = r.users
  assert.equal(ahmad!.phone, '0791111111')
  assert.equal(ahmad!.departmentId, 1)
  assert.equal(ahmad!.baseSalary, 450)
  assert.equal(ahmad!.hireDate?.toISOString().slice(0, 10), '2024-03-01')
  assert.equal(ahmad!.position, 'مصمم')
  assert.equal(ahmad!.role, 'EMPLOYEE')

  assert.equal(sara!.name, 'سارة خالد')
  assert.equal(sara!.phone, '0792222222')
  assert.equal(sara!.branchId, 4)
  assert.equal(sara!.departmentId, 8, 'department taken from the branch')
  assert.equal(sara!.hireDate?.toISOString().slice(0, 10), '2023-06-15')

  assert.equal(unknown!.departmentId, null)

  assert.deepEqual(r.errors.map(e => [e.row, e.code]), [
    [5, 'duplicate_in_sheet'],
    [6, 'invalid_phone'],
    [7, 'missing_name'],
  ])
  assert.deepEqual(r.warnings.map(e => [e.row, e.code]), [
    [8, 'unknown_department'],
    [8, 'invalid_date'],
  ])
})

test('reports missing required columns', () => {
  const r = parseUserRows([['Name', 'Email'], ['Ali', 'a@b.c']], departments, branches)
  assert.deepEqual(r.missingColumns, ['phone'])
  assert.equal(r.users.length, 0)
})

test('Excel serial dates', () => {
  assert.equal(parseSheetDate(45352)?.toISOString().slice(0, 10), '2024-03-01')
})
