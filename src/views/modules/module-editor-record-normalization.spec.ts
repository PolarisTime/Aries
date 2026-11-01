// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { buildParentImportState } from '@/module-system/adapter/module-adapter-parent-import'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import {
  normalizeLineItemsForEditor,
  normalizeRecordForEditor,
} from './module-editor-record-normalization'

/**
 * 前端 session 标记（`_parentRelationId` / `_parentRelationNo`）只属于导入流程，
 * 服务端契约不返回。若它们跟着已保存记录回到编辑器，`buildParentImportState` 会把
 * 草稿行判成「已保存行」并把占用加回上限 —— 重复导入同一父单时上限重新翻倍。
 */
const config = {
  key: 'sales-order',
  title: '销售订单',
  formFields: [],
  itemColumns: [],
} as unknown as ModulePageConfig

const sourcedItem: ModuleLineItem = {
  id: '347011099205312900',
  materialCode: 'M-001',
  quantity: 10,
  sourceSalesOrderItemId: '347011099205312901',
  _parentRelationId: '347011099205312512',
  _parentRelationNo: 'SO-20260917-001',
  _maxImportQuantity: 10,
}

describe('normalizeRecordForEditor 清理前端 session 标记', () => {
  it('剔除 items 上的 _parentRelationId/_parentRelationNo', () => {
    const normalized = normalizeRecordForEditor(config, {
      id: '8001',
      items: [sourcedItem],
    })

    const [item] = normalized.items as ModuleLineItem[]
    expect(Object.hasOwn(item, '_parentRelationId')).toBe(false)
    expect(Object.hasOwn(item, '_parentRelationNo')).toBe(false)
    // 其它字段（含其它下划线派生字段）保持原样
    expect(item._maxImportQuantity).toBe(10)
    expect(item.sourceSalesOrderItemId).toBe('347011099205312901')
    expect(item.quantity).toBe(10)
  })

  it('不改写入参记录（query cache 里的对象不能被就地改写）', () => {
    const record = { id: '8001', items: [{ ...sourcedItem }] }
    normalizeRecordForEditor(config, record)

    const [original] = record.items as ModuleLineItem[]
    expect(original._parentRelationId).toBe('347011099205312512')
    expect(original._parentRelationNo).toBe('SO-20260917-001')
  })

  it('items 缺失/非数组时不报错', () => {
    expect(() => normalizeRecordForEditor(config, { id: '8001' })).not.toThrow()
    expect(() =>
      normalizeRecordForEditor(config, { id: '8001', items: null } as never),
    ).not.toThrow()
  })
})

describe('normalizeLineItemsForEditor 清理前端 session 标记', () => {
  it('逐行剔除两个 session 标记，保留其它字段', () => {
    const [item] = normalizeLineItemsForEditor([sourcedItem])

    expect(Object.hasOwn(item, '_parentRelationId')).toBe(false)
    expect(Object.hasOwn(item, '_parentRelationNo')).toBe(false)
    expect(item._maxImportQuantity).toBe(10)
  })
})

describe('导入流程仍然写入 session 标记', () => {
  const parentImportConfig: ModuleParentImportDefinition = {
    parentModuleKey: 'sales-order',
    label: '销售订单',
    parentFieldKey: 'salesOrderNo',
    parentDisplayFieldKey: 'orderNo',
  }
  const parentRecord: ModuleRecord = {
    id: '347011099205312512',
    orderNo: 'SO-20260917-001',
    items: [{ ...sourcedItem, quantity: 10 }],
  }

  it('导入生成的明细行带 _parentRelationId/_parentRelationNo', () => {
    const state = buildParentImportState({
      parentImportConfig,
      parentRecord,
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(state.nextItems).toHaveLength(1)
    expect(state.nextItems[0]._parentRelationId).toBe('347011099205312512')
    expect(state.nextItems[0]._parentRelationNo).toBe('SO-20260917-001')
  })
})
