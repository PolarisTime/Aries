import { describe, expect, it } from 'vitest'
import type {
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import { buildParentImportState } from './module-adapter-parent-import'

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
