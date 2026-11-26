// Response shapes of the API, used by the pages.

export interface NamedRef { id: number, code: string, nameAr: string, nameEn: string }

export interface UserSummary {
  id: number
  name: string
  photoUrl: string | null
  position: string | null
  department: NamedRef | null
  branch: NamedRef | null
}

export interface RequestItem {
  id: number
  kind: 'HOURLY_LEAVE' | 'VACATION' | 'ADVANCE'
  subtype: string | null
  status: 'PENDING_DIRECTOR' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  date: string | null
  fromTime: string | null
  toTime: string | null
  hours: number | null
  startDate: string | null
  endDate: string | null
  days: number | null
  amount: number | null
  installments: number | null
  reason: string | null
  user: UserSummary
  director: { id: number, name: string } | null
  directorDecision: string | null
  directorComment: string | null
  directorDecidedAt: string | null
  hr: { id: number, name: string } | null
  hrDecision: string | null
  hrComment: string | null
  hrDecidedAt: string | null
  createdAt: string
  canDecide: boolean
  canCancel: boolean
}

export interface DeductionItem {
  id: number
  amount: number
  month: string
  reason: string
  status: 'PENDING_HR' | 'APPLIED' | 'REJECTED'
  user: UserSummary
  createdBy: { id: number, name: string }
  reviewedBy: { id: number, name: string } | null
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
  canReview: boolean
}

export interface EmployeeItem {
  id: number
  name: string
  phone: string
  email: string | null
  position: string | null
  photoUrl: string | null
  role: 'EMPLOYEE' | 'DIRECTOR' | 'HR' | 'IT' | 'CEO'
  departmentId: number | null
  branchId: number | null
  department: (NamedRef & { hasBranches: boolean }) | null
  branch: (NamedRef & { departmentId: number }) | null
  baseSalary: number
  hireDate: string | null
  isActive: boolean
  mustChangePassword: boolean
  annualLeaveDays: number | null
  sickLeaveDays: number | null
  /** His own weekly days off (0 = Sunday … 6 = Saturday); null = the company setting */
  weekendDays: number[] | null
}

export interface LookupsResponse {
  departments: (NamedRef & { hasBranches: boolean, branches: (NamedRef & { departmentId: number })[] })[]
  roles: { code: EmployeeItem['role'], nameAr: string, nameEn: string }[]
  defaults: { annualLeaveDays: number, sickLeaveDays: number }
}

export interface AnnouncementItem {
  id: number
  title: string
  body: string
  createdAt: string
  author: { id: number, name: string, photoUrl: string | null }
  department: { id: number, nameAr: string, nameEn: string } | null
  /** Optional PDF, opened from `url` (protected: only people who can see the announcement) */
  attachment: { name: string, url: string } | null
  /** Has the current user read it? (read = gone from the home page) */
  read: boolean
}

export interface AnnouncementsResponse {
  /** Visible announcements the current user hasn't read yet */
  unread: number
  items: AnnouncementItem[]
}

export interface EmployeeDocumentItem {
  id: number
  title: string
  /** The ملحق text */
  body: string | null
  createdAt: string
  updatedAt: string
  uploadedBy: string | null
  /** Only older ملحقات that were uploaded as files (protected link) */
  file: { name: string, mimeType: string, url: string } | null
}
