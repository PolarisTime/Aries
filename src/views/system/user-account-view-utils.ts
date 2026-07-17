import { enabledStatusValues } from '@/constants/module-options'
import type { RoleOptionRecord } from '@/shared/schemas'

export type UserAccountEditorMode = 'create' | 'edit'

export function getUserAccountStatusColor(value: string) {
  return value === enabledStatusValues[0] ? 'green' : 'red'
}

export function getUserAccountTotpColor(enabled: boolean) {
  return enabled ? 'processing' : 'default'
}

export function buildSelectedRoleSummaries(
  selectedRoleIds: string[],
  roleOptions: RoleOptionRecord[],
) {
  return roleOptions.reduce<string[]>((acc, role) => {
    if (!selectedRoleIds.includes(String(role.id))) return acc
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
    roleIds: [],
    permissionSummary: '',
    status: enabledStatusValues[0],
    remark: '',
  }
}
