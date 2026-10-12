/**
 * 销售订单「交付核定取价快照」字段清单。
 *
 * <p>后端 DTO 是「全有或全无」契约：只要携带其中任意一项，就必须同时给出取价基准日、
 * 实际取价日、实际取价时段与取价基准，否则 422 —— 半个快照比没有快照更糟。
 * 因此本清单既用于保存载荷白名单（{@code module-page-schema.ts} 的 sales-order.saveFields.scalar），
 * 也用于卡片侧快照写入前的完整性判定，避免两处各写一份字段名。</p>
 */
export const SALES_ORDER_PRICING_SNAPSHOT_FIELDS = [
  'priceTargetDate',
  'priceQuoteDate',
  'priceQuotePeriod',
  'priceDateBasis',
  'priceDateOffsetDays',
  'priceClosedSettlePrev',
] as const

export type SalesOrderPricingSnapshotField =
  (typeof SALES_ORDER_PRICING_SNAPSHOT_FIELDS)[number]

/** 交付核定取价快照（与后端 SalesOrderRequest 的取价字段一一对应）。 */
export interface SalesOrderPricingSnapshot {
  priceTargetDate: string
  priceQuoteDate: string
  priceQuotePeriod: string
  priceDateBasis: string
  priceDateOffsetDays: number
  priceClosedSettlePrev: boolean
}

/** 快照来源：取价基准解析结果中与快照相关的字段（宽松读取，缺项即视为不完整）。 */
export interface SalesOrderPricingSnapshotSource {
  targetDate?: string | null
  quoteDate?: string | null
  period?: string | null
  basis?: string | null
  offsetDays?: number | null
  settlePrevOnClosed?: boolean | null
}

function textOrNull(value: string | null | undefined): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

/**
 * 由取价基准解析结果构造快照。
 *
 * <p>后端要求基准日、实际取价日、实际取价时段与取价基准同时提供，因此这四项任一缺失时
 * 返回 null：调用方宁可不带快照，也不能下发半个快照（会被 422 拒掉整张单据）。</p>
 */
export function buildSalesOrderPricingSnapshot(
  source: SalesOrderPricingSnapshotSource,
): SalesOrderPricingSnapshot | null {
  const targetDate = textOrNull(source.targetDate)
  const quoteDate = textOrNull(source.quoteDate)
  const quotePeriod = textOrNull(source.period)
  const basis = textOrNull(source.basis)
  if (!targetDate || !quoteDate || !quotePeriod || !basis) {
    return null
  }
  return {
    priceTargetDate: targetDate,
    priceQuoteDate: quoteDate,
    priceQuotePeriod: quotePeriod,
    priceDateBasis: basis,
    priceDateOffsetDays:
      typeof source.offsetDays === 'number' &&
      Number.isFinite(source.offsetDays)
        ? Math.max(0, Math.trunc(source.offsetDays))
        : 0,
    priceClosedSettlePrev: source.settlePrevOnClosed === true,
  }
}
