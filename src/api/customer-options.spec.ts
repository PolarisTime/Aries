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
  findCustomerOption,
  getCustomerOptions,
  normalizeCustomerRows,
  normalizeText,
  reloadCustomerOptions,
  uniqueCustomerNameOptions,
} from './customer-options'

const customerA = {
  id: '101',
  value: '101',
  label: '客户A',
  customerCode: 'C001',
  customerName: '客户A',
}

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
        normalizer: normalizeCustomerRows,
      }),
    )
  })

  it('exposes fetch and reload operations', () => {
    expect(fetchCustomerOptions).toBe(fetchMock)
    expect(reloadCustomerOptions).toBe(reloadMock)
  })

  it('returns every cached identity option without name deduplication', () => {
    const sameNameCustomer = {
      ...customerA,
      id: '102',
      value: '102',
      label: 'C002 / 客户A',
      customerCode: 'C002',
    }
    getMock.mockReturnValue([customerA, sameNameCustomer])

    expect(getCustomerOptions()).toEqual([customerA, sameNameCustomer])
    expect(uniqueCustomerNameOptions([customerA, sameNameCustomer])).toEqual([
      customerA,
      sameNameCustomer,
    ])
  })

  it('finds an option by stable id and never by display name', () => {
    getMock.mockReturnValue([customerA])

    expect(findCustomerOption('101')).toBe(customerA)
    expect(findCustomerOption('客户A')).toBeUndefined()
    expect(findCustomerOption('')).toBeUndefined()
  })

  it('normalizes ids, snapshots and default settlement company', () => {
    expect(
      normalizeCustomerRows([
        {
          id: 101,
          value: '旧名称值',
          label: '旧标签',
          customerCode: ' C001 ',
          customerName: ' 客户A ',
          defaultSettlementCompanyId: 9,
          defaultSettlementCompanyName: ' 主体A ',
        },
      ]),
    ).toEqual([
      {
        ...customerA,
        defaultSettlementCompanyId: '9',
        defaultSettlementCompanyName: '主体A',
      },
    ])
  })

  it('fails closed when the API omits customer identity', () => {
    expect(() =>
      normalizeCustomerRows([
        { value: '客户A', label: '客户A', customerName: '客户A' },
      ]),
    ).toThrow('customer.id')
  })

  it('normalizes display text only for non-identity fields', () => {
    expect(normalizeText('  hello  ')).toBe('hello')
    expect(normalizeText(123)).toBe('123')
    expect(normalizeText(null)).toBe('')
  })
})
