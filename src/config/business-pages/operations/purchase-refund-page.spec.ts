import { describe, expect, it, vi } from 'vitest'

const getPurchaseRefundPreviewMock = vi.hoisted(() => vi.fn())

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...values: string[]) =>
    values.map((value) => ({ label: value, value })),
  getSettlementCompanyOptions: [],
  getSupplierOptions: [],
}))

vi.mock('@/api/purchase-order-candidates', () => ({
  getPurchaseRefundPreview: getPurchaseRefundPreviewMock,
}))

import { purchaseRefundsPageConfig } from './purchase-refund-page'

describe('purchaseRefundsPageConfig', () => {
  it('declares a complete purchase refund document page', () => {
    expect(purchaseRefundsPageConfig.key).toBe('purchase-refund')
    expect(purchaseRefundsPageConfig.primaryNoKey).toBe('refundNo')
    expect(
      purchaseRefundsPageConfig.actions?.map((action) => action.key),
    ).toEqual(['create', 'export'])
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

  it('uses the server refund candidate and preview workflow', () => {
    const parentImport = purchaseRefundsPageConfig.parentImport
    expect(parentImport).toBeDefined()
    expect(parentImport?.parentModuleKey).toBe('purchase-order')
    expect(parentImport?.parentFieldKey).toBe('purchaseOrderNo')
    expect(parentImport?.parentDisplayFieldKey).toBe('purchaseOrderNo')
    expect(parentImport?.candidateQueryType).toBe('purchase-refund-source')
    expect(
      parentImport?.buildParentFilters?.({
        id: '700520000000000099',
        supplierId: '700520000000000001',
      }),
    ).toEqual({
      supplierId: '700520000000000001',
      currentRecordId: '700520000000000099',
    })
    expect(parentImport?.resolveParentRecord).toBeTypeOf('function')
    expect(parentImport?.mapParentToDraft).toBeTypeOf('function')
    expect(parentImport?.transformItems).toBeTypeOf('function')
  })

  it('loads preview by selected order id and maps authoritative snapshots', async () => {
    const parentImport = purchaseRefundsPageConfig.parentImport!
    getPurchaseRefundPreviewMock.mockResolvedValue({
      id: '101',
      purchaseOrderNo: 'PO-001',
    })

    await expect(
      parentImport.resolveParentRecord!({ id: '101' }),
    ).resolves.toEqual(expect.objectContaining({ purchaseOrderNo: 'PO-001' }))
    expect(getPurchaseRefundPreviewMock).toHaveBeenCalledWith('101')

    expect(
      parentImport.mapParentToDraft!({
        id: '101',
        sourcePurchaseOrderId: '101',
        purchaseOrderNo: 'PO-001',
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '供应商甲',
        settlementCompanyId: '9',
        settlementCompanyName: '结算主体甲',
        totalQuantity: 3,
        totalWeight: 5.5,
        totalAmount: 1200,
      }),
    ).toEqual({
      sourcePurchaseOrderId: '101',
      purchaseOrderNo: 'PO-001',
      supplierId: '700520000000000001',
      supplierCode: 'SUP-001',
      supplierName: '供应商甲',
      settlementCompanyId: '9',
      settlementCompanyName: '结算主体甲',
      totalQuantity: 3,
      totalWeight: 5.5,
      totalAmount: 1200,
    })
  })

  it('turns preview rows into readonly refund line items', () => {
    const items = purchaseRefundsPageConfig.parentImport!.transformItems!({
      id: '101',
      items: [
        {
          id: '',
          sourcePurchaseOrderItemId: '501',
          quantity: 3,
          weightTon: 5.5,
          amount: 1200,
        },
      ],
    })

    expect(items).toEqual([
      expect.objectContaining({
        id: 'purchase-refund-item-501',
        sourcePurchaseOrderItemId: '501',
        quantity: 3,
        maxImportQuantity: 3,
        _maxImportWeightTon: 5.5,
        _maxImportAmount: 1200,
      }),
    ])
  })
})
