import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fetchQueryMock,
  getQueryDataMock,
  httpGetMock,
  invalidateQueriesMock,
  prefetchQueryMock,
  setQueryDataMock,
} = vi.hoisted(() => ({
  fetchQueryMock: vi.fn(),
  getQueryDataMock: vi.fn(),
  httpGetMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  prefetchQueryMock: vi.fn(),
  setQueryDataMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: httpGetMock,
  },
}))

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    fetchQuery: fetchQueryMock,
    getQueryData: getQueryDataMock,
    invalidateQueries: invalidateQueriesMock,
    prefetchQuery: prefetchQueryMock,
    setQueryData: setQueryDataMock,
  },
}))

import { createQueryCachedOptions } from './query-cached-options'

describe('createQueryCachedOptions', () => {
  const queryKey = ['master-options', 'test'] as const

  beforeEach(() => {
    vi.clearAllMocks()
    fetchQueryMock.mockImplementation(({ queryFn }) => queryFn())
    invalidateQueriesMock.mockResolvedValue(undefined)
    prefetchQueryMock.mockResolvedValue(undefined)
  })

  it('fetches raw options from the endpoint without touching queryClient cache', async () => {
    httpGetMock.mockResolvedValue({ data: [{ value: 'A', label: 'A' }] })
    const options = createQueryCachedOptions({
      endpoint: '/test/options',
      queryKey,
    })

    await expect(options.fetch()).resolves.toEqual([
      { value: 'A', label: 'A' },
    ])

    expect(httpGetMock).toHaveBeenCalledWith('/test/options')
    expect(fetchQueryMock).not.toHaveBeenCalled()
  })

  it('normalizes response data before returning it', async () => {
    httpGetMock.mockResolvedValue({
      data: [{ value: 'A' }, { value: 'B' }],
    })
    const options = createQueryCachedOptions({
      endpoint: '/test/options',
      queryKey,
      normalizer: (rows: Array<{ value: string }>) =>
        rows.filter((row) => row.value === 'B'),
    })

    await expect(options.fetch()).resolves.toEqual([{ value: 'B' }])
  })

  it('uses an empty list when response data is null and no normalizer is provided', async () => {
    httpGetMock.mockResolvedValue({ data: null })
    const options = createQueryCachedOptions({
      endpoint: '/test/options',
      queryKey,
    })

    await expect(options.fetch()).resolves.toEqual([])
  })

  it('returns cached query data synchronously', () => {
    getQueryDataMock.mockReturnValue([{ value: 'cached' }])
    const options = createQueryCachedOptions({
      endpoint: '/test/options',
      queryKey,
    })

    expect(options.get()).toEqual([{ value: 'cached' }])
    expect(prefetchQueryMock).not.toHaveBeenCalled()
  })

  it('prefetches through queryClient when synchronous cache is missing', () => {
    getQueryDataMock.mockReturnValue(undefined)
    const options = createQueryCachedOptions({
      endpoint: '/test/options',
      queryKey,
    })

    expect(options.get()).toEqual([])
    expect(prefetchQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey,
        staleTime: 300_000,
      }),
    )
  })

  it('clears stale query data before forcing a reload', async () => {
    fetchQueryMock.mockResolvedValue([{ value: 'fresh' }])
    const options = createQueryCachedOptions({
      endpoint: '/test/options',
      queryKey,
    })

    await expect(options.reload()).resolves.toEqual([{ value: 'fresh' }])

    expect(setQueryDataMock).toHaveBeenCalledWith(queryKey, [])
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey })
    expect(fetchQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey,
        staleTime: 0,
      }),
    )
  })

  it('keeps legacy reload callers safe when refresh fails', async () => {
    fetchQueryMock.mockRejectedValue(new Error('Network error'))
    const options = createQueryCachedOptions({
      endpoint: '/test/options',
      queryKey,
    })

    await expect(options.reload()).resolves.toEqual([])
  })
})
