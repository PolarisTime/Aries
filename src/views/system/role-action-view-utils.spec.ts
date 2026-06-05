import { describe, expect, it, vi } from 'vitest'

import type { MenuNode } from '@/api/role-actions'

import {
  ALL_ROLE_ACTIONS,
  buildNormalizedRoleActionSet,
  buildRoleMatrixData,
  flattenRoleActionMenus,
  ROLE_ACTION_LABELS,
} from '@/views/system/role-action-view-utils'

vi.mock('@/constants/resource-permissions', () => ({
  normalizeAction: (action: string) => action.toLowerCase(),
}))

describe('role-action-view-utils', () => {
  describe('constants', () => {
    it('ROLE_ACTION_LABELS has 8 entries', () => {
      expect(Object.keys(ROLE_ACTION_LABELS)).toHaveLength(8)
    })

    it('ALL_ROLE_ACTIONS has 8 items', () => {
      expect(ALL_ROLE_ACTIONS).toHaveLength(8)
    })

    it('ALL_ROLE_ACTIONS contains expected actions', () => {
      expect(ALL_ROLE_ACTIONS).toContain('read')
      expect(ALL_ROLE_ACTIONS).toContain('create')
      expect(ALL_ROLE_ACTIONS).toContain('update')
      expect(ALL_ROLE_ACTIONS).toContain('delete')
      expect(ALL_ROLE_ACTIONS).toContain('audit')
      expect(ALL_ROLE_ACTIONS).toContain('export')
      expect(ALL_ROLE_ACTIONS).toContain('print')
      expect(ALL_ROLE_ACTIONS).toContain('manage_permissions')
    })
  })

  describe('flattenRoleActionMenus', () => {
    it('returns empty array for empty tree', () => {
      expect(flattenRoleActionMenus([])).toEqual([])
    })

    it('flattens children with actions', () => {
      const tree: MenuNode[] = [
        {
          menuCode: 'system',
          menuName: '系统管理',
          resourceCode: '',
          actions: [],
          children: [
            {
              menuCode: 'user',
              menuName: '用户管理',
              resourceCode: 'user-account',
              actions: ['read', 'create'],
              children: [],
            },
          ],
        },
      ]
      const result = flattenRoleActionMenus(tree)
      expect(result).toHaveLength(1)
      expect(result[0].menuCode).toBe('user')
      expect(result[0].menuName).toBe('用户管理')
      expect(result[0].parentName).toBe('系统管理')
      expect(result[0].resource).toBe('user-account')
      expect(result[0].actions).toEqual(['read', 'create'])
    })

    it('flattens root nodes with actions and no children', () => {
      const tree: MenuNode[] = [
        {
          menuCode: 'dashboard',
          menuName: '仪表盘',
          resourceCode: 'dashboard',
          actions: ['read'],
          children: [],
        },
      ]
      const result = flattenRoleActionMenus(tree)
      expect(result).toHaveLength(1)
      expect(result[0].menuCode).toBe('dashboard')
      expect(result[0].parentName).toBe('')
    })

    it('skips children without actions', () => {
      const tree: MenuNode[] = [
        {
          menuCode: 'system',
          menuName: '系统管理',
          resourceCode: '',
          actions: [],
          children: [
            {
              menuCode: 'user',
              menuName: '用户管理',
              resourceCode: 'user-account',
              actions: [],
              children: [],
            },
          ],
        },
      ]
      const result = flattenRoleActionMenus(tree)
      expect(result).toHaveLength(0)
    })

    it('falls back to menuCode when resourceCode is empty', () => {
      const tree: MenuNode[] = [
        {
          menuCode: 'dashboard',
          menuName: '仪表盘',
          resourceCode: '',
          actions: ['read'],
          children: [],
        },
      ]
      const result = flattenRoleActionMenus(tree)
      expect(result[0].resource).toBe('dashboard')
    })
  })

  describe('buildRoleMatrixData', () => {
    it('returns empty array for empty menus', () => {
      expect(buildRoleMatrixData([], new Set())).toEqual([])
    })

    it('builds matrix data with checked actions', () => {
      const menus = [
        {
          menuCode: 'user',
          menuName: '用户管理',
          parentName: '系统',
          resource: 'user-account',
          actions: ['read', 'create'],
        },
      ]
      const selected = new Set(['user-account:read'])
      const result = buildRoleMatrixData(menus, selected)
      expect(result).toHaveLength(1)
      expect(result[0].read).toBe(true)
      expect(result[0].create).toBe(false)
      expect(result[0]._count).toBe('1/2')
    })

    it('handles no selected actions', () => {
      const menus = [
        {
          menuCode: 'user',
          menuName: '用户管理',
          parentName: '',
          resource: 'user-account',
          actions: ['read'],
        },
      ]
      const result = buildRoleMatrixData(menus, new Set())
      expect(result[0].read).toBe(false)
      expect(result[0]._count).toBe('0/1')
    })
  })

  describe('buildNormalizedRoleActionSet', () => {
    it('returns empty set for empty input', () => {
      expect(buildNormalizedRoleActionSet([]).size).toBe(0)
    })

    it('builds set with normalized resource:action pairs', () => {
      const items = [
        { resource: 'user-account', action: 'read' },
        { resource: 'order', action: 'create' },
      ]
      const result = buildNormalizedRoleActionSet(items)
      expect(result.has('user-account:read')).toBe(true)
      expect(result.has('order:create')).toBe(true)
    })

    it('normalizes action to lowercase', () => {
      const items = [{ resource: 'user-account', action: 'READ' }]
      const result = buildNormalizedRoleActionSet(items)
      expect(result.has('user-account:read')).toBe(true)
    })
  })
})
