import type { TFunction } from 'i18next'
import type { Permission } from '@/shared/schemas'

export interface PermissionGroup {
  resource: string
  actions: Permission[]
}

export const OTHER_RESOURCE = 'other'

const ACTION_ORDER = [
  'read',
  'create',
  'update',
  'delete',
  'audit',
  'unaudit',
  'complete',
  'confirm',
  'print',
  'export',
  'import',
  'preview',
  'backfill',
  'rollback',
  'rebuild',
  'sync',
]

function actionRank(action: string) {
  const index = ACTION_ORDER.indexOf(action)
  return index === -1 ? ACTION_ORDER.length : index
}

function compareActions(left: Permission, right: Permission) {
  const rankDiff = actionRank(left.action) - actionRank(right.action)
  return rankDiff !== 0 ? rankDiff : left.action.localeCompare(right.action)
}

/** 按 resource 归组权限码，组间按资源名字典序，组内按标准动作顺序。 */
export function groupPermissionsByResource(
  permissions: Permission[],
): PermissionGroup[] {
  const byResource = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const resource = permission.resource.trim() || OTHER_RESOURCE
    const list = byResource.get(resource)
    if (list) {
      list.push(permission)
    } else {
      byResource.set(resource, [permission])
    }
  }
  return [...byResource.entries()]
    .map(([resource, actions]) => ({
      resource,
      actions: actions.toSorted(compareActions),
    }))
    .sort((left, right) => left.resource.localeCompare(right.resource))
}

export function groupPermissionCodes(group: PermissionGroup): string[] {
  return group.actions.map((permission) => permission.code)
}

export function isGroupFullySelected(
  group: PermissionGroup,
  selected: ReadonlySet<string>,
): boolean {
  const codes = groupPermissionCodes(group)
  return codes.length > 0 && codes.every((code) => selected.has(code))
}

export function isGroupPartiallySelected(
  group: PermissionGroup,
  selected: ReadonlySet<string>,
): boolean {
  const codes = groupPermissionCodes(group)
  const selectedCount = codes.filter((code) => selected.has(code)).length
  return selectedCount > 0 && selectedCount < codes.length
}

/** 资源级全选/取消：返回新的选中集合，不修改入参。 */
export function toggleGroupSelection(
  group: PermissionGroup,
  selected: ReadonlySet<string>,
  checked: boolean,
): Set<string> {
  const next = new Set(selected)
  for (const code of groupPermissionCodes(group)) {
    if (checked) {
      next.add(code)
    } else {
      next.delete(code)
    }
  }
  return next
}

export function togglePermissionSelection(
  selected: ReadonlySet<string>,
  code: string,
  checked: boolean,
): Set<string> {
  const next = new Set(selected)
  if (checked) {
    next.add(code)
  } else {
    next.delete(code)
  }
  return next
}

export function getActionLabel(action: string, t: TFunction): string {
  const key = `system.role.actions.${action}`
  const translated = t(key)
  return translated === key ? action : translated
}

/** 字段级权限的字段名文案；未登记时回退字段码本身。 */
export function getFieldLabel(field: string, t: TFunction): string {
  const key = `system.role.fields.${field}`
  const translated = t(key)
  return translated === key ? field : translated
}

/**
 * 权限项展示文案：字段级权限显示「动作·字段」(如「查看·金额」)，避免与普通
 * `资源:动作` 权限（同为「查看」「编辑」）在矩阵中重名无法区分。
 */
export function getPermissionLabel(
  permission: Permission,
  t: TFunction,
): string {
  const action = getActionLabel(permission.action, t)
  return permission.field
    ? `${action}·${getFieldLabel(permission.field, t)}`
    : action
}

export const WILDCARD_PERMISSION = '*'

export function isWildcardPermission(code: string): boolean {
  return code === WILDCARD_PERMISSION
}

/** `*` 为全局通配（超级管理员），需单独提示，不进入矩阵。 */
export function hasWildcardPermission(permissions: readonly string[]): boolean {
  return permissions.some(isWildcardPermission)
}

/** 内置角色不可删除。 */
export function canDeleteRole(role: { builtin: boolean }): boolean {
  return !role.builtin
}

/** 内置角色 code 只读。 */
export function canEditRoleCode(role: { builtin: boolean }): boolean {
  return !role.builtin
}
