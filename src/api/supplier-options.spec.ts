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
  fetchSupplierOptions,
  getSupplierOptions,
  normalizeSupplierOptions,
  reloadSupplierOptions,
} from './supplier-options'

describe('supplier-options', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    getMock.mockClear()
    reloadMock.mockClear()
  })

  it('binds supplier options to the TanStack Query master option key', () => {
    expect(createQueryCachedOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/suppliers/options',
        queryKey: QUERY_KEYS.masterOptions.supplier,
      }),
    )
  })

  it('exports fetchSupplierOptions', () => {
    expect(typeof fetchSupplierOptions).toBe('function')
  })

  it('exports getSupplierOptions', () => {
    expect(typeof getSupplierOptions).toBe('function')
  })

  it('exports reloadSupplierOptions', () => {
    expect(typeof reloadSupplierOptions).toBe('function')
  })

  it('fetchSupplierOptions delegates to cached.fetch', async () => {
    const options = [{ id: '1', value: 's1', label: '供应商A' }]
    fetchMock.mockResolvedValue(options)

    const result = await fetchSupplierOptions()

    expect(fetchMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })

  it('getSupplierOptions delegates to cached.get', () => {
    const options = [{ id: '1', value: 's1', label: '供应商A' }]
    getMock.mockReturnValue(options)

    const result = getSupplierOptions()

    expect(getMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })

  it('reloadSupplierOptions delegates to cached.reload', async () => {
    const options = [{ id: '1', value: 's1', label: '供应商A' }]
    reloadMock.mockResolvedValue(options)

    const result = await reloadSupplierOptions()

    expect(reloadMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })

  describe('normalizeSupplierOptions', () => {
    it('converts id to string when present', () => {
      const result = normalizeSupplierOptions([
        { id: 123 as any, value: 'v1', label: 'L1' },
      ])
      expect(result[0].id).toBe('123')
    })

    it('keeps id undefined when null', () => {
      const result = normalizeSupplierOptions([
        { id: null as any, value: 'v1', label: 'L1' },
      ])
      expect(result[0].id).toBeUndefined()
    })

    it('keeps id undefined when undefined', () => {
      const result = normalizeSupplierOptions([{ value: 'v1', label: 'L1' }])
      expect(result[0].id).toBeUndefined()
    })

    it('converts empty label to empty string', () => {
      const result = normalizeSupplierOptions([{ value: 'v1', label: '' }])
      expect(result[0].label).toBe('')
    })

    it('falls back to empty string when label is falsy', () => {
      const result = normalizeSupplierOptions([
        { value: 'v1', label: null as any },
      ])
      expect(result[0].label).toBe('')
    })

    it('falls back to empty string when value is falsy', () => {
      const result = normalizeSupplierOptions([
        { value: null as any, label: 'L1' },
      ])
      expect(result[0].value).toBe('')
    })

    it('preserves valid label and value', () => {
      const result = normalizeSupplierOptions([
        { value: 's1', label: '供应商' },
      ])
      expect(result[0]).toEqual({ id: undefined, value: 's1', label: '供应商' })
    })

    it('handles multiple options', () => {
      const result = normalizeSupplierOptions([
        { id: '1', value: 'a', label: 'A' },
        { id: undefined, value: 'b', label: 'B' },
      ])
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBeUndefined()
    })
  })
})
