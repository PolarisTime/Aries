/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

const pageCss = read('./price-compare.css')
const shellCss = read('../../styles/layout-shell.css')

/**
 * 样式层的无障碍契约(WCAG 2.2 AA)。
 * 这些规则是纯 CSS、无法在 jsdom 里断言渲染结果, 但一旦被回退就会静默失效
 * (对比度降到 3:1 以下、点击区域缩回 12px), 因此按声明文本做回归保护。
 */
/** 取某条规则的声明块(按选择器字面量定位)。 */
const blockOf = (css: string, selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start, css.indexOf('}', start))
}

describe('比价页样式无障碍契约', () => {
  it('标签关闭按钮命中区不小于 24×24(WCAG 2.5.8)', () => {
    const block = blockOf(shellCss, '.leo-tabbar .ant-tabs-tab-remove')
    expect(block).toMatch(/min-width:\s*24px/)
    expect(block).toMatch(/min-height:\s*24px/)
  })

  it('表头一键填入与吨位明细图标命中区不小于 24×24', () => {
    const fill = blockOf(
      pageCss,
      '.price-compare-supplier-header .price-compare-supplier-fill-btn',
    )
    expect(fill).toMatch(/min-width:\s*24px/)
    expect(fill).toMatch(/min-height:\s*24px/)

    const info = blockOf(pageCss, '.price-compare-ton-info {')
    expect(info).toMatch(/min-width:\s*24px/)
    expect(info).toMatch(/min-height:\s*24px/)
  })

  it('行选择框可点区域不小于 24×24', () => {
    const block = blockOf(pageCss, '.price-compare-table .ant-checkbox-wrapper')
    expect(block).toMatch(/min-width:\s*24px/)
    expect(block).toMatch(/min-height:\s*24px/)
  })

  it('非最优品牌压暗度不低于 0.62(0.45 会把文字压到 2.8:1)', () => {
    const block = blockOf(pageCss, '.price-compare-dim {')
    const opacity = Number(block.match(/opacity:\s*([\d.]+)/)?.[1] ?? '0')
    expect(opacity).toBeGreaterThanOrEqual(0.62)
  })

  it('语义色文字使用满足 4.5:1 的深色令牌', () => {
    // antd 默认 primary(#1677ff, 4.1:1) 与 error(#ff4d4f, 3.27:1) 对 11–12px 小字偏低
    const fill = blockOf(
      pageCss,
      '.price-compare-supplier-header .price-compare-supplier-fill-btn',
    )
    expect(fill).toContain('var(--color-info-active')
    expect(blockOf(pageCss, '.price-compare-ton-hint--over')).toContain(
      'var(--color-danger-active',
    )
    expect(blockOf(pageCss, '.price-compare-variety-switch')).toContain(
      'var(--color-info-active',
    )
  })

  it('说明性文字不再使用 placeholder 级灰度', () => {
    for (const selector of [
      '.price-compare-head .price-compare-desc',
      '.price-compare-sub',
      '.price-compare-legend',
      '.price-compare-add-row',
      '.price-compare-separator-label',
    ]) {
      const block = blockOf(pageCss, selector)
      expect(block, `${selector} 仍在使用低对比度色`).not.toContain(
        'var(--text-placeholder)',
      )
      expect(block).toContain('var(--text-secondary)')
    }
  })
})
