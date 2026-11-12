import type { BrandLowestQuote } from '@/api/market/supplier-price-lists'
import { substituteMaterialOf } from '@/utils/material-grade'
import { isSubstitutableMaterial, productKeyOf } from './core'
import type { PriceSheet, SheetInput, SheetInputs } from './types'

/**
 * 把「品牌价格表的最低价」**覆盖式**导入当前批次 —— 纯函数，只算不写。
 *
 * <p>报单比价页**默认禁止手动改价，无例外**：现货价与供应商的唯一来源就是供应商价格表。
 * 因此这里与旧的"只填空格子"语义相反，三条硬性规则：</p>
 * <ol>
 *   <li><b>覆盖式</b>：命中报价的格子一律按价格表重算（价 + 供应商一起刷新），
 *       锁定的行也照常刷新 —— 行锁只冻结规格/吨位，不冻结价格来源；</li>
 *   <li><b>未匹配即清空</b>：价格表里没有该格报价时，整条输入删掉（价、供应商、
 *       代取来源一起清），否则会留下"价格表里已经不存在的价"；</li>
 *   <li><b>按 (品牌, 商品) 精确匹配</b>：商品键沿用 {@link productKeyOf}（类别|材质|规格|定尺），
 *       与报单比价里"同商品联动"同一口径，不另造匹配规则。类别别名（直条 → 螺纹钢）
 *       已由 productKeyOf 归一。</li>
 * </ol>
 *
 * <p>抗震牌号代取是**唯一**允许偏离精确匹配的分支：仅在单据头放行
 * （`allowHrb400eFallback`）且材质在白名单内时才用替代牌号再查一次，命中后把实际取的
 * 材质写进 `spotSourceMaterial`（E 角标的唯一依据）；精确命中必须删掉旧的
 * `spotSourceMaterial`，否则重新打开单据后旧角标会继续撒谎。</p>
 */
export type ImportLowestQuotesOptions = {
  /**
   * 抗震牌号代取开关（单据头 `allowHrb400eFallback`）。
   *
   * <p>`false`（默认）时只做精确材质匹配；为 `true` 时精确取不到才退化到替代牌号。
   * 默认关闭是刻意的：代取会把"按 HRB400E 的价"写进 HRB400 行，属需要单据头授权的口径。</p>
   */
  allowHrb400eFallback?: boolean
}

/** 一次导入的影响面，供确认弹窗展示、成功后汇总（也是幂等性断言的依据）。 */
export type ImportLowestQuotesStats = {
  /** 之前没有价、这次有价。 */
  added: number
  /** 之前有价、这次价不同（含涨跌两个方向）。 */
  updated: number
  /** 之前有价、这次价格表里没有对应报价（整格被清空）。 */
  cleared: number
  /** 之前有价且价相同（供应商可能被刷新，但价格不变）。 */
  unchanged: number
  /** updated 中涨价的处数。 */
  priceUp: number
  /** updated 中降价的处数。 */
  priceDown: number
  /** 本次按替代牌号代取命中的处数。 */
  substituted: number
}

/**
 * 纯函数：算覆盖式导入结果。
 *
 * <p>返回**新的** inputs（不修改入参）；调用方拿 `stats` 先做确认弹窗，
 * 用户确认后再把 `inputs` 落库。没有任何变化时 stats 除 `unchanged` 外全为 0，
 * 因此连续两次导入的第二次 added/updated/cleared 必为 0（幂等）。</p>
 */
export function importLowestQuotes(
  sheet: PriceSheet,
  quotes: readonly BrandLowestQuote[],
  options: ImportLowestQuotesOptions = {},
): { inputs: SheetInputs; stats: ImportLowestQuotesStats } {
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

  const inputs: SheetInputs = { ...sheet.inputs }
  const stats: ImportLowestQuotesStats = {
    added: 0,
    updated: 0,
    cleared: 0,
    unchanged: 0,
    priceUp: 0,
    priceDown: 0,
    substituted: 0,
  }

  for (const row of sheet.rows) {
    const productKey = productKeyOf(row)
    if (!productKey) continue

    // 二级匹配候选：精确材质之上的替代牌号。规则唯一来源是 substituteMaterialOf，
    // 不在这里另写"加 E"的判断 —— 否则与「网价核查」的口径会分叉。
    let fallback: { key: string; material: string } | undefined
    // 白名单唯一判据：`SUBSTITUTABLE_MATERIALS`（初值仅 HRB400）。
    if (allowFallback && isSubstitutableMaterial(row.material)) {
      const substitute = substituteMaterialOf(row.material)
      if (substitute) {
        const fallbackKey = productKeyOf({ ...row, material: substitute })
        if (fallbackKey) fallback = { key: fallbackKey, material: substitute }
      }
    }

    for (const brand of sheet.brands ?? []) {
      const cellKey = `${brand.name}:${row.id}`
      const prev = inputs[cellKey]

      // 一级：精确材质。二级：仅在开关打开且精确未命中时才代取。
      let quote = byKey.get(`${brand.name}\u0000${productKey}`)
      let sourceMaterial: string | undefined
      if (!quote && fallback) {
        const hit = byKey.get(`${brand.name}\u0000${fallback.key}`)
        if (hit) {
          quote = hit
          sourceMaterial = fallback.material
        }
      }

      // 未匹配：整格清空（价 + 供应商 + 代取来源），不留"价格表里已不存在"的残值。
      if (!quote) {
        if (prev === undefined) continue
        if (prev.spot !== undefined) stats.cleared += 1
        delete inputs[cellKey]
        continue
      }

      const previousSpot = prev?.spot
      if (previousSpot === undefined) {
        stats.added += 1
      } else if (previousSpot !== quote.price) {
        stats.updated += 1
        if (quote.price > previousSpot) stats.priceUp += 1
        else stats.priceDown += 1
      } else {
        stats.unchanged += 1
      }

      const next: SheetInput = { ...(prev ?? {}) }
      // 精确命中必须删掉旧的代取来源，否则旧 E 角标会残留；代取命中则重新写。
      delete next.spotSourceMaterial
      next.spot = quote.price
      if (quote.supplierId) next.supplierId = quote.supplierId
      else delete next.supplierId
      if (quote.supplierName) next.supplierName = quote.supplierName
      else delete next.supplierName
      if (sourceMaterial) {
        next.spotSourceMaterial = sourceMaterial
        stats.substituted += 1
      }
      inputs[cellKey] = next
    }
  }

  return { inputs, stats }
}
