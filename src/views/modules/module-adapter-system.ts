import { getBehaviorValue } from './module-behavior-registry'
import { roleTypeValues } from '@/constants/module-options'
import { getResourcePermissionLabel } from '@/constants/resource-permissions'

export interface RbacRoleMeta {
  roleName: string
  roleType: string
}

export const defaultRoleCatalog: RbacRoleMeta[] = [
  { roleName: '系统管理员', roleType: roleTypeValues[0] },
  { roleName: '采购主管', roleType: roleTypeValues[1] },
  { roleName: '销售经理', roleType: roleTypeValues[1] },
  { roleName: '财务专员', roleType: roleTypeValues[2] },
  { roleName: '仓库主管', roleType: roleTypeValues[1] },
]

const systemHelperTitleMap: Record<string, string> = {
  'role-settings': '角色权限概览',
  'user-accounts': '账号授权概览',
}

export function getPermissionLabels(permissionCodes: string[]) {
  return permissionCodes.map((code) => getResourcePermissionLabel(code))
}

export function getRolePermissionLabels(roleNames: string[]) {
  return roleNames
}

export function buildRoleTreeData(roleCatalog: RbacRoleMeta[]) {
  const groupedRoles = new Map<string, Array<{ title: string; key: string }>>()

  roleCatalog.forEach((item) => {
    if (!groupedRoles.has(item.roleType)) {
      groupedRoles.set(item.roleType, [])
    }
    groupedRoles.get(item.roleType)!.push({
      title: item.roleName,
      key: item.roleName,
    })
  })

  return Array.from(groupedRoles.entries()).map(([roleType, children]) => ({
    title: roleType,
    key: `role-type:${roleType}`,
    children,
  }))
}

export function syncSystemEditorState(
  moduleKey: string,
  editorForm: Record<string, unknown>,
) {
  const syncFn = getBehaviorValue(moduleKey, 'syncEditorForm')
  if (syncFn) {
    syncFn(editorForm)
  }
}

export function getSystemHelperTitle(moduleKey: string) {
  return systemHelperTitleMap[moduleKey] || ''
}

export function isSystemHelperVisible(moduleKey: string) {
  return Boolean(systemHelperTitleMap[moduleKey])
}
