import { describe, expect, it } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import { recalculateEditorLineItem } from './module-editor-line-item-calculations'

/**
 * 明细行「派生金额」的唯一实现：单价/数量/重量/过磅重量/结算方式/金额任一变更后，
 * 行金额与重量调整金额都必须由这里重算。
 *
 * <p>数据刻意让「单价 × 重量」与「原金额」不同（单价 3340、重量 32.375、金额 103600），
 * 这样只改单价不重算金额时断言会直接失败；两个口径同值时用例是绿的，锁不住缺陷。</p>
 */
const lineItem = (overrides: Partial<ModuleLineItem> = {}): ModuleLineItem => ({
  id: 'i1',
  quantity: 17,
  pieceWeightTon: 1.904,
  weightTon: 32.375,
  unitPrice: 3200,
  amount: 103600,
  ...overrides,
})

describe('recalculateEditorLineItem 的派生口径', () => {
  it('改单价：金额 = 新单价 × 重量, 重量调整金额同口径重算', () => {
    const item = recalculateEditorLineItem(
      lineItem({ weightAdjustmentTon: 0.007 }),
      'unitPrice',
    )
    expect(item.amount).toBe(103600)
    expect(item.weightAdjustmentAmount).toBe(22.4)
  })

  it('改金额：单价 = 金额 / 重量, 且重量调整金额按新单价重算', () => {
    const item = recalculateEditorLineItem(
      lineItem({ amount: 111046.25, weightAdjustmentTon: 0.007 }),
      'amount',
    )
    expect(item.unitPrice).toBe(3430)
    // 0.007 × 3430 = 24.01（不重算会停在旧单价 3200 的 22.4）
    expect(item.weightAdjustmentAmount).toBe(24.01)
  })

  it('改数量：重量 = 数量 × 件重, 金额随重量重算', () => {
    const item = recalculateEditorLineItem(
      lineItem({ quantity: 10 }),
      'quantity',
    )
    expect(item.weightTon).toBe(19.04)
    expect(item.amount).toBe(60928)
  })

  it('过磅行改过磅重量：重量取过磅值, 金额随重量重算', () => {
    const item = recalculateEditorLineItem(
      lineItem({ settlementMode: '过磅', weighWeightTon: 33.5 }),
      'weighWeightTon',
    )
    expect(item.weightTon).toBe(33.5)
    expect(item.amount).toBe(107200)
  })

  it('过磅行清空重量：金额归零, 重量与调整字段一并清空', () => {
    const item = recalculateEditorLineItem(
      lineItem({
        settlementMode: '过磅',
        weightTon: undefined,
        weighWeightTon: '',
      }),
      'weightTon',
    )
    expect(item.amount).toBe(0)
    expect(item.weightTon).toBeUndefined()
    expect(item.weightAdjustmentTon).toBeUndefined()
    expect(item.weightAdjustmentAmount).toBeUndefined()
  })

  it('重量为 0 时改金额不改写单价（避免除零）, 也不产生调整金额', () => {
    const item = recalculateEditorLineItem(
      lineItem({ weightTon: 0, amount: 500 }),
      'amount',
    )
    expect(item.unitPrice).toBe(3200)
    expect(item.amount).toBe(500)
  })
})
