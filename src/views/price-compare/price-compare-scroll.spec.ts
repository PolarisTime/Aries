/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pageCss = readFileSync(
  new URL('./price-compare.css', import.meta.url),
  'utf8',
)

/** 取某条规则的声明块(按选择器字面量定位)。 */
const blockOf = (css: string, selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start, css.indexOf('}', start))
}

/**
 * 比价页纵向滚动契约。
 *
 * 背景(2026-10-09 缺陷): 比价表格没有内部滚动(SheetPanel 的 Table 未设 scroll.y
 * 且 pagination=false), 内容高度随品种/品牌行数增长; 而外层 .leo-content-inner
 * 是 overflow: hidden 且自身不滚动, 溢出部分被直接裁掉且不出现滚动条 ——
 * 在低分辨率设备上表现为「无法向下拖动」, 表格底部与"新增行"按钮不可达。
 *
 * 这些是纯 CSS 契约, jsdom 无法断言真实滚动行为, 因此按声明文本做回归保护;
 * 真实浏览器下的行为由 tests/e2e/price-compare-scroll.spec.ts 覆盖。
 */
describe('比价页纵向滚动契约', () => {
  const rootBlock = blockOf(pageCss, '#price-compare-root')

  it('页面根是纵向滚动容器(否则溢出内容被裁掉且无滚动条)', () => {
    expect(rootBlock).toMatch(/overflow-y:\s*(auto|scroll)/)
  })

  it('横向不出现滚动条(表格宽度由列宽计算收敛, 实测窄于容器)', () => {
    expect(rootBlock).toMatch(/overflow-x:\s*hidden/)
  })

  it('限制滚动链传递, 避免滚到边界后带动外层容器', () => {
    expect(rootBlock).toMatch(/overscroll-behavior:\s*contain/)
  })

  it('常驻滚动条槽位, 避免滚动条出现时内容横向跳动', () => {
    expect(rootBlock).toMatch(/scrollbar-gutter:\s*stable/)
  })

  it('与缩放契约共存于同一容器(缩放默认仍为 1)', () => {
    expect(rootBlock).toMatch(/zoom:\s*var\(--price-compare-zoom,\s*1\)/)
  })

  it('表格不改为内部滚动: 增量修复不得引入嵌套滚动条', () => {
    // SheetPanel 的 Table 若新增 scroll.y, 会与外层页面滚动形成嵌套滚动条;
    // 届时必须同步调整本契约与 e2e 用例。
    expect(pageCss).not.toMatch(/\.price-compare-table[^}]*max-height:\s*\d+px/)
  })
})
