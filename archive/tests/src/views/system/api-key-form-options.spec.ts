import { describe, expect, it } from 'vitest'

import {
  buildApiKeyStatusOptions,
  buildApiKeyUsageScopeOptions,
} from '@/views/system/api-key-form-options'

describe('api-key-form-options', () => {
  const t = (key: string) => `translated:${key}`

  describe('buildApiKeyStatusOptions', () => {
    it('is an array with 3 items', () => {
      const options = buildApiKeyStatusOptions(t as never)

      expect(Array.isArray(options)).toBe(true)
      expect(options).toHaveLength(3)
    })

    it('each item has label and value', () => {
      const options = buildApiKeyStatusOptions(t as never)

      for (const option of options) {
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('value')
        expect(typeof option.label).toBe('string')
        expect(typeof option.value).toBe('string')
      }
    })

    it('contains expected status values', () => {
      const values = buildApiKeyStatusOptions(t as never).map((o) => o.value)

      expect(values).toContain('有效')
      expect(values).toContain('已过期')
      expect(values).toContain('已禁用')
    })

    it('uses the provided translator at build time', () => {
      expect(buildApiKeyStatusOptions(t as never)[0].label).toBe(
        'translated:system.apiKeyForm.statusValid',
      )
    })
  })

  describe('buildApiKeyUsageScopeOptions', () => {
    it('is an array with 3 items', () => {
      const options = buildApiKeyUsageScopeOptions(t as never)

      expect(Array.isArray(options)).toBe(true)
      expect(options).toHaveLength(3)
    })

    it('each item has label and value', () => {
      const options = buildApiKeyUsageScopeOptions(t as never)

      for (const option of options) {
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('value')
        expect(typeof option.label).toBe('string')
        expect(typeof option.value).toBe('string')
      }
    })

    it('contains expected scope values', () => {
      const values = buildApiKeyUsageScopeOptions(t as never).map(
        (o) => o.value,
      )

      expect(values).toContain('全部接口')
      expect(values).toContain('只读接口')
      expect(values).toContain('业务接口')
    })
  })
})
