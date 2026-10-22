import { describe, expect, it } from 'vitest'
import {
  buildSalesOrderPricingSnapshot,
  SALES_ORDER_PRICING_SNAPSHOT_FIELDS,
} from './sales-order-price-snapshot'

/**
 * 夹具刻意用「延后 3 个交易日」，而不是默认档「往前 1 个」：
 * 方向与天数同默认值时，把两个字段写反或漏读其中一个都仍然断言为绿。
 */
const complete = {
  targetDate: '2026-10-09',
  quoteDate: '2026-10-13',
  period: '中午',
  basis: 'ORDER',
  offsetDays: 2,
  priceClosedSettleDirection: 'NEXT',
  priceClosedSettleDays: 3,
}

describe('buildSalesOrderPricingSnapshot', () => {
  it('清单与后端 DTO 字段同名(白名单只此一处)', () => {
    expect(SALES_ORDER_PRICING_SNAPSHOT_FIELDS).toEqual([
      'priceTargetDate',
      'priceQuoteDate',
      'priceQuotePeriod',
      'priceDateBasis',
      'priceDateOffsetDays',
      'priceClosedSettleDirection',
      'priceClosedSettleDays',
    ])
  })

  it('完整解析结果按后端字段名产出快照', () => {
    expect(buildSalesOrderPricingSnapshot(complete)).toEqual({
      priceTargetDate: '2026-10-09',
      priceQuoteDate: '2026-10-13',
      priceQuotePeriod: '中午',
      priceDateBasis: 'ORDER',
      priceDateOffsetDays: 2,
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 3,
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

  it('休市方向/天数缺省回落到项目默认档(往前 + 1 个交易日)', () => {
    const snapshot = buildSalesOrderPricingSnapshot({
      ...complete,
      priceClosedSettleDirection: undefined,
      priceClosedSettleDays: undefined,
    })

    expect(snapshot?.priceClosedSettleDirection).toBe('PREV')
    expect(snapshot?.priceClosedSettleDays).toBe(1)
  })

  it('休市调整天数 0 原样保留(旧「关闭」数据迁移而来), 不得抬成 1', () => {
    const snapshot = buildSalesOrderPricingSnapshot({
      ...complete,
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 0,
    })

    expect(snapshot?.priceClosedSettleDays).toBe(0)
    expect(snapshot?.priceClosedSettleDirection).toBe('NEXT')
  })

  it('休市方向非法值回落到往前, 天数越界夹到 0..30', () => {
    const badDirection = buildSalesOrderPricingSnapshot({
      ...complete,
      priceClosedSettleDirection: 'BACKWARD',
    })
    const tooLarge = buildSalesOrderPricingSnapshot({
      ...complete,
      priceClosedSettleDays: 99,
    })
    const negative = buildSalesOrderPricingSnapshot({
      ...complete,
      priceClosedSettleDays: -4,
    })

    expect(badDirection?.priceClosedSettleDirection).toBe('PREV')
    expect(tooLarge?.priceClosedSettleDays).toBe(30)
    expect(negative?.priceClosedSettleDays).toBe(0)
  })
})
