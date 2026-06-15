import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getCustomerOptions: [],
}))

import { salesContractsPageConfig } from './sales-contract-page'

describe('salesContractsPageConfig', () => {
  it('has correct key', () => {
    expect(salesContractsPageConfig.key).toBe('sales-contract')
  })

  it('has primaryNoKey', () => {
    expect(salesContractsPageConfig.primaryNoKey).toBe('contractNo')
  })

  it('has filters', () => {
    expect(salesContractsPageConfig.filters).toBeDefined()
    expect(salesContractsPageConfig.filters!.length).toBeGreaterThanOrEqual(4)
  })

  it('has columns', () => {
    expect(salesContractsPageConfig.columns).toBeDefined()
    expect(salesContractsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(salesContractsPageConfig.formFields).toBeDefined()
  })

  it('has itemColumns', () => {
    expect(salesContractsPageConfig.itemColumns).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = salesContractsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
