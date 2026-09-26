import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type { Permission } from '@/shared/schemas'
import {
  canDeleteRole,
  canEditRoleCode,
  getActionLabel,
  getPermissionCodeLabel,
  getPermissionLabel,
  getResourceLabel,
  groupPermissionCodes,
  groupPermissionsByResource,
  hasWildcardPermission,
  isGroupFullySelected,
  isGroupPartiallySelected,
  isWildcardPermission,
  parsePermissionCode,
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

describe('getPermissionLabel', () => {
  const t = ((key: string) =>
    ({
      'system.role.actions.read': '查看',
      'system.role.actions.update': '编辑',
      'system.role.fields.amount': '金额',
      'system.role.fields.unit-price': '单价',
    })[key] ?? key) as unknown as TFunction

  it('普通权限仅显示动作', () => {
    expect(
      getPermissionLabel(
        { code: 'sales-orders:read', resource: 'sales-orders', action: 'read' },
        t,
      ),
    ).toBe('查看')
  })

  it('字段级权限显示「动作·字段」，与普通权限区分', () => {
    expect(
      getPermissionLabel(
        {
          code: 'sales-orders:read:amount',
          resource: 'sales-orders',
          action: 'read',
          field: 'amount',
        },
        t,
      ),
    ).toBe('查看·金额')
    expect(
      getPermissionLabel(
        {
          code: 'sales-orders:update:unit-price',
          resource: 'sales-orders',
          action: 'update',
          field: 'unit-price',
        },
        t,
      ),
    ).toBe('编辑·单价')
  })

  it('未登记字段回退字段码', () => {
    expect(
      getPermissionLabel(
        {
          code: 'x:read:unknown',
          resource: 'x',
          action: 'read',
          field: 'unknown',
        },
        t,
      ),
    ).toBe('查看·unknown')
  })
})

describe('getResourceLabel', () => {
  const t = ((key: string) =>
    ({
      'system.role.resources.sales-orders': '销售订单',
    })[key] ?? key) as unknown as TFunction

  it('命中翻译时返回中文资源名', () => {
    expect(getResourceLabel('sales-orders', t)).toBe('销售订单')
  })

  it('未登记资源回退资源码', () => {
    expect(getResourceLabel('unknown-resource', t)).toBe('unknown-resource')
  })
})

describe('parsePermissionCode', () => {
  it('两段码解析资源与动作', () => {
    expect(parsePermissionCode('sales-orders:read')).toEqual({
      resource: 'sales-orders',
      action: 'read',
      field: undefined,
    })
  })

  it('三段码保留字段段', () => {
    expect(parsePermissionCode('sales-orders:read:amount')).toEqual({
      resource: 'sales-orders',
      action: 'read',
      field: 'amount',
    })
  })

  it('空段回退为空串/undefined 而不抛错', () => {
    expect(parsePermissionCode('')).toEqual({
      resource: '',
      action: '',
      field: undefined,
    })
  })
})

describe('getPermissionCodeLabel', () => {
  const t = ((key: string) =>
    ({
      'system.role.actions.read': '查看',
      'system.role.actions.update': '编辑',
      'system.role.fields.amount': '金额',
    })[key] ?? key) as unknown as TFunction

  it('字段级权限码保留「动作·字段」，与普通权限码区分', () => {
    expect(getPermissionCodeLabel('sales-orders:read', t)).toBe('查看')
    expect(getPermissionCodeLabel('sales-orders:read:amount', t)).toBe(
      '查看·金额',
    )
  })

  it('未知动作/字段回退原码', () => {
    expect(getPermissionCodeLabel('x:zzz:unknown', t)).toBe('zzz·unknown')
  })
})
