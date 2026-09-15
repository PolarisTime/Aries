import { describe, expect, it } from 'vitest'
import {
  permissionSchema,
  roleCreatePayloadSchema,
  roleDetailResponseSchema,
  roleFormSchema,
  roleListPageSchema,
  roleResponseSchema,
  roleStatusUpdatePayloadSchema,
  roleUpdatePayloadSchema,
  userRolesResponseSchema,
  userRolesUpdatePayloadSchema,
} from './role'

const baseRole = {
  id: '1844674407370955161',
  code: 'admin',
  name: '管理员',
  description: null,
  builtin: true,
  status: '正常',
  permissionCount: 12,
  userCount: 1,
}

describe('roleResponseSchema', () => {
  it('解析雪花 ID 字符串与统计字段', () => {
    const parsed = roleResponseSchema.parse(baseRole)
    expect(parsed.id).toBe('1844674407370955161')
    expect(parsed.builtin).toBe(true)
    expect(parsed.permissionCount).toBe(12)
  })

  it('兼容期允许安全整数统计与字符串数字', () => {
    const parsed = roleResponseSchema.parse({
      ...baseRole,
      permissionCount: '12',
    })
    expect(parsed.permissionCount).toBe(12)
  })

  it('拒绝非法状态', () => {
    expect(() =>
      roleResponseSchema.parse({ ...baseRole, status: '未知' }),
    ).toThrow()
  })

  it('详情响应要求 permissions 数组', () => {
    const parsed = roleDetailResponseSchema.parse({
      ...baseRole,
      permissions: ['sales-orders:read'],
    })
    expect(parsed.permissions).toEqual(['sales-orders:read'])
    expect(() =>
      roleDetailResponseSchema.parse({ ...baseRole, permissions: 'x' }),
    ).toThrow()
  })
})

describe('permissionSchema', () => {
  it('field 与 description 可为空', () => {
    const parsed = permissionSchema.parse({
      code: 'inventory:read:cost',
      resource: 'inventory',
      action: 'read',
      field: 'cost',
      description: null,
    })
    expect(parsed.field).toBe('cost')
  })

  it('拒绝缺少 action 的权限项', () => {
    expect(() => permissionSchema.parse({ code: 'x', resource: 'x' })).toThrow()
  })
})

describe('roleListPageSchema', () => {
  it('解析标准 PageResponse', () => {
    const parsed = roleListPageSchema.parse({
      content: [baseRole],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 20,
      hasMore: false,
    })
    expect(parsed.content).toHaveLength(1)
  })

  it('拒绝缺少 hasMore 的分页响应', () => {
    expect(() =>
      roleListPageSchema.parse({
        content: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 20,
      }),
    ).toThrow()
  })
})

describe('角色请求校验', () => {
  it('新增要求 code 与 name', () => {
    expect(
      roleCreatePayloadSchema.safeParse({ code: '', name: 'x' }).success,
    ).toBe(false)
    expect(
      roleCreatePayloadSchema.safeParse({ code: 'sales', name: '销售' })
        .success,
    ).toBe(true)
  })

  it('更新时 code 可选', () => {
    expect(roleUpdatePayloadSchema.safeParse({ name: '销售' }).success).toBe(
      true,
    )
    expect(
      roleUpdatePayloadSchema.safeParse({ name: '销售', code: 'sales' })
        .success,
    ).toBe(true)
  })

  it('状态仅允许 正常/禁用', () => {
    expect(
      roleStatusUpdatePayloadSchema.safeParse({ status: '正常' }).success,
    ).toBe(true)
    expect(
      roleStatusUpdatePayloadSchema.safeParse({ status: '已停用' }).success,
    ).toBe(false)
  })

  it('用户角色 roleIds 必须为十进制字符串', () => {
    expect(
      userRolesUpdatePayloadSchema.safeParse({ roleIds: ['1', '2'] }).success,
    ).toBe(true)
    expect(
      userRolesUpdatePayloadSchema.safeParse({ roleIds: [1] }).success,
    ).toBe(false)
    expect(
      userRolesUpdatePayloadSchema.safeParse({ roleIds: ['abc'] }).success,
    ).toBe(false)
  })

  it('用户角色响应仅接受字符串雪花 ID', () => {
    expect(userRolesResponseSchema.safeParse(['1', '2']).success).toBe(true)
    expect(userRolesResponseSchema.safeParse([1]).success).toBe(false)
  })
})

describe('roleFormSchema', () => {
  it('去除首尾空白后校验', () => {
    const parsed = roleFormSchema.parse({
      code: '  sales  ',
      name: '  销售  ',
      description: '   ',
    })
    expect(parsed.code).toBe('sales')
    expect(parsed.name).toBe('销售')
  })

  it('拒绝空白名称', () => {
    expect(
      roleFormSchema.safeParse({ code: 'sales', name: '   ' }).success,
    ).toBe(false)
  })

  it('拒绝超长描述', () => {
    expect(
      roleFormSchema.safeParse({
        code: 'sales',
        name: '销售',
        description: 'x'.repeat(256),
      }).success,
    ).toBe(false)
  })
})
