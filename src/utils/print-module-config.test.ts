import { describe, expect, it } from 'vitest'
import {
  getPrintItemColumnAlign,
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

  it('matches the freight statement detail columns', () => {
    expect(fieldKeys('freight-statement')).toEqual([
      'sourceNo',
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
      expect(['left', 'center', 'right']).toContain(
        getPrintItemColumnAlign(field),
      )
    }
    expect(seen.size).toBeGreaterThanOrEqual(12)
  })
})
