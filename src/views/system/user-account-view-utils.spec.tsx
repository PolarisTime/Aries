import { describe, expect, it } from 'vitest'

import type { RoleOptionRecord } from '@/types/user-account'

import {
  buildDefaultUserAccountFormValues,
  buildSelectedRoleDataScope,
  buildSelectedRoleSummaries,
  getUserAccountStatusColor,
  getUserAccountTotpColor,
} from '@/views/system/user-account-view-utils'

describe('user-account-view-utils', () => {
  describe('getUserAccountStatusColor', () => {
    it('returns green for first enabled status', () => {
      expect(getUserAccountStatusColor('正常')).toBe('green')
    })

    it('returns red for other statuses', () => {
      expect(getUserAccountStatusColor('禁用')).toBe('red')
      expect(getUserAccountStatusColor('other')).toBe('red')
    })
  })

  describe('getUserAccountTotpColor', () => {
    it('returns processing for true', () => {
      expect(getUserAccountTotpColor(true)).toBe('processing')
    })

    it('returns default for false', () => {
      expect(getUserAccountTotpColor(false)).toBe('default')
    })
  })

  describe('buildSelectedRoleDataScope', () => {
    const roleOptions: RoleOptionRecord[] = [
      {
        id: 1,
        roleName: '管理员',
        dataScope: '全部数据',
        permissionSummary: '全部权限',
      },
      {
        id: 2,
        roleName: '普通用户',
        dataScope: '本人',
        permissionSummary: '部分权限',
      },
      {
        id: 3,
        roleName: '部门经理',
        dataScope: '本部门',
        permissionSummary: '部门权限',
      },
    ] as never

    it('returns "本人" when no selected roles', () => {
      expect(buildSelectedRoleDataScope([], roleOptions)).toBe('本人')
    })

    it('returns currentDataScope when selected roles not found in options', () => {
      expect(buildSelectedRoleDataScope([999], roleOptions, '全部数据')).toBe(
        '全部数据',
      )
    })

    it('returns "本人" when selected roles not found and no currentDataScope', () => {
      expect(buildSelectedRoleDataScope([999], roleOptions)).toBe('本人')
    })

    it('returns highest data scope from selected roles', () => {
      expect(buildSelectedRoleDataScope([1], roleOptions)).toBe('全部数据')
      expect(buildSelectedRoleDataScope([2], roleOptions)).toBe('本人')
      expect(buildSelectedRoleDataScope([3], roleOptions)).toBe('本部门')
    })

    it('returns highest scope when multiple roles selected', () => {
      expect(buildSelectedRoleDataScope([2, 3], roleOptions)).toBe('本部门')
      expect(buildSelectedRoleDataScope([1, 2, 3], roleOptions)).toBe(
        '全部数据',
      )
    })
  })

  describe('buildSelectedRoleSummaries', () => {
    const roleOptions: RoleOptionRecord[] = [
      { id: 1, roleName: '管理员', permissionSummary: '全部权限' },
      { id: 2, roleName: '普通用户', permissionSummary: '部分权限' },
      { id: 3, roleName: '无总结', permissionSummary: '' },
      { id: 4, roleName: '重复', permissionSummary: '全部权限' },
    ] as never

    it('returns empty array when no roles selected', () => {
      expect(buildSelectedRoleSummaries([], roleOptions)).toEqual([])
    })

    it('returns summaries for selected roles', () => {
      const result = buildSelectedRoleSummaries([1, 2], roleOptions)
      expect(result).toContain('全部权限')
      expect(result).toContain('部分权限')
    })

    it('skips roles without permissionSummary', () => {
      const result = buildSelectedRoleSummaries([3], roleOptions)
      expect(result).toEqual([])
    })

    it('deduplicates summaries', () => {
      const result = buildSelectedRoleSummaries([1, 4], roleOptions)
      expect(result.filter((s) => s === '全部权限')).toHaveLength(1)
    })
  })

  describe('buildDefaultUserAccountFormValues', () => {
    it('returns an object with expected fields', () => {
      const values = buildDefaultUserAccountFormValues()
      expect(values).toHaveProperty('loginName', '')
      expect(values).toHaveProperty('password', '')
      expect(values).toHaveProperty('userName', '')
      expect(values).toHaveProperty('mobile', '')
      expect(values).toHaveProperty('departmentId', null)
      expect(values).toHaveProperty('roleNames', [])
      expect(values).toHaveProperty('dataScope', '本人')
      expect(values).toHaveProperty('permissionSummary', '')
      expect(values).toHaveProperty('status')
      expect(values).toHaveProperty('remark', '')
    })

    it('returns a new object each time', () => {
      const a = buildDefaultUserAccountFormValues()
      const b = buildDefaultUserAccountFormValues()
      expect(a).not.toBe(b)
      expect(a).toEqual(b)
    })
  })
})
