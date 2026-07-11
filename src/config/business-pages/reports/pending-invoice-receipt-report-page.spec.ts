import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getSupplierOptions: [],
}))

import { pendingInvoiceReceiptReportPageConfig } from './pending-invoice-receipt-report-page'

describe('pendingInvoiceReceiptReportPageConfig', () => {
  it('has correct key', () => {
    expect(pendingInvoiceReceiptReportPageConfig.key).toBe(
      'pending-invoice-receipt-report',
    )
  })

  it('is readOnly', () => {
    expect(pendingInvoiceReceiptReportPageConfig.readOnly).toBe(true)
  })

  it('does not expose export without a backend endpoint', () => {
    expect(
      pendingInvoiceReceiptReportPageConfig.actions?.some(
        (action) => action.key === 'export',
      ) ?? false,
    ).toBe(false)
  })

  it('has filters', () => {
    expect(pendingInvoiceReceiptReportPageConfig.filters).toBeDefined()
    expect(
      pendingInvoiceReceiptReportPageConfig.filters!.length,
    ).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(pendingInvoiceReceiptReportPageConfig.columns).toBeDefined()
    expect(
      pendingInvoiceReceiptReportPageConfig.columns.length,
    ).toBeGreaterThan(0)
  })

  it('keeps pending invoice context visible and hides completed-value details by default', () => {
    const columnKeys = pendingInvoiceReceiptReportPageConfig.columns.map(
      (column) => column.dataIndex,
    )
    const hiddenKeys =
      pendingInvoiceReceiptReportPageConfig.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual([
      'brand',
      'material',
      'category',
      'length',
      'orderQuantity',
      'quantityUnit',
      'orderWeightTon',
      'receivedInvoiceWeightTon',
      'unitPrice',
      'orderAmount',
      'receivedInvoiceAmount',
    ])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'orderNo',
        'supplierName',
        'invoiceTitle',
        'orderDate',
        'materialCode',
        'spec',
        'pendingInvoiceWeightTon',
        'pendingInvoiceAmount',
        'status',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
  })

  it('buildOverview returns result', () => {
    const result = pendingInvoiceReceiptReportPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
  })
})
