import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getWarehouseOptions: [],
  materialCategoryOptions: [],
  getSupplierOptions: [],
}))

import { financeReportPageConfigs } from './finance-report-pages'

describe('financeReportPageConfigs', () => {
  it('contains inventory-report config', () => {
    expect(financeReportPageConfigs['inventory-report']).toBeDefined()
    expect(financeReportPageConfigs['inventory-report'].key).toBe(
      'inventory-report',
    )
  })

  it('contains io-report config', () => {
    expect(financeReportPageConfigs['io-report']).toBeDefined()
    expect(financeReportPageConfigs['io-report'].key).toBe('io-report')
  })

  it('contains pending-invoice-receipt-report config', () => {
    expect(
      financeReportPageConfigs['pending-invoice-receipt-report'],
    ).toBeDefined()
  })

  it('has exactly 3 entries', () => {
    expect(Object.keys(financeReportPageConfigs)).toHaveLength(3)
  })
})
