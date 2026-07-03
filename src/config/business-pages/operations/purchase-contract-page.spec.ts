import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getSupplierOptions: [],
}))

import { purchaseContractsPageConfig } from './purchase-contract-page'

describe('purchaseContractsPageConfig', () => {
  const parentImport = purchaseContractsPageConfig.parentImport!

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
    expect(parentImport.parentModuleKey).toBe('purchase-order')
  })

  it('maps parent purchase order fields into an archived contract draft', () => {
    const draft = parentImport.mapParentToDraft?.({
      orderDate: '2025-03-18',
      supplierName: '供应商A',
      buyerName: '采购员A',
    })

    expect(draft).toMatchObject({
      supplierName: '供应商A',
      buyerName: '采购员A',
      signDate: '2025-03-18',
      effectiveDate: '2025-03-18',
      status: '已归档',
    })
    expect(draft?.expireDate?.format('YYYY-MM-DD')).toBe('2026-03-18')
  })

  it('maps parent purchase order draft defaults when optional fields are missing', () => {
    expect(parentImport.mapParentToDraft?.({ id: 'po-1' })).toEqual({
      supplierName: '',
      buyerName: '',
      signDate: undefined,
      effectiveDate: undefined,
      expireDate: undefined,
      status: '已归档',
    })
  })

  it('transforms parent items into purchase contract items', () => {
    const items = parentImport.transformItems?.({
      id: 'po-1',
      items: [
        {
          id: 'item-1',
          materialName: '螺纹钢',
          quantity: 3,
        },
      ],
    })

    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({
      materialName: '螺纹钢',
      quantity: 3,
    })
    expect(items?.[0]?.id).toContain('purchase-contract-item')
  })

  it('returns empty transformed items when parent items are missing or not an array', () => {
    expect(parentImport.transformItems?.({ id: 'po-2' })).toEqual([])
    expect(
      parentImport.transformItems?.({ id: 'po-3', items: 'invalid' }),
    ).toEqual([])
  })

  it('has itemColumns', () => {
    expect(purchaseContractsPageConfig.itemColumns).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = purchaseContractsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
