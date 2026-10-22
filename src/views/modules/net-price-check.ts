import { fetchMaterialPriceMatches } from '@/api/market/steel-quotes'
import type { ProjectPriceRule } from '@/api/master/project-price-rules'
import type { ModuleLineItem } from '@/types/module-page'
import {
  buildNetPriceIndex,
  evaluateNetPriceMatch,
  type NetPriceIndex,
  type NetPriceMatchEntry,
  type NetPriceRule,
} from './net-price-fill'

/**
 * 网价核查的**取数与逐行计算**（编辑器整单核查与只读详情面自动核查共用）。
 *
 * <p>同一个核查口径不允许写第二遍: 取哪天的行情、按哪些行算、"应有单价"怎么算,
 * 只能在这里定义。编辑器(`SalesOrderNetPriceFiller`)与只读详情面
 * (`useSalesOrderNetPriceCheck`)的差别只在"从哪儿拿取价日/规则", 计算本身必须一致。</p>
 */

/** 行情数据源(与项目配置一致)。 */
export type NetPriceQuoteSource = 'MYSTEEL' | 'STEELX'

/** 拉取某取价日/时段的网价索引(自动翻页在 API 层)。 */
export async function loadNetPriceIndex(args: {
  quoteDate: string
  period?: string
  source?: NetPriceQuoteSource
  region?: string
  signal?: AbortSignal
}): Promise<NetPriceIndex> {
  const rows = await fetchMaterialPriceMatches(
    args.quoteDate,
    args.period,
    { source: args.source, region: args.region },
    args.signal,
  )
  return buildNetPriceIndex(rows)
}

/** 逐行核查, 返回「行 id → 结果」(订单顺序, 与明细表一致)。 */
export function computeNetPriceEntries(
  items: readonly ModuleLineItem[],
  index: NetPriceIndex,
  rule?: NetPriceRule,
): Record<string, NetPriceMatchEntry> {
  const entries: Record<string, NetPriceMatchEntry> = {}
  for (const item of items) {
    entries[String(item.id)] = evaluateNetPriceMatch(item, index, rule)
  }
  return entries
}

/** 核查用的生效价格规定：按「单据已记录 → 项目上次使用 → 唯一一条」取。 */
export function pickEffectiveRule(
  rules: readonly ProjectPriceRule[],
  preferredIds: readonly (string | undefined)[],
): ProjectPriceRule | undefined {
  for (const id of preferredIds) {
    if (!id) continue
    const hit = rules.find((rule) => rule.id === id)
    if (hit) return hit
  }
  return rules.length === 1 ? rules[0] : undefined
}

/**
 * 单据上已快照的价格规定(交付核定写入 priceRuleId/priceFloatMode/priceFloatValue
 * 三者) → 核查规则。
 *
 * <p>返回 `null` 表示**单据没有规则快照**(例如手工录价、早期单据), 调用方应回退到
 * 项目价格规定; 返回 `{}` 表示"有快照但确实没有浮动", 此时不得再用项目规则兜底 ——
 * 否则历史单据会按今天的项目配置被重新解释, 口径失真。</p>
 */
export function netPriceRuleFromOrderSnapshot(record: {
  [key: string]: unknown
}): NetPriceRule | null {
  const mode = normalizeFloatMode(record.priceFloatMode)
  const amount = toFiniteNumber(record.priceFloatValue)
  if (mode === undefined && amount === undefined) {
    return null
  }
  return {
    ...(mode ? { mode } : {}),
    ...(amount === undefined ? {} : { amount }),
  }
}

function normalizeFloatMode(value: unknown): 'ADD' | 'SUBTRACT' | undefined {
  const text = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return text === 'ADD' || text === 'SUBTRACT' ? text : undefined
}

function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * 参与核查的行内容指纹(行 id + 单价 + 商品身份)。
 *
 * <p>单独导出是因为它是"是否需要重新核查"的判断依据: 单据在别处被改过(单价/材质/规格变化)
 * 后指纹会变, 旧结果不会被当成新结果复用。</p>
 */
export function netPriceItemsKey(items: readonly ModuleLineItem[]): string {
  return items
    .map((item) =>
      [
        String(item.id ?? ''),
        String(item.unitPrice ?? ''),
        String(item.material ?? ''),
        String(item.brand ?? ''),
        String(item.spec ?? ''),
        String(item.length ?? ''),
      ].join(':'),
    )
    .join('|')
}

/**
 * 核查口径指纹: 取价日/时段 + 规则 + 数据源/地区 + 参与核查的行内容。
 *
 * <p>用于"同一张单重复展开时不必重复核查"。</p>
 */
export function buildNetPriceCheckContextKey(args: {
  projectId: string
  quoteDate: string
  period?: string
  rule?: NetPriceRule
  source?: NetPriceQuoteSource
  region?: string
  items: readonly ModuleLineItem[]
}): string {
  const itemsKey = netPriceItemsKey(args.items)
  return [
    args.projectId,
    args.quoteDate,
    args.period ?? '',
    args.rule?.mode ?? '',
    args.rule?.amount ?? '',
    args.source ?? '',
    args.region ?? '',
    itemsKey,
  ].join('#')
}
