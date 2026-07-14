import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ERROR_CODE } from '@/constants/error-codes'
import { HTTP_STATUS } from '@/constants/http-status'

const authHttpPostMock = vi.hoisted(() => vi.fn())
const getTokenMock = vi.hoisted(() => vi.fn())
const clearTokenMock = vi.hoisted(() => vi.fn())
const clearStoredUserMock = vi.hoisted(() => vi.fn())
const clearTokenExpiresAtMock = vi.hoisted(() => vi.fn())
const getAuthPersistenceModeMock = vi.hoisted(() => vi.fn())
const getTokenExpiresAtMock = vi.hoisted(() => vi.fn())
const setAuthSessionMock = vi.hoisted(() => vi.fn())
const getApiMessageMock = vi.hoisted(() => vi.fn())
const isApiKeyTokenMock = vi.hoisted(() => vi.fn())
const messageErrorMock = vi.hoisted(() => vi.fn())
const getCurrentAppRouteMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/http', () => ({
  authHttp: { post: authHttpPostMock },
}))

vi.mock('@/utils/storage', () => ({
  getToken: getTokenMock,
  clearToken: clearTokenMock,
  clearStoredUser: clearStoredUserMock,
  clearTokenExpiresAt: clearTokenExpiresAtMock,
  getAuthPersistenceMode: getAuthPersistenceModeMock,
  getTokenExpiresAt: getTokenExpiresAtMock,
  setAuthSession: setAuthSessionMock,
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: getApiMessageMock,
}))

vi.mock('@/utils/auth-token', () => ({
  isApiKeyToken: isApiKeyTokenMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: { error: messageErrorMock },
}))

vi.mock('@/utils/route-helpers', () => ({
  getCurrentAppRoute: getCurrentAppRouteMock,
}))

const createRefreshSuccessResponse = (data: Record<string, unknown> = {}) => ({
  data: {
    code: ERROR_CODE.SUCCESS,
    data: {
      accessToken: 'new-token',
      user: { id: 1, loginName: 'admin' },
      expiresIn: 3600,
      refreshExpiresIn: 7200,
      ...data,
    },
  },
})

import {
  getRefreshPromise,
  handleAuthFailure,
  isRefreshTokenReuseConflict,
  refreshAccessToken,
  resetAuthFailureHandling,
  retryWithToken,
  setRefreshPromise,
  waitForRefreshTokenReuseRetry,
} from './auth-state'

describe('auth-state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRefreshPromise(null)
    resetAuthFailureHandling()
    getCurrentAppRouteMock.mockReturnValue('/dashboard')

    const _origDispatch = globalThis.window.dispatchEvent
    globalThis.window.dispatchEvent = vi.fn()
    Object.defineProperty(globalThis.window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
    vi.unstubAllGlobals()
    globalThis.localStorage.clear()
    setRefreshPromise(null)
    resetAuthFailureHandling()
  })

  describe('handleAuthFailure', () => {
    it('clears auth state and redirects to login', () => {
      handleAuthFailure('登录已失效')

      expect(clearTokenMock).toHaveBeenCalled()
      expect(clearStoredUserMock).toHaveBeenCalled()
      expect(clearTokenExpiresAtMock).toHaveBeenCalled()
      expect(messageErrorMock).toHaveBeenCalledWith('登录已失效')
    })

    it('does nothing if already handled', () => {
      handleAuthFailure('第一次')
      handleAuthFailure('第二次')

      expect(messageErrorMock).toHaveBeenCalledTimes(1)
      expect(messageErrorMock).toHaveBeenCalledWith('第一次')
    })

    it('does not redirect if already on /login', () => {
      getCurrentAppRouteMock.mockReturnValue('/login?redirect=/dashboard')
      handleAuthFailure('登录已失效')

      expect(globalThis.window.location.href).not.toContain('/login?redirect=')
    })

    it('uses safe route for non-slash routes', () => {
      getCurrentAppRouteMock.mockReturnValue('dashboard')
      handleAuthFailure('err')
      expect(globalThis.window.location.href).toContain(
        '/login?redirect=%2Fdashboard',
      )
    })

    it('does not redirect outside browser globals', () => {
      vi.stubGlobal('window', undefined)

      handleAuthFailure('登录已失效')

      expect(messageErrorMock).toHaveBeenCalledWith('登录已失效')
      expect(getCurrentAppRouteMock).not.toHaveBeenCalled()
    })
  })

  describe('resetAuthFailureHandling', () => {
    it('re-enables handleAuthFailure after reset', () => {
      handleAuthFailure('第一次')
      resetAuthFailureHandling()
      handleAuthFailure('第二次')

      expect(messageErrorMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('refreshAccessToken', () => {
    const successResponse = createRefreshSuccessResponse()

    it('refreshes token successfully', async () => {
      authHttpPostMock.mockResolvedValue(successResponse)
      getAuthPersistenceModeMock.mockReturnValue('local')

      await refreshAccessToken()

      expect(authHttpPostMock).toHaveBeenCalledWith('/auth/refresh', {})
      expect(setAuthSessionMock).toHaveBeenCalledWith(
        { id: 1, loginName: 'admin' },
        'new-token',
        3600,
        'local',
      )
      expect(localStorage.getItem('aries-refresh-expires-at')).toBeTruthy()
      expect(localStorage.getItem('aries-refresh-warned')).toBeNull()
    })

    it('retries on refresh token reuse conflict', async () => {
      const conflictError = {
        isAxiosError: true,
        response: {
          status: HTTP_STATUS.CONFLICT,
          data: { code: ERROR_CODE.REFRESH_TOKEN_REUSE_CONFLICT },
        },
      }
      authHttpPostMock.mockRejectedValueOnce(conflictError)
      authHttpPostMock.mockResolvedValueOnce(successResponse)
      getAuthPersistenceModeMock.mockReturnValue('local')

      await refreshAccessToken()
      expect(authHttpPostMock).toHaveBeenCalledTimes(2)
    })

    it('detects reuse conflict when backend code is serialized as a string', () => {
      const conflictError = {
        isAxiosError: true,
        response: {
          status: HTTP_STATUS.CONFLICT,
          data: { code: String(ERROR_CODE.REFRESH_TOKEN_REUSE_CONFLICT) },
        },
      }

      expect(isRefreshTokenReuseConflict(conflictError)).toBe(true)
    })

    it('throws when payload code is not success', async () => {
      authHttpPostMock.mockResolvedValue({
        data: { code: 4000, message: '业务错误' },
      })

      await expect(refreshAccessToken()).rejects.toThrow('业务错误')
    })

    it('throws when payload has no accessToken', async () => {
      getApiMessageMock.mockReturnValue('登录状态已过期')
      authHttpPostMock.mockResolvedValue({
        data: {
          code: ERROR_CODE.SUCCESS,
          data: { user: { id: 1 }, expiresIn: 3600 },
        },
      })

      await expect(refreshAccessToken()).rejects.toThrow('登录状态已过期')
    })

    it('throws backend message when payload has no login data', async () => {
      authHttpPostMock.mockResolvedValue({
        data: {
          code: ERROR_CODE.SUCCESS,
          message: '登录状态失效',
        },
      })

      await expect(refreshAccessToken()).rejects.toThrow('登录状态失效')
    })

    it('throws when payload has no user', async () => {
      getApiMessageMock.mockReturnValue('登录状态已过期')
      authHttpPostMock.mockResolvedValue({
        data: {
          code: ERROR_CODE.SUCCESS,
          data: { accessToken: 'token', expiresIn: 3600 },
        },
      })

      await expect(refreshAccessToken()).rejects.toThrow('登录状态已过期')
    })

    it('throws non-conflict axios errors', async () => {
      const networkError = {
        isAxiosError: true,
        response: { status: 500, data: { message: '服务器错误' } },
        message: '服务器错误',
      }
      authHttpPostMock.mockRejectedValue(networkError)

      await expect(refreshAccessToken()).rejects.toThrow()
    })

    it('uses fallback message from getApiMessage on empty payload message', async () => {
      getApiMessageMock.mockReturnValue('刷新登录状态失败')
      authHttpPostMock.mockResolvedValue({
        data: { code: 4000, message: '' },
      })

      await expect(refreshAccessToken()).rejects.toThrow('刷新登录状态失败')
    })

    it('refreshes without browser globals', async () => {
      vi.stubGlobal('window', undefined)
      authHttpPostMock.mockResolvedValue(successResponse)
      getAuthPersistenceModeMock.mockReturnValue('session')

      await refreshAccessToken()

      expect(setAuthSessionMock).toHaveBeenCalledWith(
        { id: 1, loginName: 'admin' },
        'new-token',
        3600,
        'session',
      )
    })

    it('does not persist refresh expiry when refreshExpiresIn is absent', async () => {
      authHttpPostMock.mockResolvedValue(
        createRefreshSuccessResponse({ refreshExpiresIn: undefined }),
      )
      getAuthPersistenceModeMock.mockReturnValue('local')

      await refreshAccessToken()

      expect(localStorage.getItem('aries-refresh-expires-at')).toBeNull()
    })

    it.each([
      {
        name: 'uses one fifth of remaining lifetime for medium sessions',
        expiresInMs: 10 * 60 * 1000,
        expectedDelayMs: 8 * 60 * 1000,
      },
      {
        name: 'caps refresh advance at five minutes for long sessions',
        expiresInMs: 60 * 60 * 1000,
        expectedDelayMs: 55 * 60 * 1000,
      },
      {
        name: 'keeps at least one minute of refresh advance',
        expiresInMs: 2 * 60 * 1000,
        expectedDelayMs: 60 * 1000,
      },
      {
        name: 'caps timer delay at the platform maximum',
        expiresInMs: 10 * 365 * 24 * 60 * 60 * 1000,
        expectedDelayMs: 2_147_483_647,
      },
    ])('schedules pre-refresh and $name', async ({
      expiresInMs,
      expectedDelayMs,
    }) => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      getTokenExpiresAtMock.mockReturnValue(Date.now() + expiresInMs)
      authHttpPostMock.mockResolvedValue(successResponse)

      await refreshAccessToken()

      expect(setTimeoutSpy).toHaveBeenLastCalledWith(
        expect.any(Function),
        expectedDelayMs,
      )
    })

    it('runs scheduled pre-refresh and clears the in-flight promise', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      getTokenExpiresAtMock.mockReturnValue(Date.now() + 10 * 60 * 1000)
      authHttpPostMock.mockResolvedValue(successResponse)

      await refreshAccessToken()
      await vi.advanceTimersByTimeAsync(8 * 60 * 1000)

      expect(authHttpPostMock).toHaveBeenCalledTimes(2)
      expect(getRefreshPromise()).toBeNull()
    })

    it('waits for an existing refresh promise when immediate pre-refresh runs', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const existingRefresh = Promise.resolve()
      setRefreshPromise(existingRefresh)
      getTokenExpiresAtMock.mockReturnValue(Date.now())
      authHttpPostMock.mockResolvedValue(successResponse)

      await refreshAccessToken()
      await existingRefresh

      expect(authHttpPostMock).toHaveBeenCalledTimes(1)
      expect(getRefreshPromise()).toBe(existingRefresh)
    })

    it('silently clears failed scheduled pre-refresh attempts', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      getTokenExpiresAtMock.mockReturnValue(Date.now() + 10 * 60 * 1000)
      authHttpPostMock
        .mockResolvedValueOnce(successResponse)
        .mockRejectedValueOnce(new Error('offline'))

      await refreshAccessToken()
      await vi.advanceTimersByTimeAsync(8 * 60 * 1000)

      expect(authHttpPostMock).toHaveBeenCalledTimes(2)
      expect(getRefreshPromise()).toBeNull()
    })

    it('does not clear a refresh promise replaced by another caller', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      getTokenExpiresAtMock.mockReturnValue(Date.now() + 10 * 60 * 1000)
      let resolveScheduledRefresh: (value: typeof successResponse) => void
      const scheduledRefreshResponse = new Promise<typeof successResponse>(
        (resolve) => {
          resolveScheduledRefresh = resolve
        },
      )
      authHttpPostMock
        .mockResolvedValueOnce(successResponse)
        .mockReturnValueOnce(scheduledRefreshResponse)

      await refreshAccessToken()
      vi.advanceTimersByTime(8 * 60 * 1000)
      const replacementRefresh = Promise.resolve()
      setRefreshPromise(replacementRefresh)
      resolveScheduledRefresh!(successResponse)
      await scheduledRefreshResponse
      await Promise.resolve()

      expect(getRefreshPromise()).toBe(replacementRefresh)
    })

    it('cancels a scheduled pre-refresh when auth failure clears state', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
      getTokenExpiresAtMock.mockReturnValue(Date.now() + 10 * 60 * 1000)
      authHttpPostMock.mockResolvedValue(successResponse)

      await refreshAccessToken()
      handleAuthFailure('登录已失效')

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('isRefreshTokenReuseConflict', () => {
    it('returns true for conflict with correct code', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: HTTP_STATUS.CONFLICT,
          data: { code: ERROR_CODE.REFRESH_TOKEN_REUSE_CONFLICT },
        },
      }
      expect(isRefreshTokenReuseConflict(error)).toBe(true)
    })

    it('returns false for non-axios error', () => {
      expect(isRefreshTokenReuseConflict('string')).toBe(false)
    })

    it('returns false for wrong status', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { code: ERROR_CODE.REFRESH_TOKEN_REUSE_CONFLICT },
        },
      }
      expect(isRefreshTokenReuseConflict(error)).toBe(false)
    })

    it('returns false for wrong code', () => {
      const error = {
        isAxiosError: true,
        response: { status: HTTP_STATUS.CONFLICT, data: { code: 4090 } },
      }
      expect(isRefreshTokenReuseConflict(error)).toBe(false)
    })

    it('returns false for axios errors without response details', () => {
      expect(isRefreshTokenReuseConflict({ isAxiosError: true })).toBe(false)
    })
  })

  describe('waitForRefreshTokenReuseRetry', () => {
    it('resolves after delay', async () => {
      vi.useFakeTimers()
      const promise = waitForRefreshTokenReuseRetry()
      vi.advanceTimersByTime(250)
      await expect(promise).resolves.toBeUndefined()
      vi.useRealTimers()
    })
  })

  describe('getRefreshPromise / setRefreshPromise', () => {
    it('returns null initially', () => {
      expect(getRefreshPromise()).toBeNull()
    })

    it('stores and returns the promise', () => {
      const p = Promise.resolve()
      setRefreshPromise(p)
      expect(getRefreshPromise()).toBe(p)
    })

    it('can be set to null', () => {
      setRefreshPromise(Promise.resolve())
      setRefreshPromise(null)
      expect(getRefreshPromise()).toBeNull()
    })
  })

  describe('retryWithToken', () => {
    it('does nothing if no token', () => {
      getTokenMock.mockReturnValue('')
      const request = { headers: { set: vi.fn() } }
      retryWithToken(request)
      expect(request.headers.set).not.toHaveBeenCalled()
    })

    it('does nothing if no headers', () => {
      getTokenMock.mockReturnValue('some-token')
      const request = {}
      retryWithToken(request)
    })

    it('sets Authorization with Bearer for regular token', () => {
      getTokenMock.mockReturnValue('jwt-token')
      isApiKeyTokenMock.mockReturnValue(false)
      const set = vi.fn()
      const request = { headers: { set, delete: vi.fn() } }

      retryWithToken(request)

      expect(request.headers.delete).toHaveBeenCalledWith('X-API-Key')
      expect(set).toHaveBeenCalledWith('Authorization', 'Bearer jwt-token')
    })

    it('sets X-API-Key for API key token', () => {
      getTokenMock.mockReturnValue('leo_key_123')
      isApiKeyTokenMock.mockReturnValue(true)
      const set = vi.fn()
      const request = { headers: { set, delete: vi.fn() } }

      retryWithToken(request)

      expect(request.headers.delete).toHaveBeenCalledWith('Authorization')
      expect(set).toHaveBeenCalledWith('X-API-Key', 'leo_key_123')
    })

    it('sets Authorization when header deletion is unavailable', () => {
      getTokenMock.mockReturnValue('jwt-token')
      isApiKeyTokenMock.mockReturnValue(false)
      const set = vi.fn()
      const request = { headers: { set } }

      retryWithToken(request)

      expect(set).toHaveBeenCalledWith('Authorization', 'Bearer jwt-token')
    })

    it('sets X-API-Key when header deletion is unavailable', () => {
      getTokenMock.mockReturnValue('leo_key_789')
      isApiKeyTokenMock.mockReturnValue(true)
      const set = vi.fn()
      const request = { headers: { set } }

      retryWithToken(request)

      expect(set).toHaveBeenCalledWith('X-API-Key', 'leo_key_789')
    })

    it('handles plain object headers without set function', () => {
      getTokenMock.mockReturnValue('jwt-token')
      isApiKeyTokenMock.mockReturnValue(false)
      const request = {
        headers: { 'X-API-Key': 'old', Authorization: 'old' } as Record<
          string,
          string
        >,
      }

      retryWithToken(request)

      expect(request.headers).toBeDefined()
      const headers = request.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer jwt-token')
      expect(headers['X-API-Key']).toBeUndefined()
    })

    it('handles plain object headers with API key token', () => {
      getTokenMock.mockReturnValue('leo_key_456')
      isApiKeyTokenMock.mockReturnValue(true)
      const request = {
        headers: { Authorization: 'Bearer old' } as Record<string, string>,
      }

      retryWithToken(request)

      const headers = request.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
      expect(headers['X-API-Key']).toBe('leo_key_456')
    })
  })
})
