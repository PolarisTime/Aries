import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getSupplierOptions: [],
  getCustomerOptions: [],
  getSettlementCompanyOptions: [],
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
  isPurchaseWeighRequiredCategory: () => false,
  enabledStatusOptions: [],
}))

import { purchaseOperationsPageConfigs } from './purchase-operations'

describe('purchaseOperationsPageConfigs', () => {
  it('contains purchase-order config', () => {
    expect(purchaseOperationsPageConfigs['purchase-order']).toBeDefined()
    expect(purchaseOperationsPageConfigs['purchase-order'].key).toBe(
      'purchase-order',
    )
  })

  it('contains purchase-inbound config', () => {
    expect(purchaseOperationsPageConfigs['purchase-inbound']).toBeDefined()
    expect(purchaseOperationsPageConfigs['purchase-inbound'].key).toBe(
      'purchase-inbound',
    )
  })

  it('contains purchase-refund config', () => {
    expect(purchaseOperationsPageConfigs['purchase-refund']).toBeDefined()
    expect(purchaseOperationsPageConfigs['purchase-refund'].key).toBe(
      'purchase-refund',
    )
  })

  it('has exactly 3 entries', () => {
    expect(Object.keys(purchaseOperationsPageConfigs)).toHaveLength(3)
  })
})
