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
  /**
   * 选择器特异性(ids, classes, elements 的粗略计数)。
   *
   * <p>这里只用于比较"谁是 `!important` 之争的胜者": 两条都是 `!important` 时,
   * 特异性高者生效 —— 拖拽落点线就曾因此永远画不出来。</p>
   */
  const specificityOf = (selector: string): [number, number, number] => {
    const ids = (selector.match(/#[\w-]+/g) ?? []).length
    const classes = (
      selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[a-z-]+(?:\([^)]*\))?/g) ?? []
    ).length
    const types = (selector.match(/(?:^|[\s>+~])[a-z][\w-]*/g) ?? []).length
    return [ids, classes, types]
  }
  const atLeastAsSpecific = (
    a: [number, number, number],
    b: [number, number, number],
  ) =>
    a[0] > b[0] ||
    (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] >= b[2])))

  /** 取包含某片段的那条规则的选择器(规则块从上一个 } 或注释结束处开始)。 */
  const ruleSelectorContaining = (css: string, fragment: string) => {
    const index = css.indexOf(fragment)
    expect(index, `未找到规则片段 ${fragment}`).toBeGreaterThan(-1)
    const start = Math.max(
      css.lastIndexOf('}', index),
      css.lastIndexOf('*/', index),
    )
    return css
      .slice(start + 1, css.indexOf('{', index))
      .trim()
      .replace(/\s+/g, ' ')
  }

  it('拖拽落点线的特异性不低于通用单元格边框(否则 2px 主色线被 1px 灰线压掉, 落点线画不出来)', () => {
    const genericRule = ruleSelectorContaining(
      pageCss,
      'ant-table-bordered\n  > .ant-table-container',
    )
    const generic = genericRule
      .split(',')
      .map((part) => part.trim())
      .find((part) => part.includes('tbody'))
    expect(generic).toBeTruthy()
    for (const marker of [
      'tr.price-compare-drop-after',
      'tr.price-compare-drop-before',
    ]) {
      const selector = ruleSelectorContaining(pageCss, marker)
      expect(selector).toContain('.ant-table.ant-table-bordered')
      expect(
        atLeastAsSpecific(specificityOf(selector), specificityOf(generic!)),
        `${marker} 的选择器特异性不足: ${selector}`,
      ).toBe(true)
    }
  })

  it('sr-only 行操作触发器未聚焦时不画背景/投影(否则 1px 高会画成一条蓝色下横线)', () => {
    const block = blockOf(
      pageCss,
      '.price-compare-row-actions.aries-sr-only:not(:focus-visible)',
    )
    // 真机实测: 锁定态该触发器 rect 24×1, position:relative 让 clip 失效 → 背景成线
    expect(block).toMatch(/background-color:\s*transparent/)
    expect(block).toMatch(/box-shadow:\s*none/)
    // 不允许再有"主色实心背景"这类会被画成细线的声明
    expect(block).not.toMatch(/background(-color)?:\s*var\(--ant-color-primary/)
  })

  it('锁定态触发器聚焦还原时给主色锁图标(白底上白字会看不见)', () => {
    const block = blockOf(
      pageCss,
      '.price-compare-row-actions--locked.aries-sr-only:focus-visible',
    )
    expect(block).toMatch(/color:\s*var\(--ant-color-primary/)
  })

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
