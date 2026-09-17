import { describe, expect, it } from 'vitest'
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@/utils/permission'

describe('hasPermission', () => {
  it('未要求权限码时放行（缺省/空串）', () => {
    expect(hasPermission([], undefined)).toBe(true)
    expect(hasPermission([], null)).toBe(true)
    expect(hasPermission([], '')).toBe(true)
  })

  it('权限集合为空时拒绝', () => {
    expect(hasPermission([], 'roles:read')).toBe(false)
    expect(hasPermission(undefined, 'roles:read')).toBe(false)
    expect(hasPermission(null, 'roles:read')).toBe(false)
  })

  it('精确匹配权限码', () => {
    expect(hasPermission(['roles:read'], 'roles:read')).toBe(true)
    expect(hasPermission(['roles:read'], 'roles:write')).toBe(false)
  })

  it('全局通配 * 拥有所有权限', () => {
    expect(hasPermission(['*'], 'roles:read')).toBe(true)
    expect(hasPermission(['*'], 'anything:whatever')).toBe(true)
  })

  it('资源通配 资源:* 覆盖该资源全部动作', () => {
    expect(hasPermission(['roles:*'], 'roles:read')).toBe(true)
    expect(hasPermission(['roles:*'], 'roles:write')).toBe(true)
    expect(hasPermission(['roles:*'], 'user-accounts:read')).toBe(false)
  })

  it('hasAnyPermission / hasAllPermissions', () => {
    expect(
      hasAnyPermission(['roles:read'], ['roles:write', 'roles:read']),
    ).toBe(true)
    expect(hasAnyPermission(['roles:read'], ['roles:write'])).toBe(false)
    expect(
      hasAllPermissions(
        ['roles:read', 'roles:write'],
        ['roles:read', 'roles:write'],
      ),
    ).toBe(true)
    expect(
      hasAllPermissions(['roles:read'], ['roles:read', 'roles:write']),
    ).toBe(false)
  })
})
