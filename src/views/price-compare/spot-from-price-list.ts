import type { BrandLowestQuote } from '@/api/market/supplier-price-lists'
import { substituteMaterialOf } from '@/utils/material-grade'
import { isSubstitutableMaterial, productKeyOf } from './core'
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
export type ApplyLowestQuotesOptions = {
  /**
   * 抗震牌号代取开关（单据头 `allowHrb400eFallback`）。
   *
   * <p>`false`（默认）时只做精确材质匹配；为 `true` 时精确取不到才退化到替代牌号。
   * 默认关闭是刻意的：代取会把"按 HRB400E 的价"写进 HRB400 行，属需要单据头授权的口径。</p>
   */
  allowHrb400eFallback?: boolean
}

export function applyLowestQuotes(
  sheet: PriceSheet,
  quotes: readonly BrandLowestQuote[],
  options: ApplyLowestQuotesOptions = {},
): { inputs: SheetInputs; filled: number; substituted: number } {
  if (!quotes.length) {
    return { inputs: sheet.inputs, filled: 0, substituted: 0 }
  }

  const allowFallback = options.allowHrb400eFallback ?? false

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
  let substituted = 0
  for (const row of sheet.rows) {
    const productKey = productKeyOf(row)
    if (!productKey) continue

    // 二级匹配候选：精确材质之上的替代牌号。规则唯一来源是 substituteMaterialOf，
    // 不在这里另写"加 E"的判断 —— 否则与「网价核查」的口径会分叉。
    const fallbackKeys: { key: string; material: string }[] = []
    // 白名单唯一判据：`SUBSTITUTABLE_MATERIALS`（初值仅 HRB400，与改动前行为一致）
    if (allowFallback && isSubstitutableMaterial(row.material)) {
      const substitute = substituteMaterialOf(row.material)
      if (substitute) {
        const fallbackKey = productKeyOf({ ...row, material: substitute })
        if (fallbackKey)
          fallbackKeys.push({ key: fallbackKey, material: substitute })
      }
    }

    for (const brand of sheet.brands ?? []) {
      const cellKey = `${brand.name}:${row.id}`
      const current = inputs[cellKey]
      // 只填空格子：已有 spot 的格子一律不动
      if (current?.spot !== undefined) continue

      // 一级：精确材质。二级：仅在开关打开且精确未命中时才代取。
      let quote = byKey.get(`${brand.name}\u0000${productKey}`)
      let sourceMaterial: string | undefined
      if (!quote) {
        for (const fallback of fallbackKeys) {
          const hit = byKey.get(`${brand.name}\u0000${fallback.key}`)
          if (hit) {
            quote = hit
            sourceMaterial = fallback.material
            break
          }
        }
      }
      if (!quote) continue

      const next: SheetInput = {
        ...(current ?? {}),
        spot: quote.price,
        ...(quote.supplierId ? { supplierId: quote.supplierId } : {}),
        ...(quote.supplierName ? { supplierName: quote.supplierName } : {}),
        // 代取来的格子必须留下来源，重新打开单据后角标才有依据
        ...(sourceMaterial ? { spotSourceMaterial: sourceMaterial } : {}),
      }
      if (inputs === sheet.inputs) {
        inputs = { ...sheet.inputs }
      }
      inputs[cellKey] = next
      filled += 1
      if (sourceMaterial) substituted += 1
    }
  }
  return { inputs, filled, substituted }
}
