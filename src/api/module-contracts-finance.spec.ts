import { describe, expect, it } from 'vitest'

import { financeModuleEndpointContracts } from './module-contracts-finance'

describe('module-contracts-finance', () => {
  it('exports finance module contracts', () => {
    expect(financeModuleEndpointContracts).toBeDefined()
    expect(typeof financeModuleEndpointContracts).toBe('object')
  })

  it('contains supplier-statement config', () => {
    const config = financeModuleEndpointContracts['supplier-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/supplier-statements')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('supplierName')
    expect(config.nativeFilterKeys).toContain('status')
    expect(config.dateRangeMapping?.endDate.startKey).toBe('periodStart')
    expect(config.dateRangeMapping?.endDate.endKey).toBe('periodEnd')
  })

  it('contains customer-statement config', () => {
    const config = financeModuleEndpointContracts['customer-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/customer-statements')
    expect(config.nativeFilterKeys).toContain('customerName')
  })

  it('contains freight-statement config', () => {
    const config = financeModuleEndpointContracts['freight-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/freight-statements')
    expect(config.nativeFilterKeys).toContain('carrierName')
    expect(config.nativeFilterKeys).toContain('signStatus')
  })

  it('contains receipt config', () => {
    const config = financeModuleEndpointContracts.receipt
    expect(config).toBeDefined()
    expect(config.path).toBe('/receipts')
    expect(config.dateRangeMapping?.receiptDate.startKey).toBe('startDate')
  })

  it('contains payment config', () => {
    const config = financeModuleEndpointContracts.payment
    expect(config).toBeDefined()
    expect(config.path).toBe('/payments')
    expect(config.nativeFilterKeys).toContain('businessType')
  })

  it('contains invoice-receipt config', () => {
    const config = financeModuleEndpointContracts['invoice-receipt']
    expect(config).toBeDefined()
    expect(config.path).toBe('/invoice-receipts')
  })

  it('contains invoice-issue config', () => {
    const config = financeModuleEndpointContracts['invoice-issue']
    expect(config).toBeDefined()
    expect(config.path).toBe('/invoice-issues')
    expect(config.nativeFilterKeys).toContain('customerName')
  })

  it('contains receivable-payable config as read-only', () => {
    const config = financeModuleEndpointContracts['receivable-payable']
    expect(config).toBeDefined()
    expect(config.path).toBe('/receivable-payables')
    expect(config.readOnly).toBe(true)
    expect(config.supportsDetail).toBe(true)
    expect(config.sortDirectionParam).toBe('sortDirection')
  })

})
