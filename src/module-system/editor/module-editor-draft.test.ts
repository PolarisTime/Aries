import { describe, expect, it } from 'vitest'
import {
  computeDraftTotals,
  syncDerivedEditorFormValuesForModule,
} from '@/module-system/editor/module-editor-draft'
import type { ModuleLineItem } from '@/types/module-page'

function sumLineItemsBy(items: ModuleLineItem[], key: string) {
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

function goodsItems(amounts: number[]) {
  return amounts.map((amount, index) => ({
    id: String(index + 1),
    amount,
    weightTon: 1,
  })) as ModuleLineItem[]
}

/**
 * 单据总金额口径：totalAmount = 货物小计 + 附加费用小计。
 * 费用行不在 items 内，由工作区通过 chargeTotal 显式传入；
 * 未启用费用通道（chargeTotal 缺省）或未注册金额计算的模块保持原口径。
 */
describe('syncDerivedEditorFormValuesForModule 的单据总金额联动', () => {
  it('purchase-order 叠加附加费用合计并保留两位小数', () => {
    const record: Record<string, unknown> = {}
    syncDerivedEditorFormValuesForModule({
      moduleKey: 'purchase-order',
      record,
      items: goodsItems([100.005, 200.1]),
      sumLineItemsBy,
      chargeTotal: 39.995,
    })
    // 货物 300.105 + 费用 39.995 = 340.1，统一 toFixed(2) 后为 340.1
    expect(record.totalAmount).toBe(340.1)
  })

  it('chargeTotal 缺省时保持货物小计原口径', () => {
    const record: Record<string, unknown> = {}
    syncDerivedEditorFormValuesForModule({
      moduleKey: 'purchase-order',
      record,
      items: goodsItems([100.5, 200.25]),
      sumLineItemsBy,
    })
    expect(record.totalAmount).toBe(300.75)
  })

  it('非法 chargeTotal 按 0 处理', () => {
    const record: Record<string, unknown> = {}
    syncDerivedEditorFormValuesForModule({
      moduleKey: 'purchase-order',
      record,
      items: goodsItems([100.5]),
      sumLineItemsBy,
      chargeTotal: Number.NaN,
    })
    expect(record.totalAmount).toBe(100.5)
  })

  it('费用为 0 时与货物小计一致', () => {
    const record: Record<string, unknown> = {}
    syncDerivedEditorFormValuesForModule({
      moduleKey: 'sales-order',
      record,
      items: goodsItems([88.88]),
      sumLineItemsBy,
      chargeTotal: 0,
    })
    expect(record.totalAmount).toBe(88.88)
  })

  it('freight-bill 未注册金额计算时不写入 totalAmount', () => {
    const record: Record<string, unknown> = {}
    syncDerivedEditorFormValuesForModule({
      moduleKey: 'freight-bill',
      record,
      items: goodsItems([100]),
      sumLineItemsBy,
      chargeTotal: 50,
    })
    // totalAmount 由 computesAmounts 驱动，物流单未注册故不写入；
    // totalWeight/totalFreight 由 freight-bill 专属 normalizeDraftRecord 维护（运费口径不含费用）。
    expect(record.totalAmount).toBeUndefined()
    expect(record.totalWeight).toBe(1)
  })
})

/**
 * `computeDraftTotals` 是「货物 + 附加费用」合计的**唯一计算出口**：
 * 表单联动（写回 record.totalAmount / totalWeight）与销售订单「项目数据」面板
 * （作为 pendingAmount / pendingTonnage 下发）都从它取数。这里锁定两件事：
 * 1. 口径本身（货物 + 费用，不是只有货物）；
 * 2. 与 `syncDerivedEditorFormValuesForModule` 写回表单的值完全一致（同一出口，不会分叉）。
 */
describe('computeDraftTotals 单据合计口径', () => {
  it('货物金额 + 附加费用金额 = totalAmount，吨位按明细求和', () => {
    const totals = computeDraftTotals(
      'sales-order',
      [
        { id: '1', amount: 100, weightTon: 1.5 },
        { id: '2', amount: 200.25, weightTon: 2.25 },
      ] as ModuleLineItem[],
      sumLineItemsBy,
      30.5,
    )

    // 货物 300.25 + 费用 30.5 = 330.75（只有货物会是 300.25，能区分两种口径）
    expect(totals).toEqual({ totalAmount: 330.75, totalWeight: 3.75 })
  })

  it('chargeTotal 缺省 / 非法时按 0 计，口径与只有货物时一致', () => {
    const items = goodsItems([100.5])
    expect(computeDraftTotals('sales-order', items, sumLineItemsBy)).toEqual({
      totalAmount: 100.5,
      totalWeight: 1,
    })
    expect(
      computeDraftTotals('sales-order', items, sumLineItemsBy, Number.NaN),
    ).toEqual({ totalAmount: 100.5, totalWeight: 1 })
  })

  it('未注册金额计算的模块返回 null（调用方保持原值，不写 0）', () => {
    expect(
      computeDraftTotals('freight-bill', goodsItems([100]), sumLineItemsBy, 50),
    ).toBeNull()
  })

  it('与表单联动写回的 totalAmount / totalWeight 完全一致（同一出口）', () => {
    const items = goodsItems([11.11, 22.22])
    const record: Record<string, unknown> = {}
    syncDerivedEditorFormValuesForModule({
      moduleKey: 'sales-order',
      record,
      items,
      sumLineItemsBy,
      chargeTotal: 3.33,
    })

    expect(
      computeDraftTotals('sales-order', items, sumLineItemsBy, 3.33),
    ).toEqual({
      totalAmount: record.totalAmount,
      totalWeight: record.totalWeight,
    })
  })
})
