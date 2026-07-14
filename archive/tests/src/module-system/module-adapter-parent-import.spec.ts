import { describe, expect, it } from 'vitest'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import {
  buildOccupiedParentMap,
  buildParentImportState,
  resolveParentImportDefinition,
} from './module-adapter-parent-import'

const cloneLineItems = (value: unknown) =>
  structuredClone(value) as ModuleLineItem[]

describe('resolveParentImportDefinition', () => {
  it('resolves a dynamic payment or receipt selector from the current draft', () => {
    const definition = {
      parentModuleKey: 'payment',
      parentDisplayFieldKey: 'paymentNo',
      parentFieldKey: 'sourceDocumentNo',
      label: '原资金单据',
      resolveParentSelector: (record: ModuleRecord) =>
        record.sourceType === '收款单'
          ? {
              parentModuleKey: 'receipt',
              parentDisplayFieldKey: 'receiptNo',
            }
          : {
              parentModuleKey: 'payment',
              parentDisplayFieldKey: 'paymentNo',
            },
    }

    expect(
      resolveParentImportDefinition(definition, {
        id: '',
        sourceType: '收款单',
      }),
    ).toMatchObject({
      parentModuleKey: 'receipt',
      parentDisplayFieldKey: 'receiptNo',
      parentFieldKey: 'sourceDocumentNo',
    })
  })
})

function makeItem(overrides: Partial<ModuleLineItem> = {}): ModuleLineItem {
  return {
    id: 'item-1',
    materialCode: '',
    brand: '',
    category: '',
    material: '',
    spec: '',
    length: '',
    unit: '吨',
    batchNo: '',
    quantityUnit: '件',
    pieceWeightTon: 0,
    piecesPerBundle: 0,
    quantity: 0,
    weightTon: 0,
    weighWeightTon: undefined,
    weightAdjustmentTon: 0,
    weightAdjustmentAmount: 0,
    unitPrice: 0,
    amount: 0,
    ...overrides,
  }
}

describe('buildParentImportState', () => {
  const parentImportConfig = {
    parentModuleKey: 'sales-order',
    label: '销售订单',
    parentFieldKey: 'sourceOrderNos',
    parentDisplayFieldKey: 'orderNo',
    mapParentToDraft: (parent: ModuleRecord) => ({
      customerName: parent.customerName,
      projectName: parent.projectName,
    }),
  }

  const parentRecord = {
    id: '1',
    orderNo: 'SO001',
    customerName: '客户A',
    projectName: '项目X',
    items: [
      {
        id: 'p-item-1',
        materialCode: 'M001',
        quantity: 10,
        weightTon: 5,
        amount: 500,
      },
      {
        id: 'p-item-2',
        materialCode: 'M002',
        quantity: 5,
        weightTon: 3,
        amount: 300,
      },
    ],
  } as any

  it('imports items from parent record', () => {
    const result = buildParentImportState({
      parentImportConfig: {
        ...parentImportConfig,
        transformItems: (parent: ModuleRecord) => cloneLineItems(parent.items!),
      } as any,
      parentRecord,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(result.parentNo).toBe('SO001')
    expect(result.parentId).toBe('1')
    expect(result.hasImportedCurrentParent).toBe(false)
    expect(result.importedItemCount).toBe(2)
    expect(result.parentNosText).toBe('SO001')
    expect(result.nextItems).toHaveLength(2)
    expect(result.nextItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _parentRelationId: '1' }),
      ]),
    )
    expect(result.mappedValues).toEqual({
      customerName: '客户A',
      projectName: '项目X',
    })
    expect(result.shouldApplyMappedValues).toBe(true)
  })

  it('replaces items for already imported parent', () => {
    const result = buildParentImportState({
      parentImportConfig: {
        ...parentImportConfig,
        transformItems: (parent: ModuleRecord) => cloneLineItems(parent.items!),
      } as any,
      parentRecord,
      currentParentNos: ['SO001'],
      currentItems: [
        makeItem({
          id: 'existing-1',
          materialCode: 'M001',
          _parentRelationNo: 'SO001',
          sourceNo: 'SO001',
          quantity: 10,
        }),
      ],
      cloneLineItems,
    })

    expect(result.hasImportedCurrentParent).toBe(true)
    expect(result.nextItems).toHaveLength(2)
  })

  it('uses parent id for replacement when different parents share a display number', () => {
    const result = buildParentImportState({
      parentImportConfig: {
        ...parentImportConfig,
        transformItems: (parent: ModuleRecord) => cloneLineItems(parent.items!),
      } as any,
      parentRecord: {
        ...parentRecord,
        id: '2',
        orderNo: 'SO001',
      },
      currentParentNos: ['SO001'],
      currentItems: [
        makeItem({
          id: 'existing-1',
          materialCode: 'M-OLD',
          _parentRelationId: '1',
          _parentRelationNo: 'SO001',
          sourceNo: 'SO001',
          quantity: 1,
        }),
      ],
      cloneLineItems,
    })

    expect(result.parentId).toBe('2')
    expect(result.hasImportedCurrentParent).toBe(false)
    expect(result.nextItems).toHaveLength(3)
    expect(result.nextItems[0]).toMatchObject({
      materialCode: 'M-OLD',
      _parentRelationId: '1',
    })
    expect(result.nextItems.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _parentRelationId: '2' }),
      ]),
    )
  })

  it('fails closed when a parent id is an unsafe number', () => {
    expect(() =>
      buildParentImportState({
        parentImportConfig: parentImportConfig as any,
        parentRecord: {
          ...parentRecord,
          id: Number.MAX_SAFE_INTEGER + 1,
        } as any,
        currentParentNos: [],
        currentItems: [],
        cloneLineItems,
      }),
    ).toThrow('parentRecord.id')
  })

  it('maps parent to draft only for first import', () => {
    const result = buildParentImportState({
      parentImportConfig: {
        ...parentImportConfig,
        transformItems: (parent: ModuleRecord) => cloneLineItems(parent.items!),
      } as any,
      parentRecord,
      currentParentNos: ['SO002'],
      currentItems: [makeItem({ id: 'existing-1', materialCode: 'M003' })],
      cloneLineItems,
    })

    expect(result.shouldApplyMappedValues).toBe(false)
    expect(result.nextItems).toHaveLength(3)
  })

  it('handles empty parent items', () => {
    const emptyParent = { id: '2', orderNo: 'SO002', items: [] } as any
    const result = buildParentImportState({
      parentImportConfig: parentImportConfig as any,
      parentRecord: emptyParent,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(result.importedItemCount).toBe(0)
    expect(result.nextItems).toHaveLength(0)
  })

  it('handles parent records without item arrays', () => {
    const result = buildParentImportState({
      parentImportConfig: parentImportConfig as any,
      parentRecord: { id: '2', orderNo: 'SO002', items: undefined } as any,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(result.importedItemCount).toBe(0)
    expect(result.nextItems).toHaveLength(0)
  })

  it('allocates remaining quantities correctly', () => {
    const parentWithAllocations = {
      id: '1',
      orderNo: 'SO001',
      items: [
        {
          id: 'p-item-1',
          sourceSalesOrderItemId: '308251467645452301',
          materialCode: 'M001',
          quantity: 10,
          remainingQuantity: 5,
          weightTon: 5,
          remainingWeightTon: 3,
          amount: 500,
          remainingAmount: 250,
        },
      ],
    } as any

    const currentItems: ModuleLineItem[] = []
    const result = buildParentImportState({
      parentImportConfig: {
        parentModuleKey: 'sales-order',
        label: '销售订单',
        parentFieldKey: 'sourceOrderNos',
        parentDisplayFieldKey: 'orderNo',
      } as any,
      parentRecord: parentWithAllocations,
      currentParentNos: [],
      currentItems,
      cloneLineItems,
    })

    expect(result.importedItemCount).toBe(1)
    expect(result.nextItems[0].quantity).toBe(5)
    expect(result.nextItems[0]._maxImportQuantity).toBe(5)
  })

  it('uses explicit max import limits when provided', () => {
    const record = {
      id: '3',
      orderNo: 'SO003',
      items: [
        {
          id: 'p-item-1',
          sourceInboundItemId: '308251467645452302',
          materialCode: 'M001',
          quantity: 8,
          remainingQuantity: 4,
          maxImportQuantity: 9,
          weightTon: 6,
          remainingWeightTon: 2,
          maxImportWeightTon: 7,
          amount: 800,
          remainingAmount: 300,
          maxImportAmount: 900,
        },
      ],
    } as any

    const result = buildParentImportState({
      parentImportConfig: {
        parentModuleKey: 'purchase-inbound',
        label: '采购入库',
        parentFieldKey: 'sourceOrderNos',
        parentDisplayFieldKey: 'orderNo',
      } as any,
      parentRecord: record,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(result.nextItems[0]).toMatchObject({
      quantity: 4,
      _maxImportQuantity: 9,
      weightTon: 2,
      _maxImportWeightTon: 7,
      amount: 300,
      _maxImportAmount: 900,
    })
  })

  it('handles items with sourceParentItemId but zero quantity', () => {
    const record = {
      id: '3',
      orderNo: 'SO003',
      items: [
        {
          id: 'p-item-1',
          sourceSalesOrderItemId: '308251467645452303',
          materialCode: 'M001',
          quantity: 0,
          weightTon: 0,
          amount: 0,
        },
      ],
    } as any

    const result = buildParentImportState({
      parentImportConfig: {
        parentModuleKey: 'sales-order',
        label: '销售订单',
        parentFieldKey: 'sourceOrderNos',
        parentDisplayFieldKey: 'orderNo',
      } as any,
      parentRecord: record,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(result.importedItemCount).toBe(0)
    expect(result.nextItems).toHaveLength(0)
  })

  it('deduplicates existing allocations from current items', () => {
    const record = {
      id: '4',
      orderNo: 'SO004',
      items: [
        {
          id: 'p-item-1',
          sourceSalesOrderItemId: '308251467645452304',
          materialCode: 'M001',
          quantity: 10,
          remainingQuantity: 10,
          weightTon: 5,
          remainingWeightTon: 5,
          amount: 500,
          remainingAmount: 500,
        },
      ],
    } as any

    const currentItems = [
      makeItem({
        id: 'existing',
        sourceSalesOrderItemId: '308251467645452304',
        quantity: 3,
        weightTon: 2,
        amount: 200,
        _parentRelationNo: 'SO004',
        sourceNo: 'SO004',
      }),
    ]

    const result = buildParentImportState({
      parentImportConfig: {
        parentModuleKey: 'sales-order',
        label: '销售订单',
        parentFieldKey: 'sourceOrderNos',
        parentDisplayFieldKey: 'orderNo',
      } as any,
      parentRecord: record,
      currentParentNos: ['SO004'],
      currentItems,
      cloneLineItems,
    })

    expect(result.importedItemCount).toBe(1)
    expect(result.nextItems[0].quantity).toBe(3)
    expect(result.nextItems[0]._maxImportQuantity).toBe(13)
  })

  it('filters out empty draft line items from effectiveCurrentItems', () => {
    const record = {
      id: '5',
      orderNo: 'SO005',
      items: [
        {
          id: 'p-item-1',
          materialCode: 'M001',
          quantity: 10,
          weightTon: 5,
          amount: 500,
        },
      ],
    } as any

    const emptyItem = makeItem({ id: '', materialCode: '' })
    const nonEmptyItem = makeItem({
      id: 'existing-item',
      materialCode: 'M002',
      quantity: 5,
    })

    const result = buildParentImportState({
      parentImportConfig: parentImportConfig as any,
      parentRecord: record,
      currentParentNos: [],
      currentItems: [emptyItem, nonEmptyItem],
      cloneLineItems,
    })

    expect(result.nextItems).toHaveLength(2)
  })

  it('uses the direct freight bill item id before every indirect source id', () => {
    const record = {
      id: '6',
      orderNo: 'FB006',
      items: [
        {
          id: '308251467645452310',
          sourceFreightBillItemId: '308251467645452311',
          sourceSalesOutboundItemId: '308251467645452312',
          sourceInboundItemId: '308251467645452313',
          sourcePurchaseOrderItemId: '308251467645452314',
          sourceSalesOrderItemId: '308251467645452315',
          quantity: 8,
          remainingQuantity: 8,
        },
      ],
    } as any
    const currentItems = [
      makeItem({
        id: 'existing',
        sourceFreightBillItemId: '308251467645452311',
        sourceSalesOutboundItemId: '308251467645452322',
        sourceInboundItemId: '308251467645452323',
        sourcePurchaseOrderItemId: '308251467645452324',
        sourceSalesOrderItemId: '308251467645452325',
        quantity: 3,
        _parentRelationNo: 'FB006',
        sourceNo: 'FB006',
      }),
    ]

    const result = buildParentImportState({
      parentImportConfig: parentImportConfig as any,
      parentRecord: record,
      currentParentNos: ['FB006'],
      currentItems,
      cloneLineItems,
    })

    expect(result.nextItems[0].quantity).toBe(3)
    expect(result.nextItems[0]._maxImportQuantity).toBe(11)
  })

  it('recognizes a sales outbound item id as the direct parent identity', () => {
    const record = {
      id: '7',
      orderNo: 'SO007',
      items: [
        {
          id: '308251467645452330',
          sourceSalesOutboundItemId: '308251467645452331',
          quantity: 0,
        },
      ],
    } as any

    const result = buildParentImportState({
      parentImportConfig: parentImportConfig as any,
      parentRecord: record,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(result.importedItemCount).toBe(0)
    expect(result.nextItems).toEqual([])
  })

  it('fails closed on an unsafe numeric direct parent item id', () => {
    const record = {
      id: '8',
      orderNo: 'SO008',
      items: [
        {
          id: '308251467645452340',
          sourceFreightBillItemId: 9_007_199_254_740_992,
          sourceInboundItemId: '308251467645452341',
          quantity: 1,
        },
      ],
    } as any

    expect(() =>
      buildParentImportState({
        parentImportConfig: parentImportConfig as any,
        parentRecord: record,
        currentParentNos: [],
        currentItems: [],
        cloneLineItems,
      }),
    ).toThrow('实体 ID 契约无效：sourceFreightBillItemId')
  })
})

describe('buildOccupiedParentMap', () => {
  it('builds map of occupied parent nos', () => {
    const rows = [
      { id: '1', sourceOrderNos: 'SO001, SO002' },
      { id: '2', sourceOrderNos: 'SO003' },
    ] as any
    const result = buildOccupiedParentMap(rows, 'sourceOrderNos')
    expect(Object.keys(result)).toEqual(['SO001', 'SO002', 'SO003'])
  })

  it('excludes current editor record', () => {
    const rows = [
      { id: '1', sourceOrderNos: 'SO001' },
      { id: '2', sourceOrderNos: 'SO002' },
    ] as any
    const result = buildOccupiedParentMap(rows, 'sourceOrderNos', '1')
    expect(Object.keys(result)).toEqual(['SO002'])
  })

  it('returns empty object for empty rows', () => {
    expect(buildOccupiedParentMap([], 'field')).toEqual({})
  })
})
