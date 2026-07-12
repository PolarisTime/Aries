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

import { QUERY_KEYS } from '@/constants/query-keys'
import {
  fetchWarehouseOptions,
  getWarehouseOptions,
  normalizeWarehouseOptions,
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
        endpoint: '/warehouses/options',
        queryKey: QUERY_KEYS.masterOptions.warehouse,
        normalizer: normalizeWarehouseOptions,
      }),
    )
  })

  it('normalizes option identity and authoritative warehouse snapshots', () => {
    expect(
      normalizeWarehouseOptions([
        {
          id: 42,
          value: 42,
          label: 'WH-001 / 一号仓',
          warehouseCode: ' WH-001 ',
          warehouseName: ' 一号仓 ',
        },
      ]),
    ).toEqual([
      {
        id: '42',
        value: '42',
        label: 'WH-001 / 一号仓',
        warehouseCode: 'WH-001',
        warehouseName: '一号仓',
      },
    ])
  })

  it('accepts a stable value id when the endpoint omits the duplicate id field', () => {
    expect(
      normalizeWarehouseOptions([
        {
          value: '308251467645452289',
          label: '一号仓',
          warehouseCode: 'WH-001',
          warehouseName: '一号仓',
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        id: '308251467645452289',
        value: '308251467645452289',
      }),
    ])
  })

  it('fails closed for name-valued or precision-lost warehouse identity', () => {
    expect(() =>
      normalizeWarehouseOptions([
        {
          value: '一号仓',
          label: '一号仓',
          warehouseCode: 'WH-001',
          warehouseName: '一号仓',
        },
      ]),
    ).toThrow('warehouses[0].id')

    expect(() =>
      normalizeWarehouseOptions([
        {
          id: Number.MAX_SAFE_INTEGER + 1,
          label: '一号仓',
          warehouseCode: 'WH-001',
          warehouseName: '一号仓',
        },
      ]),
    ).toThrow('warehouses[0].id')
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
