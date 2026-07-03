import { describe, expect, it } from 'vitest'
import { requestHadAuthorization, requestUsesApiKey } from './header-utils'
import type { RetryableRequestConfig } from './types'

function makeConfig(headers?: Record<string, string>): RetryableRequestConfig {
  return { headers: headers ?? {} } as unknown as RetryableRequestConfig
}

describe('header-utils', () => {
  describe('requestHadAuthorization', () => {
    it('returns false when config is undefined', () => {
      expect(requestHadAuthorization(undefined)).toBe(false)
    })

    it('returns false when headers is empty', () => {
      expect(requestHadAuthorization(makeConfig())).toBe(false)
    })

    it('returns true when Authorization header is present', () => {
      expect(
        requestHadAuthorization(makeConfig({ Authorization: 'Bearer token' })),
      ).toBe(true)
    })

    it('returns true when X-Access-Token header is present', () => {
      expect(
        requestHadAuthorization(makeConfig({ 'X-Access-Token': 'token123' })),
      ).toBe(true)
    })

    it('returns true when X-API-Key header is present', () => {
      expect(
        requestHadAuthorization(makeConfig({ 'X-API-Key': 'leo_key' })),
      ).toBe(true)
    })

    it('returns false when header value is whitespace only', () => {
      expect(
        requestHadAuthorization(makeConfig({ Authorization: '   ' })),
      ).toBe(false)
    })

    it('returns false when matched header value is empty', () => {
      expect(requestHadAuthorization(makeConfig({ Authorization: '' }))).toBe(
        false,
      )
    })

    it('uses headers.get function if available', () => {
      const config = {
        headers: {
          get: (name: string) => {
            if (name === 'Authorization') return 'Bearer token'
            return ''
          },
        },
      } as unknown as RetryableRequestConfig
      expect(requestHadAuthorization(config)).toBe(true)
    })

    it('is case-insensitive when looking up headers', () => {
      expect(
        requestHadAuthorization(makeConfig({ authorization: 'Bearer token' })),
      ).toBe(true)
      expect(
        requestHadAuthorization(makeConfig({ 'x-api-key': 'leo_key' })),
      ).toBe(true)
    })
  })

  describe('requestUsesApiKey', () => {
    it('returns false when config is undefined', () => {
      expect(requestUsesApiKey(undefined)).toBe(false)
    })

    it('returns false when X-API-Key is absent', () => {
      expect(requestUsesApiKey(makeConfig({}))).toBe(false)
    })

    it('returns true when X-API-Key is present', () => {
      expect(requestUsesApiKey(makeConfig({ 'X-API-Key': 'leo_key' }))).toBe(
        true,
      )
    })

    it('returns false when X-API-Key is whitespace', () => {
      expect(requestUsesApiKey(makeConfig({ 'X-API-Key': '   ' }))).toBe(false)
    })

    it('uses headers.get function', () => {
      const config = {
        headers: {
          get: (name: string) => {
            return name === 'X-API-Key' ? 'leo_key' : ''
          },
        },
      } as unknown as RetryableRequestConfig
      expect(requestUsesApiKey(config)).toBe(true)
    })
  })
})
