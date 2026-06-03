import { describe, expect, it } from 'vitest'

import type { ModuleEndpointConfig, QueryValue } from './module-contract-types'

describe('module-contract-types', () => {
  it('ModuleEndpointConfig type with minimal fields', () => {
    const config: ModuleEndpointConfig = {
      path: '/materials',
    }
    expect(config.path).toBe('/materials')
    expect(config.readOnly).toBeUndefined()
  })

  it('ModuleEndpointConfig type with all fields', () => {
    const config: ModuleEndpointConfig = {
      path: '/purchase-orders',
      readOnly: false,
      supportsDetail: true,
      supportsSearch: true,
      nativeFilterKeys: ['keyword', 'status'],
      dateRangeMapping: {
        orderDate: { startKey: 'startDate', endKey: 'endDate' },
      },
      sortByParam: 'sortBy',
      sortDirectionParam: 'sortDirection',
      fieldsParam: 'fields',
    }
    expect(config.path).toBe('/purchase-orders')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.dateRangeMapping?.orderDate.startKey).toBe('startDate')
  })

  it('QueryValue accepts string', () => {
    const val: QueryValue = 'test'
    expect(val).toBe('test')
  })

  it('QueryValue accepts number', () => {
    const val: QueryValue = 42
    expect(val).toBe(42)
  })

  it('QueryValue accepts boolean', () => {
    const val: QueryValue = true
    expect(val).toBe(true)
  })

  it('QueryValue accepts string array', () => {
    const val: QueryValue = ['a', 'b']
    expect(val).toEqual(['a', 'b'])
  })

  it('QueryValue accepts undefined', () => {
    const val: QueryValue = undefined
    expect(val).toBeUndefined()
  })
})
