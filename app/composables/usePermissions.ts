import { canManage, canRecordDeductions, canViewAll, isApprover } from '#shared/business/access'

/** Role-based flags for showing / hiding UI. The server enforces the same rules. */
export function usePermissions() {
  const { user } = useUserSession()
  const role = computed(() => user.value?.role ?? 'EMPLOYEE')

  return {
    role,
    isEmployee: computed(() => role.value === 'EMPLOYEE'),
    isDirector: computed(() => role.value === 'DIRECTOR'),
    isCeo: computed(() => role.value === 'CEO'),
    canViewAll: computed(() => canViewAll(role.value)),
    canManage: computed(() => canManage(role.value)),
    isApprover: computed(() => isApprover(role.value)),
    canRecordDeductions: computed(() => canRecordDeductions(role.value)),
    /** Can see other people (team / everyone) */
    hasTeam: computed(() => role.value !== 'EMPLOYEE'),
  }
}
