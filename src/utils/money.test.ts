import { describe, expect, it } from 'vitest'

import {
  divideAmount,
  multiplyAmount,
  roundAmount,
  roundDecimal,
  roundWeight,
  subtractAmount,
  sumAmounts,
} from './money'

describe('money 十进制金额计算', () => {
  it('9.995 × 3335 = 33333.33（修复 double + toFixed 得 33333.32 的偏差）', () => {
    expect(multiplyAmount(9.995, 3335)).toBe(33333.33)
    // 历史写法：Number((9.995 * 3335).toFixed(2)) === 33333.32
    expect(Number((9.995 * 3335).toFixed(2))).toBe(33333.32)
  })

  it.each([
    ['1.005 × 1', multiplyAmount(1.005, 1), 1.01],
    ['10.005 × 1', multiplyAmount(10.005, 1), 10.01],
    ['2.675 × 1', multiplyAmount(2.675, 1), 2.68],
    ['0.125 × 1', multiplyAmount(0.125, 1), 0.13],
    ['0.1 × 3', multiplyAmount(0.1, 3), 0.3],
    ['-9.995 × 3335', multiplyAmount(-9.995, 3335), -33333.33],
    ['9.995 × 0', multiplyAmount(9.995, 0), 0],
  ])('%s 应得到 %s', (_label, actual, expected) => {
    expect(actual).toBe(expected)
  })

  it('字符串输入按十进制字面量解析，不受二进制浮点影响', () => {
    expect(multiplyAmount('9.995', '3335')).toBe(33333.33)
    expect(roundAmount('33333.325')).toBe(33333.33)
  })

  it('roundAmount 按 HALF_UP 舍到分', () => {
    expect(roundAmount(33333.325)).toBe(33333.33)
    expect(roundAmount(2.4)).toBe(2.4)
    expect(roundAmount(-1.005)).toBe(-1.01)
    expect(roundAmount(0)).toBe(0)
  })

  it('roundWeight 按 8 位小数舍入', () => {
    expect(roundWeight(9.995)).toBe(9.995)
    expect(roundWeight(1.123456789)).toBe(1.12345679)
  })

  it('sumAmounts 先精确相加、最后舍入一次', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3)
    expect(sumAmounts([33333.32, 0.005])).toBe(33333.33)
    expect(sumAmounts([33333.32, 33333.32])).toBe(66666.64)
    expect(sumAmounts([])).toBe(0)
  })

  it('subtractAmount 精确相减后舍到分', () => {
    expect(subtractAmount(33333.33, 33333.32)).toBe(0.01)
    expect(subtractAmount(0.3, 0.1)).toBe(0.2)
    expect(subtractAmount(1, 2)).toBe(-1)
    expect(subtractAmount(0.1, 0.3)).toBe(-0.2)
  })

  it('divideAmount 反算单价，除数为 0 时返回 0', () => {
    expect(divideAmount(33333.33, 9.995)).toBe(3335)
    expect(divideAmount(0, 9.995)).toBe(0)
    expect(divideAmount(1, 0)).toBe(0)
  })

  it('空值/非法值兜底为 0，与历史 toRoundedNumber 行为一致', () => {
    expect(roundAmount(null)).toBe(0)
    expect(roundAmount(undefined)).toBe(0)
    expect(roundAmount('')).toBe(0)
    expect(roundAmount('not-a-number')).toBe(0)
    expect(roundAmount(Number.POSITIVE_INFINITY)).toBe(0)
    expect(roundDecimal(Number.NaN, 2)).toBe(0)
  })
})
