import { describe, expect, it, vi } from 'vitest'
import { shouldTriggerRefresh, shouldClearAuthState } from './auth-guard'
import { HTTP_STATUS } from '@/constants/http-status'
import { ERROR_CODE } from '@/constants/error-codes'
import type { RetryableRequestConfig } from './types'

function makeConfig(headers?: Record<string, string>): RetryableRequestConfig {
  return { headers: headers ?? {} } as unknown as RetryableRequestConfig
}

describe('auth-guard', () => {
  describe('shouldTriggerRefresh', () => {
    it('returns false when isAuthRequest is true', () => {
      expect(shouldTriggerRefresh(401, null, true, makeConfig())).toBe(false)
    })

    it('returns false when originalRequest is undefined', () => {
      expect(shouldTriggerRefresh(401, null, false, undefined)).toBe(false)
    })

    it('returns false when request already retried', () => {
      const config = makeConfig()
      config._retry = true
      expect(shouldTriggerRefresh(401, null, false, config)).toBe(false)
    })

    it('returns false when request uses API key', () => {
      const config = makeConfig({ 'X-API-Key': 'leo_key' })
      expect(shouldTriggerRefresh(401, null, false, config)).toBe(false)
    })

    it('returns false when session is evicted', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { code: ERROR_CODE.SESSION_EVICTED },
        },
      }
      expect(shouldTriggerRefresh(401, error, false, makeConfig())).toBe(false)
    })

    it('returns true when status is 401', () => {
      const error = { isAxiosError: true }
      expect(
        shouldTriggerRefresh(HTTP_STATUS.UNAUTHORIZED, error, false, makeConfig()),
      ).toBe(true)
    })

    it('returns true when unauthorized payload', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { code: ERROR_CODE.UNAUTHORIZED },
        },
      }
      expect(shouldTriggerRefresh(200, error, false, makeConfig())).toBe(true)
    })

    it('returns true when anonymous forbidden', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: HTTP_STATUS.FORBIDDEN,
          data: { error: 'Forbidden', code: null },
        },
      }
      expect(shouldTriggerRefresh(403, error, false, makeConfig())).toBe(true)
    })

    it('returns false for non-axios error in anonymous forbidden', () => {
      const error = { response: { status: 403, data: { error: 'Forbidden' } } }
      expect(shouldTriggerRefresh(403, error, false, makeConfig())).toBe(false)
    })

    it('returns false when forbidden has a code', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: HTTP_STATUS.FORBIDDEN,
          data: { error: 'Forbidden', code: '4030' },
        },
      }
      expect(shouldTriggerRefresh(403, error, false, makeConfig())).toBe(false)
    })

    it('detects unauthorized via Chinese message text', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { message: '未登录或登录已失效' },
        },
      }
      expect(shouldTriggerRefresh(200, error, false, makeConfig())).toBe(true)
    })

    it('returns false for non-axios error in shouldTriggerRefresh', () => {
      expect(shouldTriggerRefresh(401, 'string error', false, makeConfig())).toBe(true)
    })
  })

  describe('shouldClearAuthState', () => {
    it('returns false when isAuthRequest is true', () => {
      expect(shouldClearAuthState(401, null, true, makeConfig())).toBe(false)
    })

    it('returns true when status is 401', () => {
      const error = { isAxiosError: true }
      expect(
        shouldClearAuthState(HTTP_STATUS.UNAUTHORIZED, error, false, makeConfig()),
      ).toBe(true)
    })

    it('returns true when unauthorized payload code', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { code: ERROR_CODE.UNAUTHORIZED },
        },
      }
      expect(shouldClearAuthState(200, error, false, makeConfig())).toBe(true)
    })

    it('returns true when session evicted code', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { code: ERROR_CODE.SESSION_EVICTED },
        },
      }
      expect(shouldClearAuthState(200, error, false, makeConfig())).toBe(true)
    })

    it('returns true when anonymous forbidden', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: HTTP_STATUS.FORBIDDEN,
          data: { error: 'Forbidden', code: null },
        },
      }
      expect(shouldClearAuthState(403, error, false, makeConfig())).toBe(true)
    })

    it('returns false when no auth issue detected', () => {
      expect(shouldClearAuthState(200, null, false, makeConfig())).toBe(false)
    })

    it('returns false for non-axios non-auth errors', () => {
      expect(shouldClearAuthState(500, { isAxiosError: false }, false, makeConfig())).toBe(false)
    })
  })
})
