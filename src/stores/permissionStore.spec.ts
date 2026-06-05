import { beforeEach, describe, expect, it } from 'vitest'
import { checkAccessResources, usePermissionStore } from './permissionStore'

describe('permissionStore', () => {
  beforeEach(() => {
    usePermissionStore.setState({ permissionMap: {}, dataScopes: {} })
  })

  it('setPermissions builds permissionMap', () => {
    usePermissionStore.getState().setPermissions([
      { resource: '/purchase-order', actions: ['read', 'write'] },
      { resource: '/sales-order', actions: ['read'] },
    ])

    const state = usePermissionStore.getState()
    expect(state.permissionMap['purchase-order']).toBeDefined()
    expect(state.permissionMap['purchase-order'].has('read')).toBe(true)
    expect(state.permissionMap['purchase-order'].has('write')).toBe(true)
    expect(state.permissionMap['sales-order'].has('read')).toBe(true)
    expect(state.permissionMap['sales-order'].has('delete')).toBe(false)
  })

  it('setPermissions handles empty items', () => {
    usePermissionStore.getState().setPermissions([])
    expect(usePermissionStore.getState().permissionMap).toEqual({})
  })

  it('setPermissions handles null items', () => {
    usePermissionStore.getState().setPermissions(null as any)
    expect(usePermissionStore.getState().permissionMap).toEqual({})
  })

  it('setPermissions normalizes resource keys', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: '//purchase-order', actions: ['read'] }])
    expect(
      usePermissionStore.getState().permissionMap['purchase-order'].has('read'),
    ).toBe(true)
  })

  it('can checks resource action', () => {
    usePermissionStore
      .getState()
      .setPermissions([
        { resource: '/purchase-order', actions: ['read', 'write'] },
      ])
    expect(usePermissionStore.getState().can('purchase-order', 'read')).toBe(
      true,
    )
    expect(usePermissionStore.getState().can('purchase-order', 'delete')).toBe(
      false,
    )
  })

  it('can returns false for unknown resource', () => {
    expect(usePermissionStore.getState().can('unknown', 'read')).toBe(false)
  })

  it('can handles wildcard action', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: '/admin', actions: ['*'] }])
    expect(usePermissionStore.getState().can('admin', 'anything')).toBe(true)
  })

  it('canAny returns true if any action matches', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: '/doc', actions: ['read'] }])
    expect(usePermissionStore.getState().canAny('doc', ['read', 'write'])).toBe(
      true,
    )
    expect(
      usePermissionStore.getState().canAny('doc', ['delete', 'write']),
    ).toBe(false)
  })

  it('canAll returns true if all actions match', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: '/doc', actions: ['read', 'write'] }])
    expect(usePermissionStore.getState().canAll('doc', ['read', 'write'])).toBe(
      true,
    )
    expect(
      usePermissionStore.getState().canAll('doc', ['read', 'delete']),
    ).toBe(false)
  })

  it('syncFromUser sets permissions from user', () => {
    usePermissionStore.getState().syncFromUser({
      permissions: [{ resource: '/test', actions: ['read'] }],
      dataScopes: { test: 'all' },
    } as any)
    expect(usePermissionStore.getState().can('test', 'read')).toBe(true)
  })

  it('syncFromUser clears permissions for null user', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: '/test', actions: ['read'] }])
    usePermissionStore.getState().syncFromUser(null)
    expect(usePermissionStore.getState().can('test', 'read')).toBe(false)
  })

  it('syncFromUser clears permissions for user without permissions', () => {
    usePermissionStore.getState().syncFromUser({} as any)
    expect(usePermissionStore.getState().permissionMap).toEqual({})
  })

  it('clearPermissions resets state', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: '/test', actions: ['read'] }])
    usePermissionStore.getState().clearPermissions()
    expect(usePermissionStore.getState().permissionMap).toEqual({})
    expect(usePermissionStore.getState().dataScopes).toEqual({})
  })

  it('setPermissions stores dataScopes', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: '/test', actions: ['read'] }], {
        test: 'department',
      })
    expect(usePermissionStore.getState().dataScopes).toEqual({
      test: 'department',
    })
  })
})

describe('checkAccessResources', () => {
  it('checks each resource with default read action', () => {
    const can = (resource: string, action: string) =>
      resource === 'doc' && action === 'read'
    expect(checkAccessResources(['doc'], can)).toBe(true)
    expect(checkAccessResources(['other'], can)).toBe(false)
  })

  it('checks resource:action format', () => {
    const can = (resource: string, action: string) =>
      resource === 'doc' && action === 'write'
    expect(checkAccessResources(['doc:write'], can)).toBe(true)
    expect(checkAccessResources(['doc:read'], can)).toBe(false)
  })

  it('returns false for empty resources', () => {
    expect(checkAccessResources([], () => false)).toBe(false)
  })
})
