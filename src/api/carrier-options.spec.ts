import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createQueryCachedOptionsMock, fetchMock, getMock, reloadMock } =
  vi.hoisted(() => {
    const fetchMock = vi.fn()
    const getMock = vi.fn()
    const reloadMock = vi.fn()
    return {
      createQueryCachedOptionsMock: vi.fn(() => ({
        fetch: fetchMock,
        reload: reloadMock,
        get: getMock,
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
  fetchCarrierOptions,
  findCarrierOption,
  getCarrierOptions,
  getCarrierVehiclePlateOptions,
  normalizeCarrierOptions,
  reloadCarrierOptions,
} from './carrier-options'

describe('carrier-options', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    getMock.mockClear()
    reloadMock.mockClear()
  })

  it('binds carrier options to the TanStack Query master option key', () => {
    expect(createQueryCachedOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/carriers/options',
        queryKey: QUERY_KEYS.masterOptions.carrier,
      }),
    )
  })

  describe('getCarrierOptions', () => {
    it('returns carriers from cache', () => {
      getMock.mockReturnValue([{ value: '承运商A', label: '承运商A' }])

      const result = getCarrierOptions()

      expect(result).toEqual([{ value: '承运商A', label: '承运商A' }])
    })
  })

  describe('getCarrierVehiclePlateOptions', () => {
    it('returns vehicle plates for matching carrier', () => {
      getMock.mockReturnValue([
        {
          value: '承运商A',
          label: '承运商A',
          vehiclePlates: ['京A12345', '京B67890'],
        },
      ])

      const result = getCarrierVehiclePlateOptions({ carrierName: '承运商A' })

      expect(result).toEqual([
        { label: '京A12345', value: '京A12345' },
        { label: '京B67890', value: '京B67890' },
      ])
    })

    it('returns empty array when carrier not found', () => {
      getMock.mockReturnValue([
        { value: '承运商A', label: '承运商A', vehiclePlates: ['京A12345'] },
      ])

      const result = getCarrierVehiclePlateOptions({ carrierName: '承运商B' })

      expect(result).toEqual([])
    })

    it('returns empty array when carrierName is empty', () => {
      const result = getCarrierVehiclePlateOptions({ carrierName: '' })

      expect(result).toEqual([])
    })

    it('returns empty array when carrierName is undefined', () => {
      const result = getCarrierVehiclePlateOptions()

      expect(result).toEqual([])
    })

    it('returns all plates from cache (normalization happens at fetch time)', () => {
      getMock.mockReturnValue([
        {
          value: '承运商A',
          label: '承运商A',
          vehiclePlates: ['京A12345', '京B67890'],
        },
      ])

      const result = getCarrierVehiclePlateOptions({ carrierName: '承运商A' })

      expect(result).toEqual([
        { label: '京A12345', value: '京A12345' },
        { label: '京B67890', value: '京B67890' },
      ])
    })

    it('handles non-array vehicle plates', () => {
      getMock.mockReturnValue([
        {
          value: '承运商A',
          label: '承运商A',
          vehiclePlates: undefined,
        },
      ])

      const result = getCarrierVehiclePlateOptions({ carrierName: '承运商A' })

      expect(result).toEqual([])
    })
  })

  describe('exports', () => {
    it('exposes fetchCarrierOptions', () => {
      expect(fetchCarrierOptions).toBe(fetchMock)
    })

    it('exposes reloadCarrierOptions', () => {
      expect(reloadCarrierOptions).toBe(reloadMock)
    })
  })

  describe('normalizeCarrierOptions', () => {
    it('preserves the default settlement company metadata', () => {
      const result = normalizeCarrierOptions([
        {
          value: '物流甲',
          label: '物流甲',
          defaultSettlementCompanyId: 9,
          defaultSettlementCompanyName: '主体A',
        },
      ])

      expect(result[0]).toEqual(
        expect.objectContaining({
          defaultSettlementCompanyId: 9,
          defaultSettlementCompanyName: '主体A',
        }),
      )
    })

    it('converts id to string when present', () => {
      const result = normalizeCarrierOptions([
        { id: 42 as any, value: 'v', label: 'L' },
      ])
      expect(result[0].id).toBe('42')
    })

    it('keeps id undefined when null', () => {
      const result = normalizeCarrierOptions([
        { id: null as any, value: 'v', label: 'L' },
      ])
      expect(result[0].id).toBeUndefined()
    })

    it('keeps id undefined when absent', () => {
      const result = normalizeCarrierOptions([{ value: 'v', label: 'L' }])
      expect(result[0].id).toBeUndefined()
    })

    it('falls back to empty string for falsy label', () => {
      const result = normalizeCarrierOptions([
        { value: 'v', label: null as any },
      ])
      expect(result[0].label).toBe('')
    })

    it('falls back to empty string for falsy value', () => {
      const result = normalizeCarrierOptions([
        { value: undefined as any, label: 'L' },
      ])
      expect(result[0].value).toBe('')
    })

    it('filters empty and whitespace-only vehicle plates', () => {
      const result = normalizeCarrierOptions([
        {
          value: 'c',
          label: 'C',
          vehiclePlates: ['京A1', '', '  ', '京B2'],
        },
      ])
      expect(result[0].vehiclePlates).toEqual(['京A1', '京B2'])
    })

    it('returns empty array when vehiclePlates is not an array', () => {
      const result = normalizeCarrierOptions([
        {
          value: 'c',
          label: 'C',
          vehiclePlates: 'not-array' as any,
        },
      ])
      expect(result[0].vehiclePlates).toEqual([])
    })

    it('returns empty array when vehiclePlates is undefined', () => {
      const result = normalizeCarrierOptions([{ value: 'c', label: 'C' }])
      expect(result[0].vehiclePlates).toEqual([])
    })

    it('handles empty vehiclePlates array', () => {
      const result = normalizeCarrierOptions([
        {
          value: 'c',
          label: 'C',
          vehiclePlates: [],
        },
      ])
      expect(result[0].vehiclePlates).toEqual([])
    })
  })

  describe('findCarrierOption', () => {
    it('returns undefined for empty carrier name', () => {
      getMock.mockReturnValue([{ value: 'A', label: 'A' }])
      expect(findCarrierOption('')).toBeUndefined()
    })

    it('returns undefined for whitespace-only carrier name', () => {
      getMock.mockReturnValue([{ value: 'A', label: 'A' }])
      expect(findCarrierOption('   ')).toBeUndefined()
    })

    it('returns undefined for non-string carrier name', () => {
      getMock.mockReturnValue([{ value: 'A', label: 'A' }])
      expect(findCarrierOption(null)).toBeUndefined()
    })

    it('finds carrier by trimmed value', () => {
      const carrier = { value: '承运商A', label: '承运商A' }
      getMock.mockReturnValue([carrier])
      expect(findCarrierOption('承运商A')).toBe(carrier)
    })

    it('trims whitespace from carrier name for matching', () => {
      const carrier = { value: '承运商A', label: '承运商A' }
      getMock.mockReturnValue([carrier])
      expect(findCarrierOption('  承运商A  ')).toBe(carrier)
    })

    it('returns undefined when no match found', () => {
      getMock.mockReturnValue([{ value: '承运商A', label: '承运商A' }])
      expect(findCarrierOption('承运商B')).toBeUndefined()
    })
  })
})
