import { describe, expect, it } from 'vitest'

import { operationModuleEndpointContracts } from './module-contracts-operations'

describe('module-contracts-operations', () => {
  it('exports operation module contracts', () => {
    expect(operationModuleEndpointContracts).toBeDefined()
    expect(typeof operationModuleEndpointContracts).toBe('object')
  })

  it('contains purchase-order config', () => {
    const config = operationModuleEndpointContracts['purchase-order']
    expect(config).toBeDefined()
    expect(config.path).toBe('/purchase-orders')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('supplierName')
    expect(config.dateRangeMapping?.orderDate.startKey).toBe('startDate')
    expect(config.dateRangeMapping?.orderDate.endKey).toBe('endDate')
  })

  it('contains purchase-inbound config', () => {
    const config = operationModuleEndpointContracts['purchase-inbound']
    expect(config).toBeDefined()
    expect(config.path).toBe('/purchase-inbounds')
    expect(config.dateRangeMapping?.inboundDate.startKey).toBe('startDate')
  })

  it('contains sales-order config', () => {
    const config = operationModuleEndpointContracts['sales-order']
    expect(config).toBeDefined()
    expect(config.path).toBe('/sales-orders')
    expect(config.nativeFilterKeys).toContain('customerName')
    expect(config.nativeFilterKeys).toContain('projectName')
    expect(config.dateRangeMapping?.deliveryDate.startKey).toBe('startDate')
  })

  it('contains sales-outbound config', () => {
    const config = operationModuleEndpointContracts['sales-outbound']
    expect(config).toBeDefined()
    expect(config.path).toBe('/sales-outbounds')
    expect(config.dateRangeMapping?.outboundDate.startKey).toBe('startDate')
  })

  it('contains freight-bill config', () => {
    const config = operationModuleEndpointContracts['freight-bill']
    expect(config).toBeDefined()
    expect(config.path).toBe('/freight-bills')
    expect(config.nativeFilterKeys).toContain('carrierName')
  })

  it('contains purchase-contract config', () => {
    const config = operationModuleEndpointContracts['purchase-contract']
    expect(config).toBeDefined()
    expect(config.path).toBe('/purchase-contracts')
    expect(config.dateRangeMapping?.signDate.startKey).toBe('startDate')
  })

  it('contains sales-contract config', () => {
    const config = operationModuleEndpointContracts['sales-contract']
    expect(config).toBeDefined()
    expect(config.path).toBe('/sales-contracts')
    expect(config.nativeFilterKeys).toContain('customerName')
    expect(config.dateRangeMapping?.signDate.startKey).toBe('startDate')
  })
})
