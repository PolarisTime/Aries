import { describe, expect, it } from 'vitest'
import {
  isEditorItemColumnEditableForModule,
  isModuleLineItemsLocked,
} from '@/module-system/editor/module-editor-access'
import type { ModuleLineItem } from '@/types/module-page'

/**
 * 编辑器行项目列可编辑性两层模型测试：
 * 第一层（字段固有只读）不可被任何状态白名单越过；
 * 第二层（状态锁定白名单）只能收窄第一层判定为可编辑的字段。
 */

const EDITABLE = {
  canEditLineItems: true,
  lineItemsLocked: false,
}

function editable(
  moduleKey: string,
  columnKey: string,
  overrides?: Partial<{
    canEditLineItems: boolean
    lineItemsLocked: boolean
    record: ModuleLineItem
    parentImportedItemEditLocked: boolean
  }>,
) {
  return isEditorItemColumnEditableForModule(
    moduleKey,
    columnKey,
    overrides?.canEditLineItems ?? EDITABLE.canEditLineItems,
    overrides?.lineItemsLocked ?? EDITABLE.lineItemsLocked,
    overrides?.record,
    overrides?.parentImportedItemEditLocked ?? false,
  )
}

describe('第一层：字段固有只读', () => {
  it('派生快照列在常规状态下只读', () => {
    for (const columnKey of [
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'quantityUnit',
      'weightTon',
      'amount',
    ]) {
      expect(editable('sales-order', columnKey)).toBe(false)
    }
  })

  it('销售订单手工行通过材质列选择物料，导入行仍保持快照只读', () => {
    expect(
      editable('sales-order', 'material', { record: { id: 'manual-1' } }),
    ).toBe(true)
    expect(
      editable('sales-order', 'material', {
        record: { id: 'imported-1', sourcePurchaseOrderItemId: '123' },
      }),
    ).toBe(false)
  })

  it('采购入库的理算重量被 behavior 显式只读（随上游导入，不允许编辑）', () => {
    // purchase-inbound 的 readonlyItemColumns 含 weightTon，
    // 显式配置优先于派生豁免——旧判定链中该豁免为不可达死代码，已随重构移除。
    expect(editable('purchase-inbound', 'weightTon')).toBe(false)
  })

  it('采购订单称重类别（盘螺）的件重可编辑，非称重类别只读', () => {
    const record = { id: 'row-1', category: '盘螺' } as ModuleLineItem
    expect(editable('purchase-order', 'pieceWeightTon', { record })).toBe(true)
    expect(
      editable('purchase-order', 'pieceWeightTon', {
        record: { id: 'row-2', category: '直条' },
      }),
    ).toBe(false)
  })

  it('销售出库的实重与过磅重是人工输入列，可编辑', () => {
    expect(editable('sales-outbound', 'actualWeightTon')).toBe(true)
    expect(editable('sales-outbound', 'weighWeightTon')).toBe(true)
  })

  it('实重豁免仅限销售出库，其他模块仍为派生只读', () => {
    expect(editable('sales-order', 'actualWeightTon')).toBe(false)
  })

  it('behavior 显式只读列优先于一切', () => {
    expect(editable('freight-bill', 'sourceNo')).toBe(false)
    expect(editable('freight-bill', 'quantity')).toBe(false)
  })

  it('采购入库导入行的商品编码锁定，未导入行可编辑', () => {
    const importedRow = {
      id: 'row-3',
      sourcePurchaseOrderItemId: '123',
    } as ModuleLineItem
    expect(
      editable('purchase-inbound', 'materialCode', { record: importedRow }),
    ).toBe(false)
    expect(editable('purchase-inbound', 'materialCode')).toBe(true)
  })

  it('采购模块批号只读，销售模块批号可编辑', () => {
    expect(editable('purchase-order', 'batchNo')).toBe(false)
    expect(editable('sales-order', 'batchNo')).toBe(true)
  })
})

describe('第二层：状态锁定只能收窄', () => {
  it('销售订单导入上游后仅单价可编辑，快照列与数量仓库批号全部锁定', () => {
    const locked = { parentImportedItemEditLocked: true }
    expect(editable('sales-order', 'unitPrice', locked)).toBe(true)
    for (const columnKey of [
      'materialCode',
      'warehouseName',
      'batchNo',
      'quantity',
      'brand',
      'spec',
      'weightTon',
      'amount',
    ]) {
      expect(editable('sales-order', columnKey, locked)).toBe(false)
    }
  })

  it('越权回归：父单导入白名单无法放行派生只读列', () => {
    // sales-outbound 白名单含 actualWeightTon（有人工输入豁免，可放行），
    // 但 brand 在派生只读集合中且无豁免，即使加入白名单也不得放行。
    const locked = { parentImportedItemEditLocked: true }
    expect(editable('sales-outbound', 'actualWeightTon', locked)).toBe(true)
    expect(editable('sales-outbound', 'brand', locked)).toBe(false)
    expect(editable('sales-outbound', 'spec', locked)).toBe(false)
  })

  it('无白名单配置的模块导入后保持原有可编辑行为', () => {
    const locked = { parentImportedItemEditLocked: true }
    expect(editable('purchase-order', 'quantity', locked)).toBe(true)
    expect(editable('purchase-order', 'unitPrice', locked)).toBe(true)
  })

  it('销售订单审核锁定时仅单价可编辑', () => {
    const locked = { lineItemsLocked: true }
    expect(editable('sales-order', 'unitPrice', locked)).toBe(true)
    expect(editable('sales-order', 'quantity', locked)).toBe(false)
  })

  it('只读明细模块（客户对账）完全不可编辑', () => {
    expect(editable('customer-statement', 'unitPrice')).toBe(false)
  })

  it('行编辑总开关关闭时一切不可编辑', () => {
    expect(
      editable('purchase-order', 'quantity', { canEditLineItems: false }),
    ).toBe(false)
  })
})

describe('行项目锁定状态判定', () => {
  it('销售订单命中审核锁定状态集合', () => {
    expect(isModuleLineItemsLocked('sales-order', ['已审核'])).toBe(true)
    expect(isModuleLineItemsLocked('sales-order', ['草稿'])).toBe(false)
  })

  it('未配置锁定状态的模块永不锁定', () => {
    expect(isModuleLineItemsLocked('material', ['已审核'])).toBe(false)
  })
})
