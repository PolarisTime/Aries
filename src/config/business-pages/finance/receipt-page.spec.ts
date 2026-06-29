import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  customerOptions: [],
  getSettlementCompanyOptions: () => [],
}))

import { receiptsPageConfig } from './receipt-page'

describe('receiptsPageConfig', () => {
  it('has correct key', () => {
    expect(receiptsPageConfig.key).toBe('receipt')
  })

  it('has primaryNoKey', () => {
    expect(receiptsPageConfig.primaryNoKey).toBe('receiptNo')
  })

  it('has filters', () => {
    expect(receiptsPageConfig.filters).toBeDefined()
    expect(receiptsPageConfig.filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(receiptsPageConfig.columns).toBeDefined()
    expect(receiptsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(receiptsPageConfig.formFields).toBeDefined()
  })

  it('has saveFields', () => {
    expect(receiptsPageConfig.saveFields).toBeDefined()
    expect(receiptsPageConfig.saveFields!.scalar).toContain('receiptNo')
    expect(receiptsPageConfig.saveFields!.scalar).toContain(
      'settlementCompanyId',
    )
  })

  it('buildOverview returns result', () => {
    const result = receiptsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has defaultHiddenColumnKeys', () => {
    expect(receiptsPageConfig.defaultHiddenColumnKeys).toBeDefined()
  })
})
