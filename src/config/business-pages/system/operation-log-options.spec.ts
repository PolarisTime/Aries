import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import {
  operationLogModuleOptions,
  resolveOperationLogActionOptions,
} from './operation-log-options'

describe('operation-log-options', () => {
  describe('operationLogModuleOptions', () => {
    it('is an array of groups', () => {
      expect(Array.isArray(operationLogModuleOptions)).toBe(true)
      expect(operationLogModuleOptions.length).toBeGreaterThan(0)
    })

    it('each group has label and options', () => {
      for (const group of operationLogModuleOptions) {
        expect(group.label).toBeDefined()
        expect(Array.isArray(group.options)).toBe(true)
        expect(group.options.length).toBeGreaterThan(0)
      }
    })

    it('contains common group', () => {
      const common = operationLogModuleOptions.find((g) =>
        g.options.some((o) => o.value === '认证授权'),
      )
      expect(common).toBeDefined()
    })

    it('contains business group with module entries', () => {
      const business = operationLogModuleOptions.find((g) =>
        g.options.some((o) => o.value === '商品资料'),
      )
      expect(business).toBeDefined()
    })
  })

  describe('resolveOperationLogActionOptions', () => {
    it('returns module-specific options for known module', () => {
      const options = resolveOperationLogActionOptions({
        moduleName: '认证授权',
      })
      expect(Array.isArray(options)).toBe(true)
      expect(options.length).toBeGreaterThan(0)
      const values = options.map((o) => o.value)
      expect(values).toContain('登录')
    })

    it('returns default options for unknown module', () => {
      const options = resolveOperationLogActionOptions({
        moduleName: '未知模块',
      })
      expect(Array.isArray(options)).toBe(true)
      expect(options.length).toBeGreaterThan(0)
      const values = options.map((o) => o.value)
      expect(values).toContain('查询')
    })

    it('handles empty filters', () => {
      const options = resolveOperationLogActionOptions({})
      expect(Array.isArray(options)).toBe(true)
    })

    it('returns specific options for 个人设置', () => {
      const options = resolveOperationLogActionOptions({
        moduleName: '个人设置',
      })
      const values = options.map((o) => o.value)
      expect(values).toContain('修改密码')
    })

    it('returns specific options for API Key 管理', () => {
      const options = resolveOperationLogActionOptions({
        moduleName: 'API Key 管理',
      })
      const values = options.map((o) => o.value)
      expect(values).toContain('生成 API Key')
    })
  })
})
