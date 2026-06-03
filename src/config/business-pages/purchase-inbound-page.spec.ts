import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...args: string[]) => args.map((v) => ({ label: v, value: v })),
  getSupplierOptions: [],
  isPurchaseWeighRequiredCategory: () => false,
}))

import { purchaseInboundsPageConfig } from './purchase-inbound-page'

describe('purchaseInboundsPageConfig', () => {
  it('has correct key', () => {
    expect(purchaseInboundsPageConfig.key).toBe('purchase-inbound')
  })

  it('has primaryNoKey', () => {
    expect(purchaseInboundsPageConfig.primaryNoKey).toBe('inboundNo')
  })

  it('has filters', () => {
    expect(purchaseInboundsPageConfig.filters).toBeDefined()
    expect(purchaseInboundsPageConfig.filters!.length).toBeGreaterThanOrEqual(4)
  })

  it('has columns', () => {
    expect(purchaseInboundsPageConfig.columns).toBeDefined()
    expect(purchaseInboundsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has parentImport config', () => {
    expect(purchaseInboundsPageConfig.parentImport).toBeDefined()
    expect(purchaseInboundsPageConfig.parentImport!.parentModuleKey).toBe('purchase-order')
  })

  it('has itemColumns', () => {
    expect(purchaseInboundsPageConfig.itemColumns).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = purchaseInboundsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
