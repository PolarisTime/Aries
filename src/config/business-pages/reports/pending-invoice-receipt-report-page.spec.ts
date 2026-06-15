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

  it('buildOverview returns result', () => {
    const result = pendingInvoiceReceiptReportPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
  })
})
