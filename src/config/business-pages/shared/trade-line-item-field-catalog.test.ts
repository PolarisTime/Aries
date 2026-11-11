import { describe, expect, it } from 'vitest'
import {
  TRADE_LINE_ITEM_FIELD_CATALOG,
  type TradeLineItemFieldKey,
} from './trade-line-item-field-catalog'

/**
 * 明细列「能不能省略」的契约。
 *
 * <p>背景：用户明确要求**品牌 / 类别 / 材质 / 规格 / 长度 / 单位 / 数量 / 数量单位 /
 * 件重每吨 / 重量 / 单价 / 金额**这些列不允许出现省略号 —— 它们是"一眼比对"的短值，
 * 截断后「盘螺调直」变「盘螺…」、「12345678.90」变「123456…」既读不出也比不了。
 * 放不下就横向滚动（明细表 `scroll.x` 恒等于列宽合计）。</p>
 *
 * <p>宽度下限来自**实测**：12px 字号下「表头文字宽」与「内容示例宽」取大者 + 24px
 * （左右 padding 8+8、边框与列宽拖拽把手的余量）。改字号或改 padding 时这张表要跟着测。</p>
 */
const MUST_NOT_ELLIPSIS: ReadonlyArray<[TradeLineItemFieldKey, number]> = [
  ['brand', 73], // 「盘螺调直」49
  ['category', 49], // 「直条」25
  ['material', 76], // 「HRB400E」52
  ['spec', 58], // 「Φ8-10」34
  ['length', 74], // 「12米定尺」50
  ['unit', 49], // 「吨」13
  ['quantity', 64], // 「123456」40
  ['quantityUnit', 73], // 表头「数量单位」49 —— 原来 64px 时表头自己就被省略了
  ['pieceWeightTon', 65], // 表头「件重/吨」41
  ['weightTon', 74], // 「1234.567」50
  ['unitPrice', 81], // 「123456.78」57
  ['amount', 94], // 「12345678.90」70
]

describe('明细字段目录：省略与列宽', () => {
  it.each(MUST_NOT_ELLIPSIS)(
    '%s 不允许省略，且宽度不小于实测下限',
    (key, minWidth) => {
      const field = TRADE_LINE_ITEM_FIELD_CATALOG[key]
      expect(field.ellipsis).toBe(false)
      expect(field.width).toBeGreaterThanOrEqual(minWidth)
    },
  )

  it('长文本列保持省略（并按 antd 规则把全文写进 title）', () => {
    for (const key of [
      'projectName',
      'customerName',
      'materialName',
      'sourceNo',
      'warehouseName',
      'batchNo',
    ] as const) {
      expect(TRADE_LINE_ITEM_FIELD_CATALOG[key].ellipsis).not.toBe(false)
    }
  })

  it('这 12 列的宽度预算足够（合计 ≥ 900），明细表宁可横向滚动也不压缩它们', () => {
    const total = MUST_NOT_ELLIPSIS.reduce(
      (sum, [key]) => sum + TRADE_LINE_ITEM_FIELD_CATALOG[key].width,
      0,
    )
    /*
     * 12 列合计 954px（见 MUST_NOT_ELLIPSIS 表）。真实明细表还有仓库名称 160、
     * 批号 130、商品名称 156 等列，合计必然超过一屏（1440 屏下明细区约 1100px），
     * 因此 `ModuleItemsTable` 的 `scroll.x = 列宽合计` 会稳定给出横向滚动条，
     * 而不是把列压窄。这条下限防的是"有人为了不滚动把宽度又改小"。
     */
    expect(total).toBeGreaterThanOrEqual(900)
  })

  it('所有不允许省略的列都有可用的像素宽度', () => {
    const bad = Object.values(TRADE_LINE_ITEM_FIELD_CATALOG)
      .filter((field) => field.ellipsis === false)
      .filter((field) => !Number.isFinite(field.width) || field.width < 48)
    expect(bad.map((field) => field.key)).toEqual([])
  })
})
