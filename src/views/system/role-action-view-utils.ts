import i18next from 'i18next'
import type { MenuNode } from '@/api/role-actions'
import { normalizeAction } from '@/constants/resource-permissions'
import type { ModuleRecord } from '@/types/module-page'

export const ROLE_ACTION_LABELS: Record<string, string> = {
  read: i18next.t('system.roleActionUtils.actionRead'),
  create: i18next.t('system.roleActionUtils.actionCreate'),
  update: i18next.t('system.roleActionUtils.actionUpdate'),
  delete: i18next.t('system.roleActionUtils.actionDelete'),
  audit: i18next.t('system.roleActionUtils.actionAudit'),
  export: i18next.t('system.roleActionUtils.actionExport'),
  print: i18next.t('system.roleActionUtils.actionPrint'),
  manage_permissions: i18next.t(
    'system.roleActionUtils.actionManagePermissions',
  ),
}

export const ALL_ROLE_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'audit',
  'export',
  'print',
  'manage_permissions',
] as const

export interface FlattenedRoleMenu {
  menuCode: string
  menuName: string
  parentName: string
  resource: string
  actions: string[]
}

export type RoleMatrixRow = ModuleRecord

export function flattenRoleActionMenus(menuTree: MenuNode[]) {
  const result: FlattenedRoleMenu[] = []
  for (const group of menuTree) {
    if (group.children.length > 0) {
      for (const child of group.children) {
        if (child.actions.length > 0) {
          result.push({
            menuCode: child.menuCode,
            menuName: child.menuName,
            parentName: group.menuName,
            resource: child.resourceCode || child.menuCode,
            actions: child.actions,
          })
        }
      }
      continue
    }

    if (group.actions.length > 0) {
      result.push({
        menuCode: group.menuCode,
        menuName: group.menuName,
        parentName: '',
        resource: group.resourceCode || group.menuCode,
        actions: group.actions,
      })
    }
  }
  return result
}

export function buildRoleMatrixData(
  flatMenus: FlattenedRoleMenu[],
  selectedActions: Set<string>,
) {
  return flatMenus.map((menu) => {
    const row: RoleMatrixRow = {
      id: menu.menuCode,
      key: menu.menuCode,
      menuName: menu.menuName,
      menuCode: menu.menuCode,
      resource: menu.resource,
      actions: menu.actions,
    }
    const menuActionsSet = new Set(menu.actions)
    let count = 0
    for (const action of ALL_ROLE_ACTIONS) {
      const supported = menuActionsSet.has(action)
      const checked =
        supported && selectedActions.has(`${menu.resource}:${action}`)
      row[action] = checked
      if (checked) count += 1
    }
    row._count = `${count}/${menu.actions.length}`
    return row
  })
}

export function buildNormalizedRoleActionSet(
  items: Array<{ resource: string; action: string }>,
) {
  const actions = new Set<string>()
  for (const item of items) {
    actions.add(`${item.resource}:${normalizeAction(item.action)}`)
  }
  return actions
}
