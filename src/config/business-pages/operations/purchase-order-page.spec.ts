import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getSupplierOptions: [],
  getSettlementCompanyOptions: [],
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
}))

import { purchaseOrdersPageConfig } from './purchase-order-page'

describe('purchaseOrdersPageConfig', () => {
  it('has correct key', () => {
    expect(purchaseOrdersPageConfig.key).toBe('purchase-order')
  })

  it('has primaryNoKey', () => {
    expect(purchaseOrdersPageConfig.primaryNoKey).toBe('orderNo')
  })

  it('has filters', () => {
    expect(purchaseOrdersPageConfig.filters).toBeDefined()
    expect(purchaseOrdersPageConfig.filters!.length).toBeGreaterThanOrEqual(4)
  })

  it('has columns', () => {
    expect(purchaseOrdersPageConfig.columns).toBeDefined()
    expect(purchaseOrdersPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(purchaseOrdersPageConfig.detailFields).toBeDefined()
  })

  it('has formFields', () => {
    expect(purchaseOrdersPageConfig.formFields).toBeDefined()
  })

  it('has settlement company field', () => {
    expect(
      purchaseOrdersPageConfig.formFields?.map((field) => field.key),
    ).toContain('settlementCompanyId')
  })

  it('keeps settlement company in header after supplier instead of tables', () => {
    const formFieldKeys = purchaseOrdersPageConfig.formFields?.map(
      (field) => field.key,
    )
    expect(formFieldKeys?.indexOf('settlementCompanyId')).toBe(
      (formFieldKeys?.indexOf('supplierName') ?? -2) + 1,
    )
    expect(
      purchaseOrdersPageConfig.columns.map((column) => column.dataIndex),
    ).not.toContain('settlementCompanyName')
    expect(
      purchaseOrdersPageConfig.itemColumns?.map((column) => column.dataIndex),
    ).not.toContain('settlementCompanyName')
  })

  it('has itemColumns', () => {
    expect(purchaseOrdersPageConfig.itemColumns).toBeDefined()
    expect(purchaseOrdersPageConfig.itemColumns!.length).toBeGreaterThan(0)
  })

  it('buildOverview returns result', () => {
    const result = purchaseOrdersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has defaultHiddenColumnKeys', () => {
    expect(purchaseOrdersPageConfig.defaultHiddenColumnKeys).toBeDefined()
    expect(purchaseOrdersPageConfig.defaultHiddenColumnKeys).toContain(
      'buyerName',
    )
  })
})
