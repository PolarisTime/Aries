import type { BrandLowestQuote } from '@/api/market/supplier-price-lists'
import { productKeyOf } from './core'
import type { PriceSheet, SheetInput, SheetInputs } from './types'

/**
 * 把「品牌价格表的最低价」带进当前批次 —— **纯函数，只算不写**。
 *
 * <p>三条硬性规则：</p>
 * <ol>
 *   <li><b>只填空格子</b>：已有现货价一律不动。带价是"补空缺"，不是"按价格表重算"——
 *       后者会覆盖业务员手工判定的价，且没有确认步骤。</li>
 *   <li><b>按 (品牌, 商品) 精确匹配</b>：商品键沿用 {@link productKeyOf}（类别|材质|规格|定尺），
 *       与报单比价里"同商品联动"同一口径，不另造匹配规则。</li>
 *   <li><b>连供应商一起带</b>：价格表里一格的价格本来就属于某家供应商，只带价不带供应商会让
 *       现货价脱离来源。</li>
 * </ol>
 *
 * @returns 新的 inputs（未命中时返回原对象，调用方可据 `filled === 0` 跳过 patch）
 */
export function applyLowestQuotes(
  sheet: PriceSheet,
  quotes: readonly BrandLowestQuote[],
): { inputs: SheetInputs; filled: number } {
  if (!quotes.length) return { inputs: sheet.inputs, filled: 0 }

  // 品牌 + 商品键 → 最低价报价；同一键出现多条时取价格更低者，结果与入参顺序无关
  const byKey = new Map<string, BrandLowestQuote>()
  for (const quote of quotes) {
    const key = `${quote.brandName}\u0000${productKeyOf(quote)}`
    const existing = byKey.get(key)
    if (!existing || quote.price < existing.price) {
      byKey.set(key, quote)
    }
  }

  let inputs = sheet.inputs
  let filled = 0
  for (const row of sheet.rows) {
    const productKey = productKeyOf(row)
    if (!productKey) continue
    for (const brand of sheet.brands ?? []) {
      const quote = byKey.get(`${brand.name}\u0000${productKey}`)
      if (!quote) continue
      const cellKey = `${brand.name}:${row.id}`
      const current = inputs[cellKey]
      // 只填空格子：已有 spot 的格子一律不动
      if (current?.spot !== undefined) continue
      const next: SheetInput = {
        ...(current ?? {}),
        spot: quote.price,
        ...(quote.supplierId ? { supplierId: quote.supplierId } : {}),
        ...(quote.supplierName ? { supplierName: quote.supplierName } : {}),
      }
      if (inputs === sheet.inputs) {
        inputs = { ...sheet.inputs }
      }
      inputs[cellKey] = next
      filled += 1
    }
  }
  return { inputs, filled }
}
