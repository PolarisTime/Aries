import { describe, expect, it } from 'vitest'
import {
  DISPLAY_AMOUNT_PRECISION,
  DISPLAY_WEIGHT_PRECISION,
} from '@/constants/precision'
import { formatAmount, formatWeight } from './formatters'

/**
 * 金额 / 重量显示口径守卫。
 *
 * <p>两条约定各只有一个来源：位数分别由 {@link DISPLAY_AMOUNT_PRECISION} 与
 * {@link DISPLAY_WEIGHT_PRECISION} 决定，且**一律不带千分位分隔符**。</p>
 *
 * <p>为什么需要守卫：这两件事都曾被写成「多处各写一份 `toLocaleString`」——
 * 表格单元格、汇总条、对账模型、单据引用浮层各有一份实现，于是出现过
 * 「表格 `1,981,382.98`、汇总 `1981382.98`」这种同一笔钱两种写法。
 * 位数同理：净重列曾写死 `toFixed(2)`，而全站重量是 3 位。</p>
 */
describe('formatAmount', () => {
  it('小数位由 DISPLAY_AMOUNT_PRECISION 决定', () => {
    const [integerPart, fractionPart] = formatAmount(1234.5).split('.')
    expect(integerPart).toBe('1234')
    expect(fractionPart).toHaveLength(DISPLAY_AMOUNT_PRECISION)
  })

  it('不带千分位分隔符（产品决定：便于复制进表格与搜索框）', () => {
    // 与位数解耦：只断言「没有逗号」和「整数部分完整」，改精度时不必跟着改用例
    const text = formatAmount(1981382.98)
    expect(text).not.toContain(',')
    expect(text.startsWith('1981382.')).toBe(true)
    expect(formatAmount(1234567.891)).not.toContain(',')
  })

  it('整数金额补齐小数位，负数保留符号', () => {
    expect(formatAmount(0)).toMatch(/^0\.0+$/)
    expect(formatAmount(-1234.5).startsWith('-1234.')).toBe(true)
  })
})

describe('formatWeight', () => {
  it('小数位由 DISPLAY_WEIGHT_PRECISION 决定且不带千分位', () => {
    expect(formatWeight(1202.277)).toBe('1202.277')
    expect(formatWeight(601.8381)).toBe('601.838')
    expect(formatWeight(1202.277)).not.toContain(',')
    const [, fractionPart] = formatWeight(1).split('.')
    expect(fractionPart).toHaveLength(DISPLAY_WEIGHT_PRECISION)
  })
})
