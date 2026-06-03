import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', () => ({
  http: {
    get: httpGetMock,
  },
}))

import { createCachedOptions } from './create-cached-options'

describe('createCachedOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetch', () => {
    it('fetches data from endpoint and caches it', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [{ value: 'A', label: 'A' }] })
      const options = createCachedOptions<{ value: string; label: string }>({
        endpoint: '/test/options',
      })

      const result = await options.fetch()
      expect(result).toEqual([{ value: 'A', label: 'A' }])
      expect(httpGetMock).toHaveBeenCalledWith('/test/options')
    })

    it('returns cached data on subsequent calls without fetching', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [{ value: 'A' }] })
      const options = createCachedOptions({ endpoint: '/test/options' })

      await options.fetch()
      await options.fetch()
      expect(httpGetMock).toHaveBeenCalledTimes(1)
    })

    it('applies normalizer when provided', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [{ value: 'a' }, { value: 'b' }] })
      const options = createCachedOptions({
        endpoint: '/test/options',
        normalizer: (data) => data.filter((d) => d.value !== 'a'),
      })

      const result = await options.fetch()
      expect(result).toEqual([{ value: 'b' }])
    })

    it('handles null response data', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })
      const options = createCachedOptions({ endpoint: '/test/options' })

      const result = await options.fetch()
      expect(result).toEqual([])
    })

    it('handles fetch error gracefully', async () => {
      httpGetMock.mockRejectedValue(new Error('Network error'))
      const options = createCachedOptions({ endpoint: '/test/options' })

      const result = await options.fetch()
      expect(result).toEqual([])
    })

    it('returns empty array on first fetch failure, retries on next call', async () => {
      httpGetMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ code: 0, data: [{ value: 'C' }] })

      const options = createCachedOptions({ endpoint: '/test/options' })

      const first = await options.fetch()
      expect(first).toEqual([])

      const second = await options.fetch()
      expect(second).toEqual([{ value: 'C' }])
    })

    it('handles undefined response data', async () => {
      httpGetMock.mockResolvedValue({ code: 0 })
      const options = createCachedOptions({ endpoint: '/test/options' })

      const result = await options.fetch()
      expect(result).toEqual([])
    })

    it('deduplicates concurrent fetch calls', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [{ value: 'X' }] })
      const options = createCachedOptions({ endpoint: '/test/options' })

      const [r1, r2] = await Promise.all([options.fetch(), options.fetch()])
      expect(r1).toEqual([{ value: 'X' }])
      expect(r2).toEqual([{ value: 'X' }])
      expect(httpGetMock).toHaveBeenCalledTimes(1)
    })

    it('fetchFailed flag resets on successful retry', async () => {
      httpGetMock
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({ code: 0, data: [{ value: 'OK' }] })

      const options = createCachedOptions({ endpoint: '/test/options' })
      await options.fetch()
      await options.fetch()

      const result = options.get()
      expect(result).toEqual([{ value: 'OK' }])
    })
  })

  describe('get', () => {
    it('returns empty array when nothing is cached', () => {
      const options = createCachedOptions({ endpoint: '/test/options' })
      expect(options.get()).toEqual([])
    })

    it('triggers fetch on first get when cache is empty and no loading/fetchFailed flag', () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [{ value: 'deferred' }] })
      const options = createCachedOptions({ endpoint: '/test/options' })

      const result = options.get()
      expect(result).toEqual([])
      expect(httpGetMock).toHaveBeenCalledTimes(1)
    })

    it('does not trigger fetch when loading is in progress', () => {
      httpGetMock.mockImplementation(() => new Promise(() => {}))
      const options = createCachedOptions({ endpoint: '/test/options' })

      options.fetch()
      httpGetMock.mockClear()
      options.get()
      expect(httpGetMock).not.toHaveBeenCalled()
    })

    it('returns cached data after fetch completes', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [{ value: 'cached' }] })
      const options = createCachedOptions({ endpoint: '/test/options' })

      await options.fetch()
      expect(options.get()).toEqual([{ value: 'cached' }])
    })
  })

  describe('reload', () => {
    it('re-fetches and updates cache', async () => {
      httpGetMock
        .mockResolvedValueOnce({ code: 0, data: [{ value: 'old' }] })
        .mockResolvedValueOnce({ code: 0, data: [{ value: 'new' }] })

      const options = createCachedOptions({ endpoint: '/test/options' })

      await options.fetch()
      expect(options.get()).toEqual([{ value: 'old' }])

      const reloaded = await options.reload()
      expect(reloaded).toEqual([{ value: 'new' }])
      expect(options.get()).toEqual([{ value: 'new' }])
      expect(httpGetMock).toHaveBeenCalledTimes(2)
    })

    it('resets fetchFailed flag on reload', async () => {
      httpGetMock
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({ code: 0, data: [{ value: 'recovered' }] })

      const options = createCachedOptions({ endpoint: '/test/options' })

      await options.fetch()
      expect(options.get()).toEqual([])

      const reloaded = await options.reload()
      expect(reloaded).toEqual([{ value: 'recovered' }])
    })
  })
})
