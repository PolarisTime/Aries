import { STORAGE_KEYS } from '@/constants/storage'

type MockFunction = ReturnType<typeof vi.fn>

interface MockedHeaders {
  [key: string]: unknown
  Authorization?: string
  get(name: string): string | undefined
  set(name: string, value: string): void
}

type MockedAxiosInstance = MockFunction & {
  get: MockFunction
  post: MockFunction
  interceptors: {
    request: { use: MockFunction }
    response: { use: MockFunction }
  }
}

const messageError = vi.hoisted(() => vi.fn())

const axiosMockState = vi.hoisted(() => {
  function makeHeaders(source: Record<string, string | undefined> = {}): MockedHeaders {
    const values = { ...source }
    const headers: MockedHeaders = {
      ...values,
      get(name: string) {
        const key = Object.keys(values).find((item) => item.toLowerCase() === name.toLowerCase())
        return key ? values[key] : undefined
      },
      set(name: string, value: string) {
        values[name] = value
        headers[name] = value
      },
    }

    return headers
  }

  function createInstance(): MockedAxiosInstance {
    const instance = vi.fn() as MockedAxiosInstance
    instance.get = vi.fn()
    instance.post = vi.fn()
    instance.interceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    }

    return instance
  }

  const httpInstance = createInstance()
  const authInstance = createInstance()
  let createCount = 0

  return {
    authInstance,
    httpInstance,
    makeHeaders,
    nextCreate() {
      createCount += 1
      return createCount === 1 ? httpInstance : authInstance
    },
    reset() {
      createCount = 0
      for (const instance of [httpInstance, authInstance]) {
        instance.mockReset()
        instance.get.mockReset()
        instance.post.mockReset()
        instance.interceptors.request.use.mockReset()
        instance.interceptors.response.use.mockReset()
      }
    },
  }
})

vi.mock('axios', () => {
  const create = vi.fn(() => axiosMockState.nextCreate())
  const isAxiosError = (error: unknown) =>
    Boolean(error && typeof error === 'object' && (error as { isAxiosError?: boolean }).isAxiosError)

  return {
    default: {
      create,
      isAxiosError,
    },
    create,
    isAxiosError,
    AxiosHeaders: {
      from: (headers: Record<string, string | undefined>) => axiosMockState.makeHeaders(headers),
    },
  }
})

vi.mock('ant-design-vue', () => ({
  message: {
    error: messageError,
  },
}))

vi.mock('@/utils/env', () => ({
  apiBaseUrl: '/api',
}))

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function createUnauthorizedError(url: string) {
  return {
    isAxiosError: true,
    message: 'Request failed with status code 403',
    response: {
      status: 403,
      data: { code: 4010, message: '未登录' },
    },
    config: {
      url,
      headers: axiosMockState.makeHeaders({ Authorization: 'Bearer expired-access-token' }),
    },
  }
}

describe('api client auth refresh', () => {
  beforeEach(() => {
    vi.resetModules()
    axiosMockState.reset()
    messageError.mockReset()
    localStorage.clear()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/dashboard')
  })

  it('refreshes and retries when the server returns a 403 unauthorized payload', async () => {
    const { getToken, setToken } = await import('@/utils/storage')
    setToken('expired-access-token')

    axiosMockState.authInstance.post.mockResolvedValueOnce({
      data: {
        code: 0,
        data: {
          accessToken: 'fresh-access-token',
          tokenType: 'Bearer',
          expiresIn: 7200,
          user: {
            id: 1,
            loginName: 'admin',
            userName: 'Admin',
          },
        },
      },
    })
    axiosMockState.httpInstance.mockResolvedValueOnce({ code: 0, data: { records: [] } })

    const { http } = await import('@/api/client')
    const rejected = axiosMockState.httpInstance.interceptors.response.use.mock.calls[0]?.[1] as
      | ((error: unknown) => Promise<unknown>)
      | undefined

    expect(http).toBe(axiosMockState.httpInstance)
    expect(rejected).toBeTypeOf('function')

    const result = await rejected!(createUnauthorizedError('/customers'))

    const retriedRequest = axiosMockState.httpInstance.mock.calls[0]?.[0] as {
      _retry?: boolean
      headers: MockedHeaders
    }

    expect(axiosMockState.authInstance.post).toHaveBeenCalledWith('/auth/refresh', {})
    expect(axiosMockState.httpInstance).toHaveBeenCalledTimes(1)
    expect(retriedRequest._retry).toBe(true)
    expect(retriedRequest.headers.Authorization ?? retriedRequest.headers.get('Authorization')).toBe(
      'Bearer fresh-access-token',
    )
    expect(getToken()).toBe('fresh-access-token')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('fresh-access-token')
    expect(localStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null')).toMatchObject({
      id: 1,
      loginName: 'admin',
    })
    expect(result).toEqual({ code: 0, data: { records: [] } })
    expect(messageError).not.toHaveBeenCalled()
  })

  it('shows the refresh failure message only once when concurrent requests fail after idle timeout', async () => {
    window.history.replaceState({}, '', '/login')
    const { getToken, setToken } = await import('@/utils/storage')
    setToken('expired-access-token')

    const refreshDeferred = createDeferred<never>()
    axiosMockState.authInstance.post.mockReturnValueOnce(refreshDeferred.promise)

    const { isHandledRequestError } = await import('@/api/client')
    const rejected = axiosMockState.httpInstance.interceptors.response.use.mock.calls[0]?.[1] as
      | ((error: unknown) => Promise<unknown>)
      | undefined

    const firstRequest = rejected!(createUnauthorizedError('/customers'))
    const secondRequest = rejected!(createUnauthorizedError('/suppliers'))

    refreshDeferred.reject({
      isAxiosError: true,
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: { code: 4010, message: 'refreshToken无效或已过期' },
      },
    })

    const results = await Promise.allSettled([firstRequest, secondRequest])

    expect(axiosMockState.authInstance.post).toHaveBeenCalledTimes(1)
    expect(messageError).toHaveBeenCalledTimes(1)
    expect(messageError).toHaveBeenCalledWith('refreshToken无效或已过期')
    expect(isHandledRequestError((results[0] as PromiseRejectedResult).reason)).toBe(true)
    expect(isHandledRequestError((results[1] as PromiseRejectedResult).reason)).toBe(true)
    expect(getToken()).toBe('')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.user)).toBeNull()
    expect(results).toHaveLength(2)
    expect(results.every((item) => item.status === 'rejected')).toBe(true)
    expect((results[0] as PromiseRejectedResult).reason.message).toBe('refreshToken无效或已过期')
    expect((results[1] as PromiseRejectedResult).reason.message).toBe('refreshToken无效或已过期')
  })

  it('resets auth failure deduplication after a new authenticated request starts', async () => {
    window.history.replaceState({}, '', '/login')
    const { setToken } = await import('@/utils/storage')
    setToken('expired-access-token')
    axiosMockState.authInstance.post.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: { code: 4010, message: 'refreshToken无效或已过期' },
      },
    })

    await import('@/api/client')
    const requestFulfilled = axiosMockState.httpInstance.interceptors.request.use.mock.calls[0]?.[0] as
      | ((config: { url?: string; headers: Record<string, string> }) => { url?: string; headers: Record<string, string> })
      | undefined
    const rejected = axiosMockState.httpInstance.interceptors.response.use.mock.calls[0]?.[1] as
      | ((error: unknown) => Promise<unknown>)
      | undefined

    await expect(rejected!(createUnauthorizedError('/customers'))).rejects.toMatchObject({
      message: 'refreshToken无效或已过期',
    })
    expect(messageError).toHaveBeenCalledTimes(1)

    setToken('new-access-token')
    const requestConfig = requestFulfilled!({
      url: '/customers',
      headers: {},
    })

    expect(requestConfig.headers.Authorization).toBe('Bearer new-access-token')

    await expect(rejected!(createUnauthorizedError('/customers'))).rejects.toMatchObject({
      message: 'refreshToken无效或已过期',
    })
    expect(messageError).toHaveBeenCalledTimes(2)
  })

  it('still attaches authorization for /auth/refresh-tokens requests', async () => {
    const { setToken } = await import('@/utils/storage')
    setToken('access-token')

    await import('@/api/client')
    const requestFulfilled = axiosMockState.httpInstance.interceptors.request.use.mock.calls[0]?.[0] as
      | ((config: { url?: string; headers: Record<string, string> }) => { url?: string; headers: Record<string, string> })
      | undefined

    const requestConfig = requestFulfilled!({
      url: '/auth/refresh-tokens',
      headers: {},
    })

    expect(requestConfig.headers.Authorization).toBe('Bearer access-token')
  })

  it('restores redirected history route from __redirect query', async () => {
    window.history.replaceState({}, '', '/?__redirect=%2Fsession-management%3Fpage%3D2')

    const { restoreRedirectedHistoryRoute } = await import('@/api/client')
    restoreRedirectedHistoryRoute()

    expect(window.location.pathname).toBe('/session-management')
    expect(window.location.search).toBe('?page=2')
  })
})
