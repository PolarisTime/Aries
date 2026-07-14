import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...values: string[]) =>
    values.map((value) => ({ label: value, value })),
  getSettlementCompanyOptions: [],
  getSupplierOptions: [],
}))

import { purchaseRefundsPageConfig } from './purchase-refund-page'

describe('purchaseRefundsPageConfig', () => {
  it('declares a complete purchase refund document page', () => {
    expect(purchaseRefundsPageConfig.key).toBe('purchase-refund')
    expect(purchaseRefundsPageConfig.primaryNoKey).toBe('refundNo')
    expect(purchaseRefundsPageConfig.allowManualCreate).toBe(false)
    expect(
      purchaseRefundsPageConfig.actions?.map((action) => action.key),
    ).toEqual([])
    expect(purchaseRefundsPageConfig.parentImport).toBeUndefined()
    expect(
      purchaseRefundsPageConfig.filters.map((filter) => filter.key),
    ).toEqual([
      'keyword',
      'supplierId',
      'settlementCompanyId',
      'status',
      'refundDate',
    ])
    expect(
      purchaseRefundsPageConfig.columns.map((column) => column.dataIndex),
    ).toEqual(
      expect.arrayContaining([
        'refundNo',
        'purchaseOrderNo',
        'supplierName',
        'refundDate',
        'totalQuantity',
        'totalWeight',
        'totalAmount',
        'status',
      ]),
    )
    expect(
      purchaseRefundsPageConfig.formFields?.map((field) => field.key),
    ).toEqual(
      expect.arrayContaining([
        'refundNo',
        'purchaseOrderNo',
        'supplierName',
        'settlementCompanyName',
        'refundDate',
        'totalQuantity',
        'totalWeight',
        'totalAmount',
        'operatorName',
        'remark',
      ]),
    )
    expect(purchaseRefundsPageConfig.itemColumns?.length).toBeGreaterThan(0)
    expect(purchaseRefundsPageConfig.saveFields?.scalar).toEqual([
      'refundNo',
      'sourcePurchaseOrderId',
      'refundDate',
      'status',
      'operatorName',
      'remark',
    ])
    expect(purchaseRefundsPageConfig.saveFields?.lineItem).toBeUndefined()
  })

  it('keeps common filters visible and moves secondary filters to the advanced row', () => {
    const filterRows = Object.fromEntries(
      purchaseRefundsPageConfig.filters.map((filter) => [
        filter.key,
        filter.row ?? 1,
      ]),
    )

    expect(filterRows).toEqual({
      keyword: 1,
      supplierId: 1,
      settlementCompanyId: 2,
      status: 1,
      refundDate: 2,
    })
  })
})
