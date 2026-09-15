import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type { Permission } from '@/shared/schemas'
import {
  canDeleteRole,
  canEditRoleCode,
  getActionLabel,
  groupPermissionCodes,
  groupPermissionsByResource,
  hasWildcardPermission,
  isGroupFullySelected,
  isGroupPartiallySelected,
  isWildcardPermission,
  toggleGroupSelection,
  togglePermissionSelection,
} from './role-permission-utils'

function permission(
  resource: string,
  action: string,
  field?: string,
): Permission {
  return {
    code: field ? `${resource}:${action}:${field}` : `${resource}:${action}`,
    resource,
    action,
    field: field ?? null,
    description: null,
  }
}

describe('groupPermissionsByResource', () => {
  it('按资源分组并按标准动作顺序排列', () => {
    const groups = groupPermissionsByResource([
      permission('materials', 'delete'),
      permission('materials', 'read'),
      permission('materials', 'create'),
      permission('sales-orders', 'audit'),
      permission('sales-orders', 'read'),
    ])

    expect(groups.map((group) => group.resource)).toEqual([
      'materials',
      'sales-orders',
    ])
    expect(groups[0].actions.map((item) => item.action)).toEqual([
      'read',
      'create',
      'delete',
    ])
    expect(groups[1].actions.map((item) => item.action)).toEqual([
      'read',
      'audit',
    ])
  })

  it('未知动作排在已知动作之后', () => {
    const groups = groupPermissionsByResource([
      permission('materials', 'zzz'),
      permission('materials', 'read'),
    ])
    expect(groups[0].actions.map((item) => item.action)).toEqual([
      'read',
      'zzz',
    ])
  })

  it('空资源名归入 other', () => {
    const groups = groupPermissionsByResource([permission('', 'read')])
    expect(groups[0].resource).toBe('other')
  })
})

describe('资源级全选', () => {
  const group = groupPermissionsByResource([
    permission('materials', 'read'),
    permission('materials', 'create'),
  ])[0]

  it('判断全选与半选状态', () => {
    expect(isGroupFullySelected(group, new Set(['materials:read']))).toBe(false)
    expect(
      isGroupFullySelected(group, new Set(groupPermissionCodes(group))),
    ).toBe(true)
    expect(isGroupPartiallySelected(group, new Set(['materials:read']))).toBe(
      true,
    )
    expect(
      isGroupPartiallySelected(group, new Set(groupPermissionCodes(group))),
    ).toBe(false)
  })

  it('全选时补齐资源下所有权限码', () => {
    const next = toggleGroupSelection(group, new Set(['other:x']), true)
    expect([...next].sort()).toEqual(
      ['materials:create', 'materials:read', 'other:x'].sort(),
    )
    expect(next.has('other:x')).toBe(true)
  })

  it('取消全选时仅移除该资源权限码', () => {
    const next = toggleGroupSelection(
      group,
      new Set(['materials:read', 'materials:create', 'other:x']),
      false,
    )
    expect([...next]).toEqual(['other:x'])
  })

  it('togglePermissionSelection 不修改原集合', () => {
    const original = new Set(['materials:read'])
    const added = togglePermissionSelection(original, 'materials:create', true)
    expect([...original]).toEqual(['materials:read'])
    expect(added.has('materials:create')).toBe(true)
    const removed = togglePermissionSelection(added, 'materials:read', false)
    expect(removed.has('materials:read')).toBe(false)
  })
})

describe('通配与内置角色保护', () => {
  it('识别全局通配权限', () => {
    expect(isWildcardPermission('*')).toBe(true)
    expect(isWildcardPermission('materials:read')).toBe(false)
    expect(hasWildcardPermission(['*', 'materials:read'])).toBe(true)
    expect(hasWildcardPermission(['materials:read'])).toBe(false)
  })

  it('内置角色不可删除且编码只读', () => {
    expect(canDeleteRole({ builtin: true })).toBe(false)
    expect(canDeleteRole({ builtin: false })).toBe(true)
    expect(canEditRoleCode({ builtin: true })).toBe(false)
    expect(canEditRoleCode({ builtin: false })).toBe(true)
  })
})

describe('getActionLabel', () => {
  it('命中翻译时返回翻译文案', () => {
    const t = ((key: string) =>
      key === 'system.role.actions.read' ? '查看' : key) as unknown as TFunction
    expect(getActionLabel('read', t)).toBe('查看')
  })

  it('缺少翻译时回退动作原值', () => {
    const t = ((key: string) => key) as unknown as TFunction
    expect(getActionLabel('unknown-action', t)).toBe('unknown-action')
  })
})
