import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getSupplierOptions: [],
}))

import { purchaseContractsPageConfig } from './purchase-contract-page'

describe('purchaseContractsPageConfig', () => {
  it('has correct key', () => {
    expect(purchaseContractsPageConfig.key).toBe('purchase-contract')
  })

  it('has primaryNoKey', () => {
    expect(purchaseContractsPageConfig.primaryNoKey).toBe('contractNo')
  })

  it('has filters', () => {
    expect(purchaseContractsPageConfig.filters).toBeDefined()
    expect(purchaseContractsPageConfig.filters!.length).toBeGreaterThanOrEqual(
      4,
    )
  })

  it('has columns', () => {
    expect(purchaseContractsPageConfig.columns).toBeDefined()
    expect(purchaseContractsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(purchaseContractsPageConfig.formFields).toBeDefined()
  })

  it('has parentImport config', () => {
    expect(purchaseContractsPageConfig.parentImport).toBeDefined()
    expect(purchaseContractsPageConfig.parentImport!.parentModuleKey).toBe(
      'purchase-order',
    )
  })

  it('has itemColumns', () => {
    expect(purchaseContractsPageConfig.itemColumns).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = purchaseContractsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
