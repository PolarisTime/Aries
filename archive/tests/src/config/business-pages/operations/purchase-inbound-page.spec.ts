import { describe, expect, it, vi } from 'vitest'

const moduleOptionsMock = vi.hoisted(() => ({
  isPurchaseWeighRequiredCategory: vi.fn(
    (category: unknown) => category === '盘螺',
  ),
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
  getSupplierOptions: [],
  getSettlementCompanyOptions: [],
  isPurchaseWeighRequiredCategory:
    moduleOptionsMock.isPurchaseWeighRequiredCategory,
}))

import { purchaseInboundsPageConfig } from './purchase-inbound-page'

describe('purchaseInboundsPageConfig', () => {
  const parentImport = purchaseInboundsPageConfig.parentImport!

  it('has correct key', () => {
    expect(purchaseInboundsPageConfig.key).toBe('purchase-inbound')
  })

  it('has primaryNoKey', () => {
    expect(purchaseInboundsPageConfig.primaryNoKey).toBe('inboundNo')
  })

  it('has filters', () => {
    expect(purchaseInboundsPageConfig.filters).toBeDefined()
    expect(purchaseInboundsPageConfig.filters!.length).toBeGreaterThanOrEqual(4)
    expect(
      purchaseInboundsPageConfig.filters!.map((filter) => filter.key),
    ).toContain('settlementCompanyId')
  })

  it('keeps common filters visible and moves secondary filters to the advanced row', () => {
    const filterRows = Object.fromEntries(
      purchaseInboundsPageConfig.filters.map((filter) => [
        filter.key,
        filter.row ?? 1,
      ]),
    )

    expect(filterRows).toEqual({
      keyword: 1,
      supplierId: 1,
      settlementCompanyId: 2,
      status: 1,
      inboundDate: 2,
    })
  })

  it('uses supplierId as the editable supplier identity', () => {
    expect(
      purchaseInboundsPageConfig.formFields?.find(
        (field) => field.key === 'supplierId',
      ),
    ).toEqual(expect.objectContaining({ type: 'select', required: true }))
  })

  it('has columns', () => {
    expect(purchaseInboundsPageConfig.columns).toBeDefined()
    expect(purchaseInboundsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('shows the source order and keeps secondary columns hidden by default', () => {
    const columnKeys = purchaseInboundsPageConfig.columns.map(
      (column) => column.dataIndex,
    )

    expect(columnKeys).toEqual(
      expect.arrayContaining(['purchaseOrderNo', 'settlementCompanyName']),
    )
    expect(purchaseInboundsPageConfig.defaultHiddenColumnKeys).toEqual(
      expect.arrayContaining([
        'settlementCompanyName',
        'totalWeightAdjustmentTon',
        'remark',
      ]),
    )
    expect(purchaseInboundsPageConfig.defaultHiddenColumnKeys).not.toContain(
      'purchaseOrderNo',
    )
  })

  it('has parentImport config', () => {
    expect(purchaseInboundsPageConfig.parentImport).toBeDefined()
    expect(parentImport.parentModuleKey).toBe('purchase-order')
    expect(parentImport.candidateQueryType).toBe('purchase-order-import')
    expect(parentImport.candidateUsage).toBe('purchase-inbound')
    expect(
      parentImport.buildParentFilters?.({
        id: '700520000000000099',
        supplierId: '700520000000000001',
      }),
    ).toEqual({
      supplierId: '700520000000000001',
      currentRecordId: '700520000000000099',
    })
    expect(parentImport.hiddenSelectorColumnKeys).toContain('status')
  })

  it('maps parent purchase order fields into draft with settlement company', () => {
    expect(
      parentImport.mapParentToDraft?.({
        id: 'po-1',
        orderNo: 'PO-001',
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '供应商A',
        settlementCompanyId: 'company-1',
        settlementCompanyName: '结算主体A',
        items: [
          {
            id: 'item-1',
            category: '盘螺',
            warehouseId: 'warehouse-1',
            warehouseName: '一号库',
            quantity: 1,
          },
        ],
      }),
    ).toEqual({
      purchaseOrderNo: 'PO-001',
      supplierId: '700520000000000001',
      supplierCode: 'SUP-001',
      supplierName: '供应商A',
      settlementCompanyId: 'company-1',
      settlementCompanyName: '结算主体A',
      warehouseId: 'warehouse-1',
      warehouseName: '一号库',
      settlementMode: '过磅',
    })
  })

  it('maps parent purchase order draft defaults when optional fields are missing', () => {
    expect(parentImport.mapParentToDraft?.({ id: 'po-2' })).toEqual({
      purchaseOrderNo: '',
      supplierId: undefined,
      supplierCode: '',
      supplierName: '',
      settlementCompanyId: undefined,
      settlementCompanyName: '',
      warehouseId: undefined,
      warehouseName: '',
      settlementMode: '',
    })
  })

  it('transforms remaining purchase order items and derives settlement mode', () => {
    const items = parentImport.transformItems?.({
      id: 'po-1',
      items: [
        {
          id: 'item-1',
          category: '盘螺',
          remainingQuantity: 5,
          quantity: 9,
          pieceWeightTon: 0.8,
          unitPrice: 4000,
          actualWeightTon: 3.9,
          actualPieceWeightTon: 0.78,
          warehouseId: 'warehouse-1',
          warehouseName: '一号库',
          lockedSalesWeightTon: 2.4,
        },
        {
          id: 'item-2',
          category: '螺纹钢',
          quantity: '3',
          pieceWeightTon: 1.2,
          warehouseId: 'warehouse-1',
          warehouseName: '一号库',
        },
        {
          id: 'item-3',
          category: '盘螺',
          remainingQuantity: 2,
          quantity: 4,
          pieceWeightTon: 0.5,
          unitPrice: 4100,
          warehouseId: 'warehouse-1',
          warehouseName: '一号库',
        },
      ],
    })

    expect(items).toHaveLength(2)
    expect(items?.[0]).toMatchObject({
      quantity: 5,
      sourcePurchaseOrderItemId: 'item-1',
      _sourcePieceWeightTon: 0.8,
      _lockedSalesWeightTon: 2.4,
      settlementMode: '过磅',
      weightTon: 4,
      amount: 16000,
    })
    expect(items?.[1]).toMatchObject({
      quantity: 2,
      sourcePurchaseOrderItemId: 'item-3',
      _sourcePieceWeightTon: 0.5,
      settlementMode: '过磅',
      weightTon: 1,
      amount: 4100,
    })
    expect(items?.[0]?.id).toContain('purchase-inbound-item')
    expect(items?.[0]?.actualWeightTon).toBeUndefined()
    expect(items?.[0]?.actualPieceWeightTon).toBeUndefined()
    expect(items?.[0]?.weighWeightTon).toBeUndefined()
    expect(
      moduleOptionsMock.isPurchaseWeighRequiredCategory,
    ).toHaveBeenCalledWith('盘螺')
    expect(
      moduleOptionsMock.isPurchaseWeighRequiredCategory,
    ).toHaveBeenCalledWith('螺纹钢')
  })

  it('rejects a second source order and source rows without stable ids', () => {
    expect(
      parentImport.validateParentImport?.({
        currentRecord: { id: '' },
        currentItems: [],
        currentParentNos: ['PO-001'],
        parentRecord: { id: 'po-2', orderNo: 'PO-002', items: [] },
      }),
    ).toContain('只能导入一张采购订单')

    expect(
      parentImport.validateParentImport?.({
        currentRecord: { id: '' },
        currentItems: [],
        currentParentNos: [],
        parentRecord: {
          id: 'po-1',
          orderNo: 'PO-001',
          items: [
            {
              id: '',
              category: '盘螺',
              warehouseId: 'warehouse-1',
              quantity: 1,
            },
          ],
        },
      }),
    ).toContain('缺少稳定来源ID')
  })

  it('filters items without remaining quantity and handles missing parent items', () => {
    expect(
      parentImport.transformItems?.({
        id: 'po-2',
        items: [
          { id: 'item-3', category: '盘螺', remainingQuantity: 0, quantity: 8 },
          { id: 'item-4', category: '螺纹钢', quantity: 0 },
          { id: 'item-5', category: '螺纹钢' },
        ],
      }),
    ).toEqual([])

    expect(parentImport.transformItems?.({ id: 'po-3' })).toEqual([])
  })

  it('has itemColumns', () => {
    expect(purchaseInboundsPageConfig.itemColumns).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = purchaseInboundsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
