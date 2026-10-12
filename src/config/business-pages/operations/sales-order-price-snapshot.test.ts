import { describe, expect, it } from 'vitest'
import {
  buildSalesOrderPricingSnapshot,
  SALES_ORDER_PRICING_SNAPSHOT_FIELDS,
} from './sales-order-price-snapshot'

const complete = {
  targetDate: '2026-10-09',
  quoteDate: '2026-10-13',
  period: '中午',
  basis: 'ORDER',
  offsetDays: 2,
  settlePrevOnClosed: true,
}

describe('buildSalesOrderPricingSnapshot', () => {
  it('清单与后端 DTO 字段同名(白名单只此一处)', () => {
    expect(SALES_ORDER_PRICING_SNAPSHOT_FIELDS).toEqual([
      'priceTargetDate',
      'priceQuoteDate',
      'priceQuotePeriod',
      'priceDateBasis',
      'priceDateOffsetDays',
      'priceClosedSettlePrev',
    ])
  })

  it('完整解析结果按后端字段名产出快照', () => {
    expect(buildSalesOrderPricingSnapshot(complete)).toEqual({
      priceTargetDate: '2026-10-09',
      priceQuoteDate: '2026-10-13',
      priceQuotePeriod: '中午',
      priceDateBasis: 'ORDER',
      priceDateOffsetDays: 2,
      priceClosedSettlePrev: true,
    })
  })

  it('四项必填任一缺失即返回 null(不发半个快照)', () => {
    expect(
      buildSalesOrderPricingSnapshot({ ...complete, period: null }),
    ).toBeNull()
    expect(
      buildSalesOrderPricingSnapshot({ ...complete, basis: '' }),
    ).toBeNull()
    expect(
      buildSalesOrderPricingSnapshot({ ...complete, targetDate: null }),
    ).toBeNull()
    expect(
      buildSalesOrderPricingSnapshot({ ...complete, quoteDate: '   ' }),
    ).toBeNull()
  })

  it('偏移交易日数缺失/非法按 0, 且不出现负数', () => {
    const missing = buildSalesOrderPricingSnapshot({
      ...complete,
      offsetDays: undefined,
    })
    const negative = buildSalesOrderPricingSnapshot({
      ...complete,
      offsetDays: -3,
    })

    expect(missing?.priceDateOffsetDays).toBe(0)
    expect(negative?.priceDateOffsetDays).toBe(0)
  })

  it('休市开关只认布尔真值(字符串 false 不得读成 true)', () => {
    const snapshot = buildSalesOrderPricingSnapshot({
      ...complete,
      settlePrevOnClosed: 'false' as unknown as boolean,
    })

    expect(snapshot?.priceClosedSettlePrev).toBe(false)
  })
})
