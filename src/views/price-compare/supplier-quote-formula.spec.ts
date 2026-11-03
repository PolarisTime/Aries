/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import {
  evaluatePriceFormula,
  isPlainPriceText,
} from './supplier-quote-formula'

describe('单元格算式解析（禁用 eval，自写递归下降）', () => {
  it('四则运算与括号', () => {
    expect(evaluatePriceFormula('3200+50')).toEqual({ ok: true, value: 3250 })
    expect(evaluatePriceFormula('=3200+50')).toEqual({ ok: true, value: 3250 })
    expect(evaluatePriceFormula('(3200+50)*2')).toEqual({
      ok: true,
      value: 6500,
    })
    expect(evaluatePriceFormula('3200/4')).toEqual({ ok: true, value: 800 })
    expect(evaluatePriceFormula('3200*2-100')).toEqual({
      ok: true,
      value: 6300,
    })
    expect(evaluatePriceFormula('(3300-3200)')).toEqual({
      ok: true,
      value: 100,
    })
  })

  it('粘贴带来的千分位、货币符号与空白不是运算的一部分', () => {
    expect(evaluatePriceFormula('1,000+2')).toEqual({ ok: true, value: 1002 })
    expect(evaluatePriceFormula('¥3,200+50')).toEqual({ ok: true, value: 3250 })
    expect(evaluatePriceFormula(' 3 200 + 50 ')).toEqual({
      ok: true,
      value: 3250,
    })
  })

  it('以运算符开头 = 在当前值上运算', () => {
    const multiplied = evaluatePriceFormula('*1.02', { base: 3300 })
    expect(multiplied.ok).toBe(true)
    if (multiplied.ok) expect(multiplied.value).toBeCloseTo(3366, 6)
    expect(evaluatePriceFormula('+50', { base: 3300 })).toEqual({
      ok: true,
      value: 3350,
    })
    expect(evaluatePriceFormula('-100', { base: 3300 })).toEqual({
      ok: true,
      value: 3200,
    })
  })

  it('没有当前值时不能做相对运算', () => {
    expect(evaluatePriceFormula('+50', { base: null })).toEqual({
      ok: false,
      reason: 'no-base',
    })
    expect(evaluatePriceFormula('-100')).toEqual({
      ok: false,
      reason: 'no-base',
    })
    expect(evaluatePriceFormula('*1.02', { base: null })).toEqual({
      ok: false,
      reason: 'no-base',
    })
  })

  it('语法错误与业务上不允许的结果分别报错', () => {
    expect(evaluatePriceFormula('')).toEqual({ ok: false, reason: 'empty' })
    expect(evaluatePriceFormula('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(evaluatePriceFormula('abc')).toEqual({ ok: false, reason: 'syntax' })
    expect(evaluatePriceFormula('3200+')).toEqual({
      ok: false,
      reason: 'syntax',
    })
    expect(evaluatePriceFormula('(3200+50')).toEqual({
      ok: false,
      reason: 'syntax',
    })
    expect(evaluatePriceFormula('1.2.3')).toEqual({
      ok: false,
      reason: 'syntax',
    })
    expect(evaluatePriceFormula('3200/0')).toEqual({
      ok: false,
      reason: 'divide-by-zero',
    })
    expect(evaluatePriceFormula('3200-3300')).toEqual({
      ok: false,
      reason: 'negative',
    })
  })

  it('0 是真实价格，不做四舍五入', () => {
    expect(evaluatePriceFormula('0')).toEqual({ ok: true, value: 0 })
    const precise = evaluatePriceFormula('3200*1.0005')
    expect(precise.ok).toBe(true)
    if (precise.ok) expect(precise.value).toBeCloseTo(3201.6, 6)
  })

  it('普通数字文本与算式分开：逐键录入只对普通数字立即落草稿', () => {
    expect(isPlainPriceText('')).toBe(true)
    expect(isPlainPriceText('3200')).toBe(true)
    expect(isPlainPriceText('3.')).toBe(true)
    expect(isPlainPriceText('3200+50')).toBe(false)
    expect(isPlainPriceText('*1.02')).toBe(false)
    expect(isPlainPriceText('(3200+50)*2')).toBe(false)
  })

  it('不使用 eval / new Function', async () => {
    const source = await import('node:fs').then((module) =>
      module.readFileSync(
        new URL('./supplier-quote-formula.ts', import.meta.url),
        'utf8',
      ),
    )
    expect(source).not.toMatch(/\beval\s*\(/)
    expect(source).not.toMatch(/new\s+Function\s*\(/)
  })
})
