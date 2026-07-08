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
  fetchCustomerOptions,
  formatProjectOptionLabel,
  getCustomerOptions,
  getCustomerProjectOptions,
  normalizeCustomerRows,
  normalizeText,
  reloadCustomerOptions,
  uniqueCustomerNameOptions,
  uniqueProjectOptions,
} from './customer-options'

describe('customer-options', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    getMock.mockClear()
    reloadMock.mockClear()
  })

  it('binds customer options to the TanStack Query master option key', () => {
    expect(createQueryCachedOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/customers/options',
        queryKey: QUERY_KEYS.masterOptions.customer,
      }),
    )
  })

  describe('getCustomerOptions', () => {
    it('returns unique customer name options', () => {
      getMock.mockReturnValue([
        { customerName: '客户A', value: '客户A', label: '客户A' },
        { customerName: '客户B', value: '客户B', label: '客户B' },
        { customerName: '客户A', value: '客户A', label: '客户A' },
      ])

      const result = getCustomerOptions()

      expect(result).toEqual([
        { label: '客户A', value: '客户A' },
        { label: '客户B', value: '客户B' },
      ])
    })

    it('skips empty customer names', () => {
      getMock.mockReturnValue([
        { customerName: '', value: '', label: '' },
        { customerName: '客户A', value: '客户A', label: '客户A' },
      ])

      const result = getCustomerOptions()

      expect(result).toEqual([{ label: '客户A', value: '客户A' }])
    })

    it('uses value when customerName is missing', () => {
      getMock.mockReturnValue([{ value: '客户C', label: '客户C' }])

      const result = getCustomerOptions()

      expect(result).toEqual([{ label: '客户C', value: '客户C' }])
    })
  })

  describe('getCustomerProjectOptions', () => {
    it('returns all project options when no customer filter', () => {
      getMock.mockReturnValue([
        { customerName: '客户A', projectName: '项目X', projectNameAbbr: 'PX' },
        { customerName: '客户B', projectName: '项目Y' },
      ])

      const result = getCustomerProjectOptions()

      expect(result).toHaveLength(2)
      expect(result[0].label).toContain('PX（项目X）')
      expect(result[1].label).toContain('项目Y')
    })

    it('filters by customer name', () => {
      getMock.mockReturnValue([
        { customerName: '客户A', projectName: '项目X' },
        { customerName: '客户A', projectName: '项目Y' },
        { customerName: '客户B', projectName: '项目Z' },
      ])

      const result = getCustomerProjectOptions({ customerName: '客户A' })

      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('项目X')
      expect(result[1].value).toBe('项目Y')
    })

    it('filters by value when customerName is missing', () => {
      getMock.mockReturnValue([
        { value: '客户A', label: '客户A', projectName: '项目X' },
        { value: '客户B', label: '客户B', projectName: '项目Y' },
      ])

      const result = getCustomerProjectOptions({ customerName: '客户A' })

      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('项目X')
    })

    it('includes customer name in label when no filter', () => {
      getMock.mockReturnValue([{ customerName: '客户A', projectName: '项目X' }])

      const result = getCustomerProjectOptions()
      expect(result[0].label).toBe('项目X / 客户A')
    })

    it('skips rows without projectName', () => {
      getMock.mockReturnValue([
        { customerName: '客户A', projectName: '' },
        { customerName: '客户A', projectName: '项目X' },
      ])

      const result = getCustomerProjectOptions()
      expect(result).toHaveLength(1)
    })

    it('returns empty array when no match', () => {
      getMock.mockReturnValue([{ customerName: '客户B', projectName: '项目Z' }])

      const result = getCustomerProjectOptions({ customerName: '客户A' })
      expect(result).toEqual([])
    })

    it('deduplicates project names', () => {
      getMock.mockReturnValue([
        { customerName: '客户A', projectName: '项目X' },
        { customerName: '客户A', projectName: '项目X' },
      ])

      const result = getCustomerProjectOptions({ customerName: '客户A' })
      expect(result).toHaveLength(1)
    })
  })

  describe('exports', () => {
    it('exposes fetchCustomerOptions', () => {
      expect(fetchCustomerOptions).toBe(fetchMock)
    })

    it('exposes reloadCustomerOptions', () => {
      expect(reloadCustomerOptions).toBe(reloadMock)
    })
  })

  describe('normalizeText', () => {
    it('trims whitespace from string', () => {
      expect(normalizeText('  hello  ')).toBe('hello')
    })

    it('converts non-string to string and trims', () => {
      expect(normalizeText(123)).toBe('123')
    })

    it('returns empty string for null', () => {
      expect(normalizeText(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(normalizeText(undefined)).toBe('')
    })
  })

  describe('normalizeCustomerRows', () => {
    it('filters out rows with empty customerName', () => {
      const result = normalizeCustomerRows([
        { value: '', label: '', customerName: '' },
      ])
      expect(result).toEqual([])
    })

    it('uses value as fallback for customerName', () => {
      const result = normalizeCustomerRows([{ value: '客户X', label: 'L' }])
      expect(result[0].customerName).toBe('客户X')
    })

    it('uses label as fallback for customerName', () => {
      const result = normalizeCustomerRows([
        { value: '', label: '客户Y', customerName: '' },
      ])
      expect(result[0].customerName).toBe('客户Y')
    })

    it('converts null id to undefined', () => {
      const result = normalizeCustomerRows([
        { id: null as any, value: 'A', label: 'A' },
      ])
      expect(result[0].id).toBeUndefined()
    })

    it('converts numeric id to string', () => {
      const result = normalizeCustomerRows([
        { id: 42 as any, value: 'A', label: 'A' },
      ])
      expect(result[0].id).toBe('42')
    })

    it('generates label with projectName when label is empty', () => {
      const result = normalizeCustomerRows([
        { value: '客户A', label: '', projectName: '项目X' },
      ])
      expect(result[0].label).toBe('客户A / 项目X')
    })

    it('generates label without projectName when projectName is empty', () => {
      const result = normalizeCustomerRows([
        { value: '客户A', label: '', projectName: '' },
      ])
      expect(result[0].label).toBe('客户A')
    })

    it('preserves existing label when present', () => {
      const result = normalizeCustomerRows([
        { value: '客户A', label: '自定义标签', projectName: '项目X' },
      ])
      expect(result[0].label).toBe('自定义标签')
    })

    it('normalizes projectName to trimmed string', () => {
      const result = normalizeCustomerRows([
        { value: '客户A', label: 'A', projectName: '  项目  ' },
      ])
      expect(result[0].projectName).toBe('项目')
    })
  })

  describe('formatProjectOptionLabel', () => {
    it('returns projectName when projectNameAbbr is empty', () => {
      expect(
        formatProjectOptionLabel({ value: 'v', label: 'l' }, '项目X'),
      ).toBe('项目X')
    })

    it('returns abbreviated format when projectNameAbbr is present', () => {
      expect(
        formatProjectOptionLabel(
          { value: 'v', label: 'l', projectNameAbbr: 'PX' },
          '项目X',
        ),
      ).toBe('PX（项目X）')
    })
  })

  describe('uniqueCustomerNameOptions', () => {
    it('deduplicates by customerName', () => {
      const result = uniqueCustomerNameOptions([
        { value: 'A', label: 'A', customerName: '客户A' },
        { value: 'A', label: 'A', customerName: '客户A' },
        { value: 'B', label: 'B', customerName: '客户B' },
      ])
      expect(result).toEqual([
        { label: '客户A', value: '客户A' },
        { label: '客户B', value: '客户B' },
      ])
    })

    it('uses value as fallback for customerName', () => {
      const result = uniqueCustomerNameOptions([{ value: '客户X', label: 'L' }])
      expect(result[0].value).toBe('客户X')
    })

    it('skips rows with empty normalized customerName', () => {
      const result = uniqueCustomerNameOptions([
        { value: '', label: '' },
        { value: 'OK', label: 'OK' },
      ])
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('OK')
    })
  })

  describe('uniqueProjectOptions', () => {
    it('includes customer name in label when includeCustomerInLabel is true', () => {
      const result = uniqueProjectOptions(
        [
          {
            value: '客户A',
            label: 'L',
            customerName: '客户A',
            projectName: '项目X',
          },
        ],
        true,
      )
      expect(result[0].label).toContain('客户A')
    })

    it('uses value in project label when customerName is missing', () => {
      const result = uniqueProjectOptions(
        [
          {
            value: '客户A',
            label: 'L',
            projectName: '项目X',
          },
        ],
        true,
      )
      expect(result[0].label).toBe('项目X / 客户A')
    })

    it('excludes customer name from label when includeCustomerInLabel is false', () => {
      const result = uniqueProjectOptions(
        [
          {
            value: '客户A',
            label: 'L',
            customerName: '客户A',
            projectName: '项目X',
          },
        ],
        false,
      )
      expect(result[0].label).toBe('项目X')
    })

    it('skips rows without projectName', () => {
      const result = uniqueProjectOptions(
        [{ value: 'A', label: 'L', customerName: 'A', projectName: '' }],
        true,
      )
      expect(result).toEqual([])
    })

    it('deduplicates project names', () => {
      const result = uniqueProjectOptions(
        [
          { value: 'A', label: 'L', customerName: 'A', projectName: 'P1' },
          { value: 'A', label: 'L', customerName: 'A', projectName: 'P1' },
        ],
        false,
      )
      expect(result).toHaveLength(1)
    })

    it('includes customerCode and projectNameAbbr in output', () => {
      const result = uniqueProjectOptions(
        [
          {
            value: 'A',
            label: 'L',
            customerName: 'A',
            projectName: 'P1',
            customerCode: 'C1',
            projectNameAbbr: 'PX',
          },
        ],
        false,
      )
      expect(result[0].customerCode).toBe('C1')
      expect(result[0].projectNameAbbr).toBe('PX')
    })
  })
})
