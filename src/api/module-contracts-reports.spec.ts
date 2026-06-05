import { describe, expect, it } from 'vitest'

import { reportModuleEndpointContracts } from './module-contracts-reports'

describe('module-contracts-reports', () => {
  it('exports report module contracts', () => {
    expect(reportModuleEndpointContracts).toBeDefined()
    expect(typeof reportModuleEndpointContracts).toBe('object')
  })

  it('contains pending-invoice-receipt-report config', () => {
    const config =
      reportModuleEndpointContracts['pending-invoice-receipt-report']
    expect(config).toBeDefined()
    expect(config.path).toBe('/pending-invoice-receipt-report')
    expect(config.readOnly).toBe(true)
    expect(config.sortDirectionParam).toBe('sortDirection')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('supplierName')
    expect(config.dateRangeMapping?.orderDate.startKey).toBe('startDate')
    expect(config.dateRangeMapping?.orderDate.endKey).toBe('endDate')
  })

  it('contains inventory-report config', () => {
    const config = reportModuleEndpointContracts['inventory-report']
    expect(config).toBeDefined()
    expect(config.path).toBe('/inventory-report')
    expect(config.readOnly).toBe(true)
    expect(config.sortDirectionParam).toBe('sortDirection')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('warehouseName')
    expect(config.nativeFilterKeys).toContain('category')
  })

  it('contains io-report config', () => {
    const config = reportModuleEndpointContracts['io-report']
    expect(config).toBeDefined()
    expect(config.path).toBe('/io-report')
    expect(config.readOnly).toBe(true)
    expect(config.nativeFilterKeys).toContain('businessType')
    expect(config.dateRangeMapping?.businessDate.startKey).toBe('startDate')
    expect(config.dateRangeMapping?.businessDate.endKey).toBe('endDate')
  })
})
