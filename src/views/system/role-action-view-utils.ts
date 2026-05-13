import type { MenuNode } from '@/api/role-actions'
import { normalizeAction } from '@/constants/resource-permissions'

export const ROLE_ACTION_LABELS: Record<string, string> = {
  read: '查看',
  create: '新增',
  update: '编辑',
  delete: '删除',
  audit: '审核',
  export: '导出',
  print: '打印',
  manage_permissions: '配置权限',
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

export type RoleMatrixRow = Record<string, unknown>

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
      key: menu.menuCode,
      menuName: menu.menuName,
      menuCode: menu.menuCode,
      resource: menu.resource,
      actions: menu.actions,
    }
    let count = 0
    for (const action of ALL_ROLE_ACTIONS) {
      const supported = menu.actions.includes(action)
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
