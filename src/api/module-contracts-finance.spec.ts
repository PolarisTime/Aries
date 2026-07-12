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
    expect(config.nativeFilterKeys).toContain('supplierId')
    expect(config.nativeFilterKeys).toContain('status')
    expect(config.dateRangeMapping?.endDate.startKey).toBe('periodStart')
    expect(config.dateRangeMapping?.endDate.endKey).toBe('periodEnd')
  })

  it('contains customer-statement config', () => {
    const config = financeModuleEndpointContracts['customer-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/customer-statements')
    expect(config.nativeFilterKeys).toContain('customerName')
    expect(config.nativeFilterKeys).toEqual(
      expect.arrayContaining(['customerId', 'projectId']),
    )
  })

  it('contains freight-statement config', () => {
    const config = financeModuleEndpointContracts['freight-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/freight-statements')
    expect(config.nativeFilterKeys).toContain('carrierCode')
    expect(config.nativeFilterKeys).toContain('carrierName')
    expect(config.nativeFilterKeys).toContain('carrierId')
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

  it('contains supplier-refund-receipt config', () => {
    const config = financeModuleEndpointContracts['supplier-refund-receipt']
    expect(config).toBeDefined()
    expect(config.path).toBe('/supplier-refund-receipts')
    expect(config.nativeFilterKeys).toEqual([
      'keyword',
      'supplierName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ])
    expect(config.dateRangeMapping?.receiptDate).toEqual({
      startKey: 'startDate',
      endKey: 'endDate',
    })
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

  it('contains ledger-adjustment config', () => {
    const config = financeModuleEndpointContracts['ledger-adjustment']
    expect(config).toBeDefined()
    expect(config.path).toBe('/ledger-adjustments')
    expect(config.nativeFilterKeys).toContain('direction')
    expect(config.nativeFilterKeys).toContain('counterpartyType')
    expect(config.nativeFilterKeys).toContain('settlementCompanyId')
    expect(config.dateRangeMapping?.adjustmentDate.startKey).toBe('startDate')
    expect(config.dateRangeMapping?.adjustmentDate.endKey).toBe('endDate')
  })

  it('contains receivable-payable config as read-only', () => {
    const config = financeModuleEndpointContracts['receivable-payable']
    expect(config).toBeDefined()
    expect(config.path).toBe('/receivable-payables')
    expect(config.readOnly).toBe(true)
    expect(config.supportsDetail).toBe(true)
    expect(config.sortDirectionParam).toBe('sortDirection')
    expect(config.nativeFilterKeys).toContain('reconciliationStatus')
    expect(new Set(config.nativeFilterKeys).size).toBe(
      config.nativeFilterKeys?.length,
    )
  })
})
