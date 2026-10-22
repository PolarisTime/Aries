import { describe, expect, it } from 'vitest'
import type { BrandLowestQuote } from '@/api/market/supplier-price-lists'
import { applyLowestQuotes } from './spot-from-price-list'
import type { PriceRow, PriceSheet } from './types'

/**
 * 「从价格表带价」的取价规则。
 *
 * <p>核心是三条：只填空格子（不覆盖手工价）、按 (品牌, 商品) 精确匹配、连供应商一起带。
 * 这里用能区分新旧行为的数据钉住它们 —— 若哪天改成"覆盖已有价"，第一条会立刻变红。</p>
 */

const row = (id: string, material: string, spec: number): PriceRow => ({
  id,
  rowType: 'PRODUCT',
  category: '直条',
  material,
  spec,
  length: '9米',
})

const sheet = (overrides: Partial<PriceSheet> = {}): PriceSheet => ({
  id: 's1',
  name: '批次 1',
  status: '报价',
  projectId: 'p1',
  projectName: '云潮筝鸣府',
  orderDate: '2026-10-22',
  refDate: '2026-10-22',
  refPeriod: '上午',
  lengthPremium: 0,
  inputs: {},
  rows: [row('a', 'HRB400E', 12)],
  brands: [
    { name: '中天', freight: 0 },
    { name: '中杭', freight: 0 },
  ],
  ...overrides,
})

const quote = (
  brandName: string,
  spec: number,
  price: number,
  overrides: Partial<BrandLowestQuote> = {},
): BrandLowestQuote => ({
  brandName,
  category: '直条',
  material: 'HRB400E',
  spec,
  length: '9米',
  price,
  priceListId: '900',
  supplierId: '77',
  supplierName: '物产中大',
  ...overrides,
})

describe('applyLowestQuotes', () => {
  it('空着的格子按品牌带出最低价, 并连供应商一起带', () => {
    const result = applyLowestQuotes(sheet(), [quote('中天', 12, 3420)])
    expect(result.filled).toBe(1)
    expect(result.inputs['中天:a']).toEqual({
      spot: 3420,
      supplierId: '77',
      supplierName: '物产中大',
    })
  })

  it('已有现货价的格子一律不动(不覆盖手工判定的价)', () => {
    const result = applyLowestQuotes(
      sheet({ inputs: { '中天:a': { spot: 3400 } } }),
      [quote('中天', 12, 3420)],
    )
    expect(result.filled).toBe(0)
    expect(result.inputs['中天:a']?.spot).toBe(3400)
  })

  it('品牌不匹配的报价不会被填到别的品牌列', () => {
    const result = applyLowestQuotes(sheet(), [quote('杭钢', 12, 3420)])
    expect(result.filled).toBe(0)
  })

  it('同一格出现多条报价时取更低者, 与入参顺序无关', () => {
    const result = applyLowestQuotes(sheet(), [
      quote('中天', 12, 3450),
      quote('中天', 12, 3400),
    ])
    expect(result.inputs['中天:a']?.spot).toBe(3400)
  })

  it('规格不匹配时不填(商品键含类别/材质/规格/定尺)', () => {
    const result = applyLowestQuotes(sheet(), [quote('中天', 14, 3420)])
    expect(result.filled).toBe(0)
  })

  it('没有报价时原样返回, 调用方据 filled===0 跳过保存', () => {
    const source = sheet()
    const result = applyLowestQuotes(source, [])
    expect(result.filled).toBe(0)
    expect(result.inputs).toBe(source.inputs)
  })
})
