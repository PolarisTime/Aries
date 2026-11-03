import { describe, expect, it } from 'vitest'
import {
  ABNORMAL_PRICE_RATIO,
  abnormalRatioPercent,
  isAbnormalPrice,
  rowPriceStats,
} from './supplier-quote-price'

describe('本行最低价与异常价（唯一口径）', () => {
  it('最低价只统计正数：0 与空值不参与比较', () => {
    expect(rowPriceStats([3280, null, undefined, 3300, 0])).toEqual({
      min: 3280,
    })
    expect(rowPriceStats([null, 0, undefined])).toEqual({ min: null })
    expect(rowPriceStats([])).toEqual({ min: null })
  })

  it('恰好高于 5% 不算异常，超过 5% 才标黄', () => {
    expect(ABNORMAL_PRICE_RATIO).toBe(0.05)
    // 3280 × 1.05 = 3444
    expect(isAbnormalPrice(3444, 3280)).toBe(false)
    expect(isAbnormalPrice(3444.01, 3280)).toBe(true)
    expect(isAbnormalPrice(3500, 3280)).toBe(true)
    expect(isAbnormalPrice(3280, 3280)).toBe(false)
    expect(isAbnormalPrice(3100, 3000)).toBe(false)
  })

  it('空值 / 0 / 没有最低价时一律不标黄', () => {
    expect(isAbnormalPrice(null, 3280)).toBe(false)
    expect(isAbnormalPrice(3280, null)).toBe(false)
    expect(isAbnormalPrice(0, 3280)).toBe(false)
    expect(isAbnormalPrice(3500, 0)).toBe(false)
  })

  it('幅度百分比保留一位小数（与标黄判定同一口径）', () => {
    expect(abnormalRatioPercent(3444, 3280)).toBe(5)
    expect(abnormalRatioPercent(3680, 3280)).toBe(12.2)
    expect(abnormalRatioPercent(3280, 0)).toBe(0)
  })
})
