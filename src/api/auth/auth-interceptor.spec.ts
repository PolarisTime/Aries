import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTP_STATUS } from '@/constants/http-status'
import { ERROR_CODE } from '@/constants/error-codes'

const getTokenMock = vi.hoisted(() => vi.fn())
const isApiKeyTokenMock = vi.hoisted(() => vi.fn())
const getRequestPathMock = vi.hoisted(() => vi.fn())
const isExactAuthEndpointMock = vi.hoisted(() => vi.fn())
const shouldTriggerRefreshMock = vi.hoisted(() => vi.fn())
const shouldClearAuthStateMock = vi.hoisted(() => vi.fn())
const getRefreshPromiseMock = vi.hoisted(() => vi.fn())
const setRefreshPromiseMock = vi.hoisted(() => vi.fn())
const refreshAccessTokenMock = vi.hoisted(() => vi.fn())
const handleAuthFailureMock = vi.hoisted(() => vi.fn())
const resetAuthFailureHandlingMock = vi.hoisted(() => vi.fn())
const retryWithTokenMock = vi.hoisted(() => vi.fn())
const normalizeErrorMessageMock = vi.hoisted(() => vi.fn())
const isCanceledRequestErrorMock = vi.hoisted(() => vi.fn())
const markHandledRequestErrorMock = vi.hoisted(() => vi.fn())
const messageErrorMock = vi.hoisted(() => vi.fn())

vi.mock('@/utils/storage', () => ({ getToken: getTokenMock }))
vi.mock('@/utils/auth-token', () => ({ isApiKeyToken: isApiKeyTokenMock }))
vi.mock('@/utils/route-helpers', () => ({
  getRequestPath: getRequestPathMock,
  isExactAuthEndpoint: isExactAuthEndpointMock,
}))
vi.mock('@/utils/antd-app', () => ({ message: { error: messageErrorMock } }))
vi.mock('./auth-guard', () => ({
  shouldTriggerRefresh: shouldTriggerRefreshMock,
  shouldClearAuthState: shouldClearAuthStateMock,
}))
vi.mock('./auth-state', () => ({
  getRefreshPromise: getRefreshPromiseMock,
  setRefreshPromise: setRefreshPromiseMock,
  refreshAccessToken: refreshAccessTokenMock,
  handleAuthFailure: handleAuthFailureMock,
  resetAuthFailureHandling: resetAuthFailureHandlingMock,
  retryWithToken: retryWithTokenMock,
}))
vi.mock('./error-messages', () => ({
  normalizeErrorMessage: normalizeErrorMessageMock,
}))
vi.mock('@/api/request-errors', () => ({
  isCanceledRequestError: isCanceledRequestErrorMock,
  markHandledRequestError: markHandledRequestErrorMock,
}))

import axios from 'axios'
import { setupAuthInterceptors } from './auth-interceptor'

function setupHttp() {
  const instance = axios.create()
  // Prevent real HTTP requests from being made in tests
  vi.spyOn(instance, 'request').mockResolvedValue({ data: {} } as never)
  setupAuthInterceptors(instance)
  return instance
}

describe('auth-interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRequestPathMock.mockReturnValue('/api/test')
    isExactAuthEndpointMock.mockReturnValue(false)

    getTokenMock.mockReturnValue('')
    isApiKeyTokenMock.mockReturnValue(false)

    shouldTriggerRefreshMock.mockReturnValue(false)
    shouldClearAuthStateMock.mockReturnValue(false)
    isCanceledRequestErrorMock.mockReturnValue(false)
    normalizeErrorMessageMock.mockImplementation(
      (msg: string) => msg || '请求失败',
    )
  })

  describe('request interceptor', () => {
    it('skips auth headers when no token', async () => {
      const http = setupHttp()
      getTokenMock.mockReturnValue('')
      const config = await http.interceptors.request.handlers[0].fulfilled({
        url: '/api/test',
        headers: { delete: vi.fn(), set: vi.fn() },
      })
      expect(config.headers.set).not.toHaveBeenCalled()
    })

    it('sets Bearer token for JWT token', async () => {
      const http = setupHttp()
      getTokenMock.mockReturnValue('my-jwt')
      isApiKeyTokenMock.mockReturnValue(false)
      const set = vi.fn()
      const del = vi.fn()

      await http.interceptors.request.handlers[0].fulfilled({
        url: '/api/test',
        headers: { set, delete: del },
      })

      expect(del).toHaveBeenCalledWith('X-API-Key')
      expect(set).toHaveBeenCalledWith('Authorization', 'Bearer my-jwt')
      expect(resetAuthFailureHandlingMock).toHaveBeenCalled()
    })

    it('sets X-API-Key for API key token', async () => {
      const http = setupHttp()
      getTokenMock.mockReturnValue('leo_key_abc')
      isApiKeyTokenMock.mockReturnValue(true)
      const set = vi.fn()
      const del = vi.fn()

      await http.interceptors.request.handlers[0].fulfilled({
        url: '/api/test',
        headers: { set, delete: del },
      })

      expect(del).toHaveBeenCalledWith('Authorization')
      expect(set).toHaveBeenCalledWith('X-API-Key', 'leo_key_abc')
    })

    it('skips auth for public endpoints', async () => {
      const http = setupHttp()
      getTokenMock.mockReturnValue('my-jwt')
      getRequestPathMock.mockReturnValue('/setup/status')

      const config = await http.interceptors.request.handlers[0].fulfilled({
        url: '/setup/status',
        headers: { set: vi.fn(), delete: vi.fn() },
      })

      expect(config.headers.set).not.toHaveBeenCalled()
    })

    it('skips auth for auth endpoints', async () => {
      const http = setupHttp()
      getTokenMock.mockReturnValue('my-jwt')
      isExactAuthEndpointMock.mockImplementation(
        (url: string, endpoint: string) => endpoint === '/auth/login',
      )

      const config = await http.interceptors.request.handlers[0].fulfilled({
        url: '/auth/login',
        headers: { set: vi.fn(), delete: vi.fn() },
      })

      expect(config.headers.set).not.toHaveBeenCalled()
    })

    it('handles headers without set method (AxiosHeaders fallback)', async () => {
      const http = setupHttp()
      getTokenMock.mockReturnValue('my-jwt')
      isApiKeyTokenMock.mockReturnValue(false)

      const config = await http.interceptors.request.handlers[0].fulfilled({
        url: '/api/test',
        headers: { Authorization: 'old', 'X-API-Key': 'old' },
      })

      const h = config.headers as Record<string, string | undefined>
      expect(h.Authorization).toBe('Bearer my-jwt')
      expect(h['X-API-Key']).toBeUndefined()
    })

    it('handles headers without set method for API key', async () => {
      const http = setupHttp()
      getTokenMock.mockReturnValue('leo_key_xyz')
      isApiKeyTokenMock.mockReturnValue(true)

      const config = await http.interceptors.request.handlers[0].fulfilled({
        url: '/api/test',
        headers: { Authorization: 'old', 'X-API-Key': 'old' },
      })

      const h = config.headers as Record<string, string | undefined>
      expect(h.Authorization).toBeUndefined()
      expect(h['X-API-Key']).toBe('leo_key_xyz')
    })
  })

  describe('response interceptor', () => {
    it('passes through successful response data', async () => {
      const http = setupHttp()
      const result = await http.interceptors.response.handlers[0].fulfilled({
        data: { code: 0, data: 'ok' },
      })
      expect(result).toEqual({ code: 0, data: 'ok' })
    })

    it('handles canceled requests', async () => {
      const http = setupHttp()
      isCanceledRequestErrorMock.mockReturnValue(true)
      markHandledRequestErrorMock.mockImplementation(() => {})

      const error = { message: '请求已取消', config: { url: '/test' } }
      await expect(
        http.interceptors.response.handlers[0].rejected(error),
      ).rejects.toThrow('请求已取消')
    })

    it('cancels and normalizes canceled error', async () => {
      const http = setupHttp()
      isCanceledRequestErrorMock.mockReturnValue(true)

      const error = {
        message: 'canceled',
        config: { url: '/test' },
        response: {
          headers: { get: () => 'trace-123' },
          data: {},
        },
      }
      const promise = http.interceptors.response.handlers[0].rejected(error)
      const err = await promise.catch((e: Error) => e)
      expect(err.message).toBe('canceled')
    })

    it('triggers refresh on shouldTriggerRefresh', async () => {
      const http = setupHttp()
      shouldTriggerRefreshMock.mockReturnValue(true)
      getRefreshPromiseMock.mockReturnValue(null)
      refreshAccessTokenMock.mockResolvedValue(undefined)
      // Prevent retry call from causing unhandled rejection
      const retryResult = Promise.resolve({ data: {} })
      const retryFn = vi.fn().mockReturnValue(retryResult)

      const config = { url: '/api/data', _retry: false, headers: {} }
      const error = {
        isAxiosError: true,
        response: { status: 401, data: {} },
        config,
        message: 'Unauthorized',
      }

      const promise = http.interceptors.response.handlers[0].rejected(error)
      promise.catch(() => {}) // suppress unhandled rejection

      await vi.waitFor(() => {
        expect(shouldTriggerRefreshMock).toHaveBeenCalled()
        expect(refreshAccessTokenMock).toHaveBeenCalled()
      })
    })

    it('reuses existing refresh promise', async () => {
      const http = setupHttp()
      shouldTriggerRefreshMock.mockReturnValue(true)
      const existingPromise = Promise.resolve()
      getRefreshPromiseMock.mockReturnValue(existingPromise)

      const config = { url: '/api/data', _retry: false, headers: {} }
      const error = {
        isAxiosError: true,
        response: { status: 401, data: {} },
        config,
        message: 'Unauthorized',
      }

      const promise = http.interceptors.response.handlers[0].rejected(error)
      promise.catch(() => {}) // suppress unhandled rejection

      await vi.waitFor(() => {
        expect(refreshAccessTokenMock).not.toHaveBeenCalled()
      })
    })

    it('handles refresh failure', async () => {
      const http = setupHttp()
      shouldTriggerRefreshMock.mockReturnValue(true)
      getRefreshPromiseMock.mockReturnValue(null)

      const refreshError = {
        isAxiosError: true,
        response: { status: 500, data: { message: '刷新失败' } },
        message: '刷新失败',
      }
      refreshAccessTokenMock.mockRejectedValue(refreshError)
      normalizeErrorMessageMock.mockReturnValue('刷新失败')

      const config = { url: '/api/data', headers: {} }
      const error = {
        isAxiosError: true,
        response: { status: 401, data: {} },
        config,
        message: 'Unauthorized',
      }

      await expect(
        http.interceptors.response.handlers[0].rejected(error),
      ).rejects.toThrow('刷新失败')
      expect(handleAuthFailureMock).toHaveBeenCalledWith('刷新失败')
    })

    it('handles refresh failure with non-axios error', async () => {
      const http = setupHttp()
      shouldTriggerRefreshMock.mockReturnValue(true)
      getRefreshPromiseMock.mockReturnValue(null)

      const refreshError = new Error('网络异常')
      refreshAccessTokenMock.mockRejectedValue(refreshError)
      normalizeErrorMessageMock.mockReturnValue('网络异常')

      const config = { url: '/api/data', headers: {} }
      const error = {
        isAxiosError: true,
        response: { status: 401, data: {} },
        config,
        message: 'Unauthorized',
      }

      await expect(
        http.interceptors.response.handlers[0].rejected(error),
      ).rejects.toThrow('网络异常')
    })

    it('clears auth state on shouldClearAuthState', async () => {
      const http = setupHttp()
      shouldTriggerRefreshMock.mockReturnValue(false)
      shouldClearAuthStateMock.mockReturnValue(true)
      normalizeErrorMessageMock.mockReturnValue('登录已失效')

      const error = {
        isAxiosError: true,
        response: { status: 401, data: { message: '登录已失效' } },
        config: { url: '/api/data', headers: {} },
        message: '登录已失效',
      }

      await expect(
        http.interceptors.response.handlers[0].rejected(error),
      ).rejects.toThrow('登录已失效')
      expect(handleAuthFailureMock).toHaveBeenCalledWith('登录已失效')
    })

    it('shows error message when not clearing auth state', async () => {
      const http = setupHttp()
      shouldTriggerRefreshMock.mockReturnValue(false)
      shouldClearAuthStateMock.mockReturnValue(false)
      normalizeErrorMessageMock.mockReturnValue('业务错误')

      const error = {
        isAxiosError: true,
        response: { status: 400, data: { message: '业务错误' } },
        config: { url: '/api/data', headers: {} },
        message: '业务错误',
      }

      await expect(
        http.interceptors.response.handlers[0].rejected(error),
      ).rejects.toThrow('业务错误')
      expect(messageErrorMock).toHaveBeenCalledWith('业务错误')
    })

    it('handles error without config gracefully', async () => {
      const http = setupHttp()
      const error = {
        isAxiosError: true,
        response: { status: 500, data: { message: '服务器错误' } },
        message: '服务器错误',
      }

      await expect(
        http.interceptors.response.handlers[0].rejected(error),
      ).rejects.toThrow()
    })
  })

  describe('guards against double setup', () => {
    it('only sets up interceptors once', () => {
      const instance = axios.create()
      const spy = vi.spyOn(instance.interceptors.request, 'use')

      setupAuthInterceptors(instance)
      setupAuthInterceptors(instance)
      setupAuthInterceptors(instance)

      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
