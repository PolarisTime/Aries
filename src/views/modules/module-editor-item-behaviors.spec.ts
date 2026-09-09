import { describe, expect, it } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import { getModuleEditorItemBehavior } from './module-editor-item-behaviors'

function lineItem(overrides: Partial<ModuleLineItem>): ModuleLineItem {
  return { id: '1', ...overrides }
}

describe('module-editor-item-behaviors', () => {
  it('采购订单/销售订单/物流单启用附加费用 Tab，采购订单启用仓库推荐', () => {
    expect(getModuleEditorItemBehavior('purchase-order')).toMatchObject({
      supportsExpenseTab: true,
      enablesWarehouseRecommendations: true,
    })
    expect(getModuleEditorItemBehavior('sales-order')?.supportsExpenseTab).toBe(
      true,
    )
    expect(
      getModuleEditorItemBehavior('freight-bill')?.supportsExpenseTab,
    ).toBe(true)
    expect(
      getModuleEditorItemBehavior('customer-statement')?.supportsExpenseTab,
    ).toBeUndefined()
  })

  it('自动排序按模块分派：销售订单按商品资料、客户对账单按交货日期', () => {
    const items = [
      lineItem({ id: '1', material: 'B' }),
      lineItem({ id: '2', material: 'A' }),
    ]
    const salesSort = getModuleEditorItemBehavior('sales-order')?.itemSort
    expect(salesSort).toBeDefined()
    expect(
      salesSort?.sort(items, 'sourceNo', 'asc').map((item) => item.id),
    ).toEqual(['2', '1'])
    expect(
      getModuleEditorItemBehavior('sales-order')?.itemSort?.directionToggleMode,
    ).toBeUndefined()
  })

  it('物流对账单自动排序在记账时间模式下切换方向', () => {
    const behavior = getModuleEditorItemBehavior('freight-statement')
    expect(behavior?.itemSort?.directionToggleMode).toBe('billTime')
  })

  it('物流单/物流对账单禁用行拖拽并按来源单分组删除', () => {
    expect(
      getModuleEditorItemBehavior('freight-bill')?.disablesItemReorder,
    ).toBe(true)
    expect(
      getModuleEditorItemBehavior('freight-statement')?.disablesItemReorder,
    ).toBe(true)

    const billGroupKey =
      getModuleEditorItemBehavior('freight-bill')?.itemRemovalSourceGroupKey
    expect(
      billGroupKey?.(
        lineItem({ id: '1', _parentRelationId: 'P1', sourceNo: 'S1' }),
      ),
    ).toBe('P1')
    expect(billGroupKey?.(lineItem({ id: '2', sourceNo: 'S2' }))).toBe('S2')

    const statementGroupKey =
      getModuleEditorItemBehavior(
        'freight-statement',
      )?.itemRemovalSourceGroupKey
    expect(
      statementGroupKey?.(
        lineItem({ id: '3', sourceFreightBillId: '9223372036854775807' }),
      ),
    ).toBe('9223372036854775807')
    expect(
      statementGroupKey?.(lineItem({ id: '4', sourceFreightBillId: null })),
    ).toBe('')
  })

  it('未注册分组删除的模块回退为直接删除', () => {
    expect(
      getModuleEditorItemBehavior('sales-order')?.itemRemovalSourceGroupKey,
    ).toBeUndefined()
  })

  it('未知模块 key 回退为 undefined，全部走默认行为', () => {
    expect(getModuleEditorItemBehavior('unknown-module')).toBeUndefined()
    expect(
      getModuleEditorItemBehavior('unknown-module')?.itemSort,
    ).toBeUndefined()
    expect(
      getModuleEditorItemBehavior('unknown-module')?.disablesItemReorder,
    ).toBeUndefined()
    expect(
      getModuleEditorItemBehavior('unknown-module')?.supportsExpenseTab,
    ).toBeUndefined()
    expect(
      getModuleEditorItemBehavior('unknown-module')
        ?.enablesWarehouseRecommendations,
    ).toBeUndefined()
  })
})
