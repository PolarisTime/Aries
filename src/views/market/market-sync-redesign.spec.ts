/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

const pageCss = read('./market-sync.css')
const matrixSource = read('./market-sync-matrix.tsx')
const viewSource = read('./MarketSyncView.tsx')
const detailSource = read('./market-sync-detail-drawer.tsx')

/** 取某条规则的声明块(按选择器字面量定位)。 */
const blockOf = (css: string, selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start, css.indexOf('}', start))
}

/**
 * 行情同步页重做的契约回归。
 *
 * 背景(重做前实测): 页面根不是滚动容器, 外层 .leo-content-inner 是 overflow: hidden
 * 且自身不滚动, 而覆盖矩阵又自带 scroll={{y:420}} 内部滚动 —— 两者叠加让底部内容
 * 被裁掉不可达(1280×700 时内容 853px / 可视 571px)。重做后矩阵转为 3 行紧凑带,
 * 页面只保留唯一一处纵向滚动。
 *
 * 这些是纯 CSS / 结构契约, jsdom 无法断言真实滚动行为, 因此按文本做回归保护;
 * 真实浏览器行为由 tests/e2e/market-sync.spec.ts 覆盖。
 */
describe('行情同步页重做契约', () => {
  it('页面根是唯一的纵向滚动容器', () => {
    const block = blockOf(pageCss, '.market-sync-page {')
    expect(block).toMatch(/overflow-y:\s*(auto|scroll)/)
    expect(block).toMatch(/overflow-x:\s*hidden/)
    expect(block).toMatch(/overscroll-behavior:\s*contain/)
  })

  it('矩阵不再有内部滚动(避免与外层页面滚动形成嵌套滚动条)', () => {
    // scroll={{ y: ... }} 会让矩阵在卡片内再滚一次, 与页面滚动叠加
    expect(matrixSource).not.toMatch(/scroll=\{\{\s*y:/)
  })

  it('矩阵单元格命中区不小于 24×24(WCAG 2.2 SC 2.5.8)', () => {
    const block = blockOf(pageCss, '.market-sync-cell {')
    expect(block).toMatch(/min-width:\s*24px/)
    expect(block).toMatch(/min-height:\s*24px/)
  })

  it('矩阵每个可交互单元格都有可访问名(否则读屏听到一串同名的「缺」)', () => {
    // aria-label 必须由 日期+时段 组合生成, 而不是固定文案
    expect(matrixSource).toMatch(/aria-label=\{label\}/)
    expect(matrixSource).toMatch(/matrixCellMissing/)
    expect(matrixSource).toMatch(/matrixCellSynced/)
  })

  it('休市不是可执行动作: 用文本而非禁用按钮', () => {
    // 禁用按钮不可聚焦, 而休市本身没有动作语义, 应当是无交互的文本
    expect(matrixSource).toMatch(/state === 'off'/)
    expect(matrixSource).toMatch(/className="market-sync-cell is-off"/)
  })

  it('矩阵按「时段 × 日期」转置(时段是行头, 不再是 30 行大表)', () => {
    expect(matrixSource).toMatch(/periods\.map\(\(period\) => \(\s*<tr/s)
    expect(matrixSource).toMatch(/scope="row"/)
    expect(matrixSource).toMatch(/scope="col"/)
  })

  it('明细区是右侧抽屉且以 title 提供可访问名', () => {
    expect(viewSource).toMatch(/MarketSyncDetailDrawer/)
    expect(detailSource).toMatch(/<Drawer/)
    expect(detailSource).toMatch(/placement="right"/)
    // antd 在 title 可渲染时才会把抽屉接到 aria-labelledby
    expect(detailSource).toMatch(/title=\{/)
  })

  it('不再复用比价页的页面级 class(重做后有自己的样式边界)', () => {
    for (const source of [viewSource, matrixSource, detailSource]) {
      expect(source).not.toMatch(/price-compare-page/)
      expect(source).not.toMatch(/price-compare-head/)
    }
  })
})
