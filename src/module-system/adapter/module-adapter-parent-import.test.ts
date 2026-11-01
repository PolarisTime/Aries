import { describe, expect, it } from 'vitest'
import type {
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import {
  buildParentImportState,
  hasSourceParentItemId,
} from './module-adapter-parent-import'

const parentImportConfig: ModuleParentImportDefinition = {
  parentModuleKey: 'sales-order',
  label: '销售订单',
  parentFieldKey: 'salesOrderId',
  parentDisplayFieldKey: 'orderNo',
}

const parentItem: ModuleLineItem = {
  id: '347011099205312900',
  materialId: '347011099205312512',
  materialCode: 'M-001',
  brand: '泸钢',
  category: '盘螺',
  material: 'HRB400E',
  spec: '8',
  length: '9米',
  unit: '吨',
  quantityUnit: '支',
  quantity: 10,
  pieceWeightTon: 0.002,
  weightTon: 0.02,
  unitPrice: 4000,
  amount: 80,
}

const parentRecord: ModuleRecord = {
  id: '347011099205312512',
  orderNo: 'SO-20260917-001',
  items: [parentItem],
}

describe('buildParentImportState 数量单位', () => {
  it('父单据导入带出商品数量单位，不被 unit「吨」覆盖', () => {
    const state = buildParentImportState({
      parentImportConfig,
      parentRecord,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(state.nextItems).toHaveLength(1)
    expect(state.nextItems[0].quantityUnit).toBe('支')
  })

  it('父单据导入的 quantityUnit=件 不被 unit「吨」覆盖', () => {
    const state = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        ...parentRecord,
        items: [{ ...parentItem, unit: '吨', quantityUnit: '件' }],
      },
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(state.nextItems).toHaveLength(1)
    expect(state.nextItems[0].quantityUnit).toBe('件')
  })

  it('已选商品但数量单位为「件」的草稿行不被误判为空行', () => {
    const draft: ModuleLineItem = {
      id: 'item-material',
      materialId: '347011099205312512',
      unit: '吨',
      quantityUnit: '件',
      quantity: 0,
    }

    const state = buildParentImportState({
      parentImportConfig,
      parentRecord,
      currentParentNos: [],
      currentItems: [draft],
      cloneLineItems,
    })

    expect(state.nextItems.some((item) => item.id === 'item-material')).toBe(
      true,
    )
  })

  it('未选商品的默认空行仍被过滤', () => {
    const draft: ModuleLineItem = {
      id: 'item-blank',
      unit: '吨',
      quantityUnit: '件',
      quantity: 0,
    }

    const state = buildParentImportState({
      parentImportConfig,
      parentRecord,
      currentParentNos: [],
      currentItems: [draft],
      cloneLineItems,
    })

    expect(state.nextItems.some((item) => item.id === 'item-blank')).toBe(false)
  })
})

describe('buildParentImportState 多来源合并表头', () => {
  const mappedConfig: ModuleParentImportDefinition = {
    ...parentImportConfig,
    mapParentToDraft: (record) => ({
      salesOrderNo: record.orderNo || '',
      customerName: record.customerName || '',
    }),
  }

  it('首个来源回填表头并写入来源单号', () => {
    const state = buildParentImportState({
      parentImportConfig: mappedConfig,
      parentRecord: { ...parentRecord, customerName: '客户甲' },
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(state.shouldApplyMappedValues).toBe(true)
    expect(state.parentNosText).toBe('SO-20260917-001')
    expect(state.mappedValues.customerName).toBe('客户甲')
  })

  it('追加来源时拼接单号且不再用新单覆盖表头', () => {
    const state = buildParentImportState({
      parentImportConfig: mappedConfig,
      parentRecord: {
        ...parentRecord,
        id: '347011099205312513',
        orderNo: 'SO-20260917-002',
        customerName: '客户乙',
      },
      currentParentNos: ['SO-20260917-001'],
      currentItems: [],
      cloneLineItems,
    })

    expect(state.shouldApplyMappedValues).toBe(false)
    expect(state.parentNosText).toBe('SO-20260917-001, SO-20260917-002')
    expect(state.mappedValues.customerName).toBe('客户乙')
  })

  it('重复导入同一来源不重复累计单号', () => {
    const state = buildParentImportState({
      parentImportConfig: mappedConfig,
      parentRecord,
      currentParentNos: ['SO-20260917-001'],
      currentItems: [],
      cloneLineItems,
    })

    expect(state.hasImportedCurrentParent).toBe(true)
    expect(state.parentNosText).toBe('SO-20260917-001')
    expect(state.shouldApplyMappedValues).toBe(true)
  })
})

describe('buildParentImportState 上限口径（_maxImportQuantity）', () => {
  /** 上游明细行：带来源行 id，服务端剩余 10。 */
  const sourcedParentItem: ModuleLineItem = {
    ...parentItem,
    sourceSalesOrderItemId: '347011099205312900',
    remainingQuantity: 10,
  }
  const sourcedParentRecord: ModuleRecord = {
    ...parentRecord,
    items: [sourcedParentItem],
  }

  const importOnce = (currentItems: ModuleLineItem[] = []) =>
    buildParentImportState({
      parentImportConfig,
      parentRecord: sourcedParentRecord,
      currentParentNos: ['SO-20260917-001'],
      currentItems,
      cloneLineItems,
    })

  it('首次导入：上限 = 服务端剩余（草稿里没有该来源的占用）', () => {
    const state = importOnce()

    expect(state.nextItems).toHaveLength(1)
    expect(state.nextItems[0]._maxImportQuantity).toBe(10)
    expect(state.nextItems[0].quantity).toBe(10)
  })

  it('未保存状态下重复导入同一父单：上限不翻倍（草稿占用不计入）', () => {
    const first = importOnce()
    const second = importOnce(first.nextItems)

    // 当前父单的旧行会被整组替换，其占用不能加回到服务端 remaining 上：
    // 否则 remaining(10，服务端不知道草稿) + 草稿已分配(10) = 20。
    expect(second.nextItems).toHaveLength(1)
    expect(second.nextItems[0]._maxImportQuantity).toBe(10)
  })

  it('多父单场景：仍累加其他父单对同一来源行的占用', () => {
    const otherParentRow: ModuleLineItem = {
      ...sourcedParentItem,
      id: 'draft-other-parent-line',
      quantity: 4,
      _parentRelationId: '347011099205312599',
      _parentRelationNo: 'SO-OTHER-001',
    }

    const state = importOnce([otherParentRow])
    const importedRow = state.nextItems.find(
      (item) => item._parentRelationNo === sourcedParentRecord.orderNo,
    )

    expect(state.nextItems).toHaveLength(2)
    expect(importedRow?._maxImportQuantity).toBe(14)
  })

  it('已保存行（无 session 关系 id）的占用仍加回上限', () => {
    // 从服务端加载的已保存行：靠 sourceNo 归属父单，服务端 remaining 已扣掉它。
    const persistedRow: ModuleLineItem = {
      ...sourcedParentItem,
      id: 'persisted-line-1',
      quantity: 6,
      _parentRelationNo: String(sourcedParentRecord.orderNo),
    }

    const state = importOnce([persistedRow])
    const importedRow = state.nextItems.find((item) =>
      Boolean(item._parentRelationId),
    )

    // remaining(10) + 已保存占用(6) = 16（服务端 remaining 未含本单这 6）
    expect(importedRow?._maxImportQuantity).toBe(16)
  })
})

describe('hasSourceParentItemId', () => {
  // 通用口径：任一 source*ItemId 都算导入行（编辑器据此禁用「复制本行」）
  const sourceFields = [
    'sourceFreightBillItemId',
    'sourceInboundItemId',
    'sourcePurchaseOrderItemId',
    'sourceSalesOrderItemId',
  ]

  it.each(sourceFields)('识别带 %s 的导入行', (field) => {
    expect(
      hasSourceParentItemId({
        id: 'line-1',
        [field]: '347011099205312900',
      } as ModuleLineItem),
    ).toBe(true)
  })

  it('手工新增行（无来源 id）不算导入行', () => {
    expect(hasSourceParentItemId({ id: 'line-1', quantity: 1 })).toBe(false)
  })

  it('来源 id 为空白/非法值时不算导入行', () => {
    expect(
      hasSourceParentItemId({
        id: 'line-1',
        sourcePurchaseOrderItemId: '  ',
      } as ModuleLineItem),
    ).toBe(false)
  })
})
