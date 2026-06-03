import { describe, expect, it } from 'vitest'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import {
  buildOccupiedParentMap,
  buildParentImportState,
} from './module-adapter-parent-import'

const cloneLineItems = (value: unknown) =>
  structuredClone(value) as ModuleLineItem[]

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
    expect(result.hasImportedCurrentParent).toBe(false)
    expect(result.importedItemCount).toBe(2)
    expect(result.parentNosText).toBe('SO001')
    expect(result.nextItems).toHaveLength(2)
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

  it('allocates remaining quantities correctly', () => {
    const parentWithAllocations = {
      id: '1',
      orderNo: 'SO001',
      items: [
        {
          id: 'p-item-1',
          sourceSalesOrderItemId: 'so-item-1',
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

  it('handles items with sourceParentItemId but zero quantity', () => {
    const record = {
      id: '3',
      orderNo: 'SO003',
      items: [
        {
          id: 'p-item-1',
          sourceSalesOrderItemId: 'so-item-1',
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
          sourceSalesOrderItemId: 'so-item-1',
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
        sourceSalesOrderItemId: 'so-item-1',
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
