import { describe, expect, it } from 'vitest'
import { syncDerivedEditorFormValuesForModule } from '@/module-system/editor/module-editor-draft'
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
