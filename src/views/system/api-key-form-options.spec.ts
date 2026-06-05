import { describe, expect, it } from 'vitest'

import {
  apiKeyStatusOptions,
  apiKeyUsageScopeOptions,
} from '@/views/system/api-key-form-options'

describe('api-key-form-options', () => {
  describe('apiKeyStatusOptions', () => {
    it('is an array with 3 items', () => {
      expect(Array.isArray(apiKeyStatusOptions)).toBe(true)
      expect(apiKeyStatusOptions).toHaveLength(3)
    })

    it('each item has label and value', () => {
      for (const option of apiKeyStatusOptions) {
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('value')
        expect(typeof option.label).toBe('string')
        expect(typeof option.value).toBe('string')
      }
    })

    it('contains expected status values', () => {
      const values = apiKeyStatusOptions.map((o) => o.value)
      expect(values).toContain('有效')
      expect(values).toContain('已过期')
      expect(values).toContain('已禁用')
    })
  })

  describe('apiKeyUsageScopeOptions', () => {
    it('is an array with 3 items', () => {
      expect(Array.isArray(apiKeyUsageScopeOptions)).toBe(true)
      expect(apiKeyUsageScopeOptions).toHaveLength(3)
    })

    it('each item has label and value', () => {
      for (const option of apiKeyUsageScopeOptions) {
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('value')
        expect(typeof option.label).toBe('string')
        expect(typeof option.value).toBe('string')
      }
    })

    it('contains expected scope values', () => {
      const values = apiKeyUsageScopeOptions.map((o) => o.value)
      expect(values).toContain('全部接口')
      expect(values).toContain('只读接口')
      expect(values).toContain('业务接口')
    })
  })
})
