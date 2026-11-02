import { describe, expect, it } from 'vitest'
import {
  formatUsagePercent,
  isQuotaExceeded,
  toBarPercent,
} from './project-sales-summary-display'

/**
 * 「项目数据」面板的限额口径。
 *
 * <p>回归背景：超限判定此前有两个出口——进度条用 {@code rate > 1}，超限提示用
 * {@code exceededAmount > 0}。使用率按 4 位小数展示后两者会分叉：已用比合同多 0.01 元时
 * rate 仍显示 100.00%（{@code 1.0000} 不大于 1），进度条因此保持蓝色，而「已超出合同金额
 * 0.01 元」的提示照常出现。现在判定只认后端给出的超出额，两个出口共用同一个函数。</p>
 */
describe('合同限额判定只认超出额', () => {
  it('超出额 > 0 才算超限，0 与负值都不算', () => {
    expect(isQuotaExceeded(0.01)).toBe(true)
    expect(isQuotaExceeded(1)).toBe(true)
    expect(isQuotaExceeded(0)).toBe(false)
    expect(isQuotaExceeded(-0.01)).toBe(false)
    expect(isQuotaExceeded(0.0001)).toBe(true)
  })

  it('缺值（null/undefined/NaN）不算超限，避免无合同场景误报', () => {
    expect(isQuotaExceeded(null)).toBe(false)
    expect(isQuotaExceeded(undefined)).toBe(false)
    expect(isQuotaExceeded(Number.NaN)).toBe(false)
  })

  it('rate 恰好等于 1（展示 100.00%）但已有超出额时仍判超限', () => {
    // 用能区分两种口径的数据：rate 不大于 1，但超出额为正。
    const rate = 1.0
    const exceededAmount = 0.01
    expect(rate > 1).toBe(false)
    expect(isQuotaExceeded(exceededAmount)).toBe(true)
  })

  it('rate 略大于 1 但超出额被金额精度归零时不算超限（与提示口径一致）', () => {
    const rate = 1.0000004
    const exceededAmount = 0
    expect(rate > 1).toBe(true)
    expect(isQuotaExceeded(exceededAmount)).toBe(false)
  })
})

describe('使用率展示', () => {
  it('百分比固定两位小数，缺值显示占位符', () => {
    expect(formatUsagePercent(0.8532)).toBe('85.32%')
    expect(formatUsagePercent(1)).toBe('100.00%')
    expect(formatUsagePercent(null)).toBe('—')
  })

  it('进度条刻度 clamp 到 0~100，超限不越界', () => {
    expect(toBarPercent(0.5)).toBe(50)
    expect(toBarPercent(1.5)).toBe(100)
    expect(toBarPercent(-0.2)).toBe(0)
    expect(toBarPercent(null)).toBe(0)
  })
})
