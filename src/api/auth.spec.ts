import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpPostMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
const authHttpPostMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())
const isRefreshTokenReuseConflictMock = vi.hoisted(() => vi.fn())
const waitForRefreshTokenReuseRetryMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { post: httpPostMock, get: httpGetMock },
  authHttp: { post: authHttpPostMock },
}))

vi.mock('@/api/auth/auth-state', () => ({
  isRefreshTokenReuseConflict: isRefreshTokenReuseConflictMock,
  waitForRefreshTokenReuseRetry: waitForRefreshTokenReuseRetryMock,
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    AUTH_LOGIN: '/auth/login',
    AUTH_CAPTCHA: '/auth/captcha',
    AUTH_LOGIN_2FA: '/auth/login-2fa',
    AUTH_LOGOUT: '/auth/logout',
    AUTH_REFRESH: '/auth/refresh',
    AUTH_PING: '/auth/ping',
    HEALTH: '/health',
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import {
  login,
  fetchCaptcha,
  login2fa,
  logout,
  refreshSession,
  pingAuth,
  checkAuthPing,
  fetchBackendHealth,
} from './auth'

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
    isRefreshTokenReuseConflictMock.mockReturnValue(false)
  })

  describe('login', () => {
    it('sends login credentials', async () => {
      const mockResponse = { code: 0, data: { accessToken: 'token' } }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await login({
        loginName: 'admin',
        password: '123456',
        captchaId: 'cap-1',
        captchaCode: 'abcd',
      })

      expect(httpPostMock).toHaveBeenCalledWith('/auth/login', {
        loginName: 'admin',
        password: '123456',
        captchaId: 'cap-1',
        captchaCode: 'abcd',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('fetchCaptcha', () => {
    it('fetches captcha data', async () => {
      const mockResponse = { code: 0, data: { captchaId: '1', image: 'base64' } }
      httpGetMock.mockResolvedValue(mockResponse)

      const result = await fetchCaptcha()

      expect(httpGetMock).toHaveBeenCalledWith('/auth/captcha')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('login2fa', () => {
    it('sends 2FA login payload', async () => {
      const mockResponse = { code: 0, data: { accessToken: 'token' } }
      httpPostMock.mockResolvedValue(mockResponse)

      const result = await login2fa({ totpCode: '123456' })

      expect(httpPostMock).toHaveBeenCalledWith('/auth/login-2fa', { totpCode: '123456' })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('logout', () => {
    it('sends logout request', async () => {
      httpPostMock.mockResolvedValue({})

      await logout()

      expect(httpPostMock).toHaveBeenCalledWith('/auth/logout', {})
    })
  })

  describe('refreshSession', () => {
    it('refreshes and returns login data', async () => {
      authHttpPostMock.mockResolvedValue({
        data: { data: { accessToken: 'new-token' } },
      })

      const result = await refreshSession()

      expect(authHttpPostMock).toHaveBeenCalledWith('/auth/refresh', {})
      expect(result).toEqual({ accessToken: 'new-token' })
    })

    it('retries on refresh token reuse conflict', async () => {
      const conflictError = new Error('conflict')
      authHttpPostMock
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({
          data: { data: { accessToken: 'retried-token' } },
        })
      isRefreshTokenReuseConflictMock.mockReturnValue(true)
      waitForRefreshTokenReuseRetryMock.mockResolvedValue(undefined)

      const result = await refreshSession()

      expect(waitForRefreshTokenReuseRetryMock).toHaveBeenCalled()
      expect(result).toEqual({ accessToken: 'retried-token' })
    })

    it('re-throws non-conflict errors', async () => {
      const error = new Error('network error')
      authHttpPostMock.mockRejectedValue(error)
      isRefreshTokenReuseConflictMock.mockReturnValue(false)

      await expect(refreshSession()).rejects.toThrow('network error')
    })
  })

  describe('pingAuth', () => {
    it('pings auth service', async () => {
      const mockResponse = { code: 0, data: 'pong' }
      httpGetMock.mockResolvedValue(mockResponse)

      const result = await pingAuth()

      expect(httpGetMock).toHaveBeenCalledWith('/auth/ping')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('checkAuthPing', () => {
    it('returns true on success', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: 'pong' })

      const result = await checkAuthPing()

      expect(result).toBe(true)
    })

    it('throws on failure', async () => {
      assertApiSuccessMock.mockImplementation(() => {
        throw new Error('authServiceUnavailable')
      })
      httpGetMock.mockResolvedValue({ code: -1 })

      await expect(checkAuthPing()).rejects.toThrow('authServiceUnavailable')
    })
  })

  describe('fetchBackendHealth', () => {
    it('fetches health status', async () => {
      const healthData = { status: 'UP', app: 'aries', traceId: 't1', timestamp: '2024-01-01' }
      httpGetMock.mockResolvedValue({ code: 0, data: healthData })

      const result = await fetchBackendHealth()

      expect(httpGetMock).toHaveBeenCalledWith('/health')
      expect(result).toEqual(healthData)
    })
  })
})
