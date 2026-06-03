import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const httpDeleteMock = vi.hoisted(() => vi.fn())
const getApiMessageMock = vi.hoisted(() => vi.fn())
const setupAuthInterceptorsMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/http', () => ({
  authHttp: vi.fn(),
  http: {
    get: httpGetMock,
    post: httpPostMock,
    put: httpPutMock,
    delete: httpDeleteMock,
    get instance() {
      return { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
    },
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: getApiMessageMock,
}))

vi.mock('./auth/auth-interceptor', () => ({
  setupAuthInterceptors: setupAuthInterceptorsMock,
}))

import {
  ensureApiClientSetup,
  isSuccessCode,
  assertApiSuccess,
  restGet,
  restPost,
  restPut,
  restDelete,
} from './client'

describe('client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getApiMessageMock.mockReturnValue('请求失败')
  })

  describe('ensureApiClientSetup', () => {
    it('sets up auth interceptors once', () => {
      ensureApiClientSetup()
      ensureApiClientSetup()
      ensureApiClientSetup()
      expect(setupAuthInterceptorsMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('isSuccessCode', () => {
    it('returns true for code 0', () => {
      expect(isSuccessCode(0)).toBe(true)
    })

    it('returns true for code "0"', () => {
      expect(isSuccessCode('0')).toBe(true)
    })

    it('returns false for non-zero code', () => {
      expect(isSuccessCode(4000)).toBe(false)
      expect(isSuccessCode(4010)).toBe(false)
    })

    it('treats null as success (Number(null) === 0)', () => {
      expect(isSuccessCode(null)).toBe(true)
    })

    it('treats undefined as success (Number(undefined) => NaN !== 0)', () => {
      expect(isSuccessCode(undefined)).toBe(false)
    })
  })

  describe('assertApiSuccess', () => {
    it('returns response on success code', () => {
      const response = { code: 0, data: 'ok' }
      expect(assertApiSuccess(response)).toEqual(response)
    })

    it('throws on non-success code', () => {
      expect(() => assertApiSuccess({ code: 4000, message: '错误' })).toThrow(
        '错误',
      )
    })

    it('uses fallback message when message is missing', () => {
      getApiMessageMock.mockReturnValue('请求失败')
      expect(() => assertApiSuccess({ code: 4000 })).toThrow('请求失败')
    })

    it('uses fallbackMessage parameter', () => {
      expect(() =>
        assertApiSuccess({ code: 4000 }, '自定义错误'),
      ).toThrow('自定义错误')
    })

    it('attaches traceId to the error', () => {
      try {
        assertApiSuccess({ code: 4000, traceId: 'trace-123' })
      } catch (err) {
        expect((err as Error & { traceId: string }).traceId).toBe('trace-123')
      }
    })
  })

  describe('restGet', () => {
    it('calls http.get with params', async () => {
      httpGetMock.mockResolvedValue('ok')
      const result = await restGet('/api/test', { keyword: 'test' })
      expect(httpGetMock).toHaveBeenCalledWith('/api/test', {
        params: { keyword: 'test' },
      })
      expect(result).toBe('ok')
    })

    it('works without params', async () => {
      httpGetMock.mockResolvedValue('ok')
      await restGet('/api/test')
      expect(httpGetMock).toHaveBeenCalledWith('/api/test', { params: undefined })
    })
  })

  describe('restPost', () => {
    it('calls http.post with data', async () => {
      httpPostMock.mockResolvedValue('ok')
      const result = await restPost('/api/test', { name: 'test' })
      expect(httpPostMock).toHaveBeenCalledWith('/api/test', { name: 'test' })
      expect(result).toBe('ok')
    })
  })

  describe('restPut', () => {
    it('calls http.put with data', async () => {
      httpPutMock.mockResolvedValue('ok')
      const result = await restPut('/api/test', { name: 'test' })
      expect(httpPutMock).toHaveBeenCalledWith('/api/test', { name: 'test' })
      expect(result).toBe('ok')
    })
  })

  describe('restDelete', () => {
    it('calls http.delete with params', async () => {
      httpDeleteMock.mockResolvedValue('ok')
      const result = await restDelete('/api/test/1', { id: '1' })
      expect(httpDeleteMock).toHaveBeenCalledWith('/api/test/1', {
        params: { id: '1' },
      })
      expect(result).toBe('ok')
    })
  })
})
