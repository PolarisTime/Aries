import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createQueryCachedOptionsMock, fetchMock, getMock, reloadMock } =
  vi.hoisted(() => {
    const fetchMock = vi.fn()
    const getMock = vi.fn()
    const reloadMock = vi.fn()
    return {
      createQueryCachedOptionsMock: vi.fn(() => ({
        fetch: fetchMock,
        get: getMock,
        reload: reloadMock,
      })),
      fetchMock,
      getMock,
      reloadMock,
    }
  })

vi.mock('@/lib/query-cached-options', () => ({
  createQueryCachedOptions: createQueryCachedOptionsMock,
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    WAREHOUSES_OPTIONS: '/warehouses/options',
  },
}))

import { QUERY_KEYS } from '@/constants/query-keys'
import {
  fetchWarehouseOptions,
  getWarehouseOptions,
  reloadWarehouseOptions,
} from './warehouse-options'

describe('warehouse-options', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    getMock.mockClear()
    reloadMock.mockClear()
  })

  it('binds warehouse options to the TanStack Query master option key', () => {
    expect(createQueryCachedOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.masterOptions.warehouse,
      }),
    )
  })

  it('exports fetchWarehouseOptions', () => {
    expect(typeof fetchWarehouseOptions).toBe('function')
  })

  it('exports getWarehouseOptions', () => {
    expect(typeof getWarehouseOptions).toBe('function')
  })

  it('exports reloadWarehouseOptions', () => {
    expect(typeof reloadWarehouseOptions).toBe('function')
  })

  it('fetchWarehouseOptions delegates to cached.fetch', async () => {
    const options = [{ value: 'wh-1', label: '主仓库' }]
    fetchMock.mockResolvedValue(options)

    const result = await fetchWarehouseOptions()

    expect(fetchMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })

  it('getWarehouseOptions delegates to cached.get', () => {
    const options = [{ value: 'wh-1', label: '主仓库' }]
    getMock.mockReturnValue(options)

    const result = getWarehouseOptions()

    expect(getMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })

  it('reloadWarehouseOptions delegates to cached.reload', async () => {
    const options = [{ value: 'wh-1', label: '主仓库' }]
    reloadMock.mockResolvedValue(options)

    const result = await reloadWarehouseOptions()

    expect(reloadMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })
})
