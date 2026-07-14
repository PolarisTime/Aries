import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'dashboard.info.userName': '用户名',
        'dashboard.info.loginName': '登录名',
        'dashboard.info.roleName': '角色',
        'dashboard.info.companyName': '公司',
        'dashboard.info.mfaStatus': 'MFA状态',
        'dashboard.info.lastLogin': '最后登录',
        'dashboard.info.unassigned': '未分配',
        'dashboard.values.unconfigured': '未配置',
        'dashboard.values.enabled': '已启用',
        'dashboard.values.disabled': '已禁用',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: (date: string | undefined) => date || '—',
}))

import { buildDashboardInfoItems } from '@/views/dashboard/dashboard-info-utils'

describe('dashboard-info-utils', () => {
  const t = (key: string) => {
    const map: Record<string, string> = {
      'dashboard.info.userName': '用户名',
      'dashboard.info.loginName': '登录名',
      'dashboard.info.roleName': '角色',
      'dashboard.info.companyName': '公司',
      'dashboard.info.mfaStatus': 'MFA状态',
      'dashboard.info.lastLogin': '最后登录',
      'dashboard.info.unassigned': '未分配',
      'dashboard.values.unconfigured': '未配置',
      'dashboard.values.enabled': '已启用',
      'dashboard.values.disabled': '已禁用',
    }
    return map[key] ?? key
  }

  describe('buildDashboardInfoItems', () => {
    it('returns 6 info items', () => {
      const items = buildDashboardInfoItems(t)
      expect(items).toHaveLength(6)
    })

    it('returns items with correct keys', () => {
      const items = buildDashboardInfoItems(t)
      const keys = items.map((item) => item.key)
      expect(keys).toEqual([
        'userName',
        'loginName',
        'roleName',
        'companyName',
        'totpEnabled',
        'lastLoginAt',
      ])
    })

    it('returns items with correct labels', () => {
      const items = buildDashboardInfoItems(t)
      expect(items[0].label).toBe('用户名')
      expect(items[1].label).toBe('登录名')
      expect(items[2].label).toBe('角色')
      expect(items[3].label).toBe('公司')
      expect(items[4].label).toBe('MFA状态')
      expect(items[5].label).toBe('最后登录')
    })

    it('returns default values when summary is undefined', () => {
      const items = buildDashboardInfoItems(t)
      expect(items[0].value).toBe('—')
      expect(items[1].value).toBe('—')
      expect(items[2].value).toBe('未分配')
      expect(items[3].value).toBe('未配置')
      expect(items[4].value).toBe('已禁用')
      expect(items[5].value).toBe('—')
    })

    it('returns values from summary when provided', () => {
      const summary = {
        userName: '测试用户',
        loginName: 'testuser',
        roleName: '管理员',
        companyName: '测试公司',
        totpEnabled: true,
        lastLoginAt: '2024-01-01 12:00:00',
      }
      const items = buildDashboardInfoItems(t, summary as never)
      expect(items[0].value).toBe('测试用户')
      expect(items[1].value).toBe('testuser')
      expect(items[2].value).toBe('管理员')
      expect(items[3].value).toBe('测试公司')
      expect(items[4].value).toBe('已启用')
      expect(items[5].value).toBe('2024-01-01 12:00:00')
    })

    it('returns items with icons', () => {
      const items = buildDashboardInfoItems(t)
      items.forEach((item) => {
        expect(item.icon).toBeDefined()
      })
    })
  })
})
