import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createQueryCachedOptionsMock, getMock } = vi.hoisted(() => {
  const getMock = vi.fn()
  return {
    getMock,
    createQueryCachedOptionsMock: vi.fn(() => ({
      fetch: vi.fn(),
      reload: vi.fn(),
      get: getMock,
    })),
  }
})

vi.mock('@/lib/query-cached-options', () => ({
  createQueryCachedOptions: createQueryCachedOptionsMock,
}))

import {
  findCustomerOption,
  getCustomerOptions,
  normalizeCustomerRows,
} from './customer-options'

describe('customer-options stable identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses customer snowflake id as both id and select value', () => {
    expect(
      normalizeCustomerRows([
        {
          id: '308251467645452289',
          value: '旧版名称值',
          label: '旧版标签',
          customerCode: 'C001',
          customerName: '客户A',
        },
      ]),
    ).toEqual([
      {
        id: '308251467645452289',
        value: '308251467645452289',
        label: 'C001 / 客户A',
        customerCode: 'C001',
        customerName: '客户A',
      },
    ])
  })

  it('does not merge customers that have the same name', () => {
    getMock.mockReturnValue([
      {
        id: '1',
        value: '1',
        label: 'C001 / 同名客户',
        customerCode: 'C001',
        customerName: '同名客户',
      },
      {
        id: '2',
        value: '2',
        label: 'C002 / 同名客户',
        customerCode: 'C002',
        customerName: '同名客户',
      },
    ])

    expect(getCustomerOptions().map((row) => row.value)).toEqual(['1', '2'])
  })

  it('finds customers only by stable id', () => {
    getMock.mockReturnValue([
      {
        id: '1',
        value: '1',
        label: 'C001 / 客户A',
        customerCode: 'C001',
        customerName: '客户A',
      },
    ])

    expect(findCustomerOption('1')?.customerCode).toBe('C001')
    expect(findCustomerOption('客户A')).toBeUndefined()
  })

  it('rejects an unsafe numeric customer id', () => {
    expect(() =>
      normalizeCustomerRows([
        {
          id: Number.MAX_SAFE_INTEGER + 1,
          value: '客户A',
          label: '客户A',
          customerName: '客户A',
        },
      ]),
    ).toThrow('customer.id')
  })
})
