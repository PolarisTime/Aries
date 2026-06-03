import { describe, expect, it, vi } from 'vitest'

import {
  getApiKeyAllowedActionText,
  getApiKeyAllowedResourceText,
  getApiKeyStatusColor,
  getApiKeyUserDisplayName,
} from '@/views/system/api-key-view-utils'

describe('api-key-view-utils', () => {
  describe('getApiKeyStatusColor', () => {
    it('returns green for valid status', () => {
      expect(getApiKeyStatusColor('有效')).toBe('green')
    })

    it('returns orange for expired status', () => {
      expect(getApiKeyStatusColor('已过期')).toBe('orange')
    })

    it('returns red for disabled status', () => {
      expect(getApiKeyStatusColor('已禁用')).toBe('red')
    })

    it('returns default for unknown status', () => {
      expect(getApiKeyStatusColor('unknown')).toBe('default')
      expect(getApiKeyStatusColor('')).toBe('default')
    })
  })

  describe('getApiKeyUserDisplayName', () => {
    it('returns userName with loginName when userName exists', () => {
      expect(
        getApiKeyUserDisplayName({ userName: 'Admin', loginName: 'admin' }),
      ).toBe('Admin（admin）')
    })

    it('returns only loginName when userName is empty', () => {
      expect(getApiKeyUserDisplayName({ userName: '', loginName: 'admin' })).toBe(
        'admin',
      )
    })

    it('returns only loginName when userName is falsy', () => {
      expect(
        getApiKeyUserDisplayName({ userName: undefined as never, loginName: 'root' }),
      ).toBe('root')
    })
  })

  describe('getApiKeyAllowedResourceText', () => {
    const resourceOptions = [
      { code: 'order', title: '订单管理', group: '业务' },
      { code: 'product', title: '商品管理', group: '业务' },
    ]

    it('returns unlimited text when allowedResources is empty', () => {
      const result = getApiKeyAllowedResourceText([], resourceOptions)
      expect(result).toBeDefined()
    })

    it('returns unlimited text when allowedResources is null/undefined', () => {
      expect(
        getApiKeyAllowedResourceText(null as never, resourceOptions),
      ).toBeDefined()
      expect(
        getApiKeyAllowedResourceText(undefined as never, resourceOptions),
      ).toBeDefined()
    })

    it('maps resource codes to titles', () => {
      const result = getApiKeyAllowedResourceText(
        ['order', 'product'],
        resourceOptions,
      )
      expect(result).toContain('订单管理')
      expect(result).toContain('商品管理')
    })

    it('falls back to code when title not found', () => {
      const result = getApiKeyAllowedResourceText(
        ['unknown'],
        resourceOptions,
      )
      expect(result).toBe('unknown')
    })

    it('joins multiple resources with Chinese comma', () => {
      const result = getApiKeyAllowedResourceText(
        ['order', 'product'],
        resourceOptions,
      )
      expect(result).toBe('订单管理、商品管理')
    })
  })

  describe('getApiKeyAllowedActionText', () => {
    const actionOptions = [
      { code: 'read', title: '读取' },
      { code: 'write', title: '写入' },
    ]

    it('returns unset text when allowedActions is empty', () => {
      const result = getApiKeyAllowedActionText([], actionOptions)
      expect(result).toBeDefined()
    })

    it('returns unset text when allowedActions is null/undefined', () => {
      expect(
        getApiKeyAllowedActionText(null as never, actionOptions),
      ).toBeDefined()
    })

    it('maps action codes to titles', () => {
      const result = getApiKeyAllowedActionText(['read', 'write'], actionOptions)
      expect(result).toContain('读取')
      expect(result).toContain('写入')
    })

    it('falls back to code when title not found', () => {
      const result = getApiKeyAllowedActionText(['delete'], actionOptions)
      expect(result).toBe('delete')
    })
  })
})
