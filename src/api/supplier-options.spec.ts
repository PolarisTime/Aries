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
  findSupplierOption,
  getSupplierEntityOptions,
  getSupplierNameFilterOptions,
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

  it('builds supplier entity options whose value is the snowflake id', () => {
    getMock.mockReturnValue([
      {
        id: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '供应商A',
        value: '700520000000000001',
        label: 'SUP-001 / 供应商A',
      },
    ])

    expect(getSupplierEntityOptions()).toEqual([
      expect.objectContaining({
        id: '700520000000000001',
        value: '700520000000000001',
        label: 'SUP-001 / 供应商A',
      }),
    ])
    expect(findSupplierOption('700520000000000001')?.supplierCode).toBe(
      'SUP-001',
    )
    expect(findSupplierOption('SUP-001')).toBeUndefined()
    expect(findSupplierOption('供应商A')).toBeUndefined()
  })

  it('builds deduplicated legacy name filters for reports without supplierId', () => {
    getMock.mockReturnValue([
      {
        id: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '同名供应商',
        value: '700520000000000001',
        label: 'SUP-001 / 同名供应商',
      },
      {
        id: '700520000000000002',
        supplierCode: 'SUP-002',
        supplierName: '同名供应商',
        value: '700520000000000002',
        label: 'SUP-002 / 同名供应商',
      },
    ])

    expect(getSupplierNameFilterOptions()).toEqual([
      { value: '同名供应商', label: '同名供应商' },
    ])
  })

  it('reloadSupplierOptions delegates to cached.reload', async () => {
    const options = [{ id: '1', value: 's1', label: '供应商A' }]
    reloadMock.mockResolvedValue(options)

    const result = await reloadSupplierOptions()

    expect(reloadMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })

  describe('normalizeSupplierOptions', () => {
    it('normalizes a supplier option to a stable id value and snapshots', () => {
      const result = normalizeSupplierOptions([
        {
          id: 123,
          supplierCode: ' SUP-001 ',
          value: '供应商甲',
          label: '供应商甲',
        },
      ])

      expect(result[0]).toMatchObject({
        id: '123',
        supplierCode: 'SUP-001',
        supplierName: '供应商甲',
        value: '123',
        label: '供应商甲',
      })
    })

    it('converts a safe numeric id to string', () => {
      const result = normalizeSupplierOptions([
        { id: 123, value: 'v1', label: 'L1' },
      ])
      expect(result[0].id).toBe('123')
      expect(result[0].value).toBe('123')
    })

    it('rejects an unsafe numeric supplier id', () => {
      expect(() =>
        normalizeSupplierOptions([
          {
            id: Number.MAX_SAFE_INTEGER + 1,
            value: 'v1',
            label: 'L1',
          },
        ]),
      ).toThrow('suppliers[0].id')
    })

    it.each([
      null,
      undefined,
      '',
      'not-an-id',
    ])('rejects a missing or invalid supplier id: %s', (id) => {
      expect(() =>
        normalizeSupplierOptions([{ id, value: 'v1', label: 'L1' }]),
      ).toThrow('suppliers[0].id')
    })

    it('falls back to the source label when supplier name is absent', () => {
      const result = normalizeSupplierOptions([
        { id: '1', value: '', label: '供应商显示名' },
      ])
      expect(result[0]).toMatchObject({
        supplierName: '供应商显示名',
        value: '1',
        label: '供应商显示名',
      })
    })

    it('uses the id-only label when all snapshots are empty', () => {
      const result = normalizeSupplierOptions([
        { id: '1', value: '', label: '' },
      ])
      expect(result[0]).toMatchObject({
        id: '1',
        supplierName: '',
        value: '1',
        label: '#1',
      })
    })

    it('handles multiple options', () => {
      const result = normalizeSupplierOptions([
        { id: '1', value: 'a', label: 'A' },
        { id: '2', value: 'b', label: 'B' },
      ])
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('2')
    })
  })
})
