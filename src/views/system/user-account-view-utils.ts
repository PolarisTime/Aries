import { enabledStatusValues } from '@/constants/module-options'
import type { RoleOptionRecord } from '@/types/user-account'

export type UserAccountEditorMode = 'create' | 'edit'

export function getUserAccountStatusColor(value: string) {
  return value === enabledStatusValues[0] ? 'green' : 'red'
}

export function getUserAccountTotpColor(enabled: boolean) {
  return enabled ? 'processing' : 'default'
}

function normalizeUserAccountDataScopeLabel(
  value: string | null | undefined,
) {
  const normalized = String(value || '').trim()
  if (normalized === '全部数据' || normalized === '全部') return '全部数据'
  if (normalized === '本部门') return '本部门'
  return '本人'
}

function getUserAccountDataScopeRank(value: string) {
  switch (normalizeUserAccountDataScopeLabel(value)) {
    case '全部数据':
      return 3
    case '本部门':
      return 2
    default:
      return 1
  }
}

export function buildSelectedRoleDataScope(
  selectedRoleNames: string[],
  roleOptions: RoleOptionRecord[],
  currentDataScope?: string,
) {
  const selectedRoles = roleOptions.filter((role) =>
    selectedRoleNames.includes(role.roleName),
  )
  if (!selectedRoles.length) {
    return selectedRoleNames.length
      ? normalizeUserAccountDataScopeLabel(currentDataScope)
      : '本人'
  }
  return selectedRoles
    .map((role) => normalizeUserAccountDataScopeLabel(role.dataScope))
    .reduce(
      (effective, current) =>
        getUserAccountDataScopeRank(current) >
        getUserAccountDataScopeRank(effective)
          ? current
          : effective,
      '本人',
    )
}

export function buildSelectedRoleSummaries(
  selectedRoleNames: string[],
  roleOptions: RoleOptionRecord[],
) {
  return roleOptions.reduce<string[]>((acc, role) => {
    if (!selectedRoleNames.includes(role.roleName)) return acc
    const summary = role.permissionSummary?.trim()
    if (!summary || acc.includes(summary)) return acc
    acc.push(summary)
    return acc
  }, [])
}

export function buildDefaultUserAccountFormValues() {
  return {
    loginName: '',
    password: '',
    userName: '',
    mobile: '',
    departmentId: null,
    roleNames: [],
    dataScope: '本人',
    permissionSummary: '',
    status: enabledStatusValues[0],
    remark: '',
  }
}
