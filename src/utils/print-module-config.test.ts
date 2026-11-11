import { describe, expect, it } from 'vitest'
import type { PrintItemFieldKey } from './print-module-config'
import {
  getPrintItemColumnAlign,
  getPrintItemColumnEllipsis,
  getPrintItemColumnWidth,
  getPrintItemFields,
} from './print-module-config'

function fieldKeys(moduleKey: string) {
  return getPrintItemFields(moduleKey).map((field) => field.key)
}

describe('print statement item layouts', () => {
  it('matches the customer statement detail columns', () => {
    expect(fieldKeys('customer-statement')).toEqual([
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
    ])
  })

  it('matches the freight statement detail columns (单号已上提到分组行)', () => {
    expect(fieldKeys('freight-statement')).toEqual([
      'brand',
      'spec',
      'material',
      'category',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
    ])
  })
})

describe('打印字段与页面列边界', () => {
  it('销售订单打印字段保持独立契约，含单价/金额且不随页面列隐藏变化', () => {
    // 页面列只控制表格投影；打印字段白名单由 print-module-config 独立维护，
    // 页面隐藏 materialCode/batchNo 不影响打印取数字段。
    expect(fieldKeys('sales-order')).toEqual([
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
    ])
  })

  it('所有打印字段都有固定宽度与对齐配置（可追踪映射）', () => {
    const allFields = [
      ...getPrintItemFields('sales-order'),
      ...getPrintItemFields('customer-statement'),
      ...getPrintItemFields('freight-statement'),
    ]
    const seen = new Set<string>()
    for (const field of allFields) {
      seen.add(field.key)
      expect(typeof getPrintItemColumnWidth(field)).toBe('number')
      expect(typeof getPrintItemColumnEllipsis(field)).toBe('boolean')
      expect(['left', 'center', 'right']).toContain(
        getPrintItemColumnAlign(field),
      )
    }
    // 单号列已从物流对账单打印明细移除（上提到分组行），并集从 12 降到 11
    expect(seen.size).toBe(11)
  })
})

/** 构造字段声明（只用到 key）；断言宽度/省略时不需要文案。 */
function fieldSpec(key: PrintItemFieldKey) {
  return { key, labelKey: `modules.print.${key}` }
}

/**
 * 列宽下限的推导（与 `PRINT_ITEM_COLUMN_WIDTHS` 的注释同源）：
 * 12px 字体下典型内容宽 + 单元格左右 padding 24px。
 * 列宽被改小时这里先红，避免「表头换行 / 金额被截断」悄悄回归。
 */
const CELL_HORIZONTAL_PADDING = 24
const TYPICAL_CONTENT_WIDTH: Record<string, number> = {
  brand: 49, // 「盘螺调直」
  material: 52, // 「HRB400E」
  quantityUnit: 49, // 表头「数量单位」
  amount: 70, // 「12345678.90」
}

describe('打印明细列的省略口径（与列表主表同一判定）', () => {
  const SHORT_VALUE_FIELDS: PrintItemFieldKey[] = [
    'brand',
    'category',
    'material',
    'spec',
    'length',
    'quantity',
    'quantityUnit',
    'pieceWeightTon',
    'weightTon',
    'unitPrice',
    'amount',
  ]

  it.each(SHORT_VALUE_FIELDS)('%s 列不省略，放不下改为横向滚动', (key) => {
    expect(getPrintItemColumnEllipsis(fieldSpec(key))).toBe(false)
  })

  it('单号是长文本列，保持省略（全文由 title 兜底）', () => {
    expect(getPrintItemColumnEllipsis(fieldSpec('sourceNo'))).toBe(true)
  })

  it('三种布局下的每个展示列都有明确的省略结论，不落到 antd 默认值', () => {
    for (const moduleKey of [
      'sales-order',
      'customer-statement',
      'freight-statement',
    ]) {
      for (const field of getPrintItemFields(moduleKey)) {
        expect(typeof getPrintItemColumnEllipsis(field)).toBe('boolean')
      }
    }
  })
})

describe('打印明细关键列宽达到下限', () => {
  it.each(Object.entries(TYPICAL_CONTENT_WIDTH))(
    '%s 列宽 ≥ 典型内容宽 + padding',
    (key, contentWidth) => {
      expect(
        getPrintItemColumnWidth(fieldSpec(key as PrintItemFieldKey)),
      ).toBeGreaterThanOrEqual(contentWidth + CELL_HORIZONTAL_PADDING)
    },
  )

  it('合并序号模式下品牌列额外容纳 Tag，不会把品牌挤成省略号', () => {
    const brand = fieldSpec('brand')
    expect(
      getPrintItemColumnWidth(brand, { mergeMarker: true }),
    ).toBeGreaterThan(getPrintItemColumnWidth(brand))
    expect(
      getPrintItemColumnWidth(brand, { mergeMarker: true }),
    ).toBeGreaterThanOrEqual(
      TYPICAL_CONTENT_WIDTH.brand + CELL_HORIZONTAL_PADDING + 24,
    )
  })

  it('合并模式只加宽品牌列，其它列宽不变', () => {
    const amount = fieldSpec('amount')
    expect(getPrintItemColumnWidth(amount, { mergeMarker: true })).toBe(
      getPrintItemColumnWidth(amount),
    )
  })
})
