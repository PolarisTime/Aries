/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH } from './sheet-column-width'

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

const pageCss = read('./price-compare.css')
const shellCss = read('../../styles/layout-shell.css')
const touchTargetsCss = read('../../styles/touch-targets.css')
const loadingCss = read('../../styles/loading.css')

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

  it('行操作列收窄到 icon-only 最小值, 且单元格留白不把列撑大', () => {
    // 列宽在 JS 侧声明(只有 icon-only「更多」按钮), 必须在 icon-only 最小尺寸区间内
    expect(PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH).toBeGreaterThanOrEqual(24)
    expect(PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH).toBeLessThanOrEqual(32)

    const cell = blockOf(pageCss, 'td.price-compare-row-actions-cell')
    // 留白收窄后内容区不小于 24px, 否则按钮会被挤到换行/裁剪
    expect(cell).toMatch(/padding-inline:\s*2px/)
    expect(cell).toMatch(
      new RegExp(
        `min-width:\\s*${PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH}px\\s*!important`,
      ),
    )
    // 单元格留白不能超过列宽与 24px 命中区之差
    const padding = Number(cell.match(/padding-inline:\s*(\d+)px/)?.[1] ?? '99')
    expect(
      PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH - padding * 2,
    ).toBeGreaterThanOrEqual(24)
  })

  it('icon-only 按钮的触摸热区由 ::before 补足到至少 24×24(WCAG 2.5.8)', () => {
    expect(touchTargetsCss).toMatch(/width:\s*max\(100%,\s*24px\)/)
    expect(touchTargetsCss).toMatch(/height:\s*max\(100%,\s*24px\)/)
  })

  it('sr-only 触发器在键盘聚焦时还原为可见按钮(WCAG 2.4.7)', () => {
    // 默认仍是视觉隐藏: 裁剪必须保留, 否则全仓 sr-only 文本会直接显示出来
    const hidden = blockOf(loadingCss, '.aries-sr-only {')
    expect(hidden).toMatch(/clip:\s*rect\(0 0 0 0\)/)
    expect(hidden).toMatch(/width:\s*1px/)
    expect(hidden).toMatch(/height:\s*1px/)

    // 聚焦还原: 解除 1×1 裁剪并给出可见焦点环, 否则焦点落在看不见的位置
    const restore = blockOf(loadingCss, '.aries-sr-only:focus-visible')
    expect(restore).toMatch(/position:\s*static/)
    expect(restore).toMatch(/width:\s*auto/)
    expect(restore).toMatch(/height:\s*auto/)
    expect(restore).toMatch(/clip:\s*auto/)
    expect(restore).toMatch(/clip-path:\s*none/)
    expect(restore).toMatch(/outline:\s*2px solid/)

    // 比价页覆盖落位: 勾选列只有 32px, 还原后的按钮必须绝对定位(布局零位移)且 ≥24×24
    const cell = blockOf(pageCss, '.price-compare-row-select')
    expect(cell).toMatch(/position:\s*relative/)
    const overlay = blockOf(
      pageCss,
      '.price-compare-row-actions.aries-sr-only:focus-visible',
    )
    expect(overlay).toMatch(/position:\s*absolute/)
    expect(overlay).toMatch(/min-width:\s*24px/)
    expect(overlay).toMatch(/min-height:\s*24px/)
    expect(overlay).toMatch(/outline:\s*2px solid/)
  })

  it('行选择框可点区域不小于 24×24', () => {
    const block = blockOf(pageCss, '.price-compare-table .ant-checkbox-wrapper')
    expect(block).toMatch(/min-width:\s*24px/)
    expect(block).toMatch(/min-height:\s*24px/)
  })

  it('品牌列头触发器自身不小于 24×24, 且不遮挡 draggable 标题', () => {
    const trigger = blockOf(
      pageCss,
      '.column-header-menu-trigger:has(> .price-compare-brand-name) {',
    )
    expect(trigger).toMatch(/min-width:\s*24px/)
    expect(trigger).toMatch(/min-height:\s*24px/)
    // 触摸热区伪元素若参与命中测试, HTML5 拖拽就找不到 draggable 的品牌名
    const hotZone = blockOf(
      pageCss,
      '.column-header-menu-trigger:has(> .price-compare-brand-name)::before',
    )
    expect(hotZone).toContain('pointer-events: none')
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
    // 超额态只靠这段文字表达(文案本身写明「超额 x」), 因此文字色必须够深
    expect(blockOf(pageCss, '.price-compare-ton-hint--over')).toContain(
      'var(--color-danger-active',
    )
    // 不再有感叹号图标: 语义由文字承担, 颜色不是唯一线索(WCAG 1.4.1)
    expect(pageCss).not.toContain('.price-compare-ton-over-icon')
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
