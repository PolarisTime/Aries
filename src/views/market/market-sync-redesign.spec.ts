/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

const pageCss = read('./market-sync.css')
const matrixSource = read('./market-sync-matrix.tsx')
const viewSource = read('./MarketSyncView.tsx')
const detailSource = read('./market-sync-detail-drawer.tsx')
const toolbarSource = read('./market-sync-toolbar.tsx')
const gapListSource = read('./market-sync-gap-list.tsx')
const modelSource = read('./market-sync-model.ts')

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
    // 重做后格子放大到 32px 高（价格数字看得清），但下限必须是 24
    const width = Number(/min-width:\s*(\d+)px/.exec(block)?.[1])
    const height = Number(/min-height:\s*(\d+)px/.exec(block)?.[1])
    expect(width).toBeGreaterThanOrEqual(24)
    expect(height).toBeGreaterThanOrEqual(24)
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
    expect(matrixSource).toMatch(/periods\.map\(\(period\) =>/)
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

  it('矩阵日期按时间正序(左旧右新), 符合"时间向右递增"的直觉', () => {
    // 上一版是 matrixDays 原序(新→旧), 反向数"上周三"很容易读错
    expect(matrixSource).toMatch(/\[\.\.\.matrixDays\]\.sort\(\)/)
    expect(matrixSource).not.toMatch(/matrixDays\.map\(\(date\)/)
  })

  it('矩阵按周分组: 周一列有周起点标记, 且不与单元格语义色抢空间', () => {
    expect(matrixSource).toMatch(/is-week-start/)
    const block = blockOf(pageCss, '.market-sync-grid th.is-week-start {')
    expect(block).toMatch(/border-inline-start/)
  })

  it('矩阵有行尾缺口汇总列 + 「只看缺失」筛选(缺口多时能一屏看完待补日期)', () => {
    expect(matrixSource).toMatch(/market-sync-grid-summaryhead/)
    expect(matrixSource).toMatch(/matrixSummaryGap/)
    expect(matrixSource).toMatch(/matrixOnlyMissing/)
    expect(matrixSource).toMatch(/onlyMissing/)
  })

  it('矩阵给了最小列宽: 否则 1280 下 "540" 会被折成 "54/0"', () => {
    const block = blockOf(pageCss, '.market-sync-grid {')
    const minWidth = Number(/min-width:\s*(\d+)px/.exec(block)?.[1])
    // 30 列 + 时段列 + 汇总列, 每列至少 34px
    expect(minWidth).toBeGreaterThanOrEqual(30 * 34)
  })

  it('格子内价格不折行(nowrap + 数字等宽)', () => {
    const block = blockOf(pageCss, '.market-sync-cell {')
    expect(block).toMatch(/white-space:\s*nowrap/)
    expect(block).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })

  it('矩阵窗口可往前后翻, 且只允许翻到过去(不能翻到未来)', () => {
    expect(matrixSource).toMatch(/market-sync-pager-button/)
    expect(matrixSource).toMatch(/windowCanPrev/)
    expect(matrixSource).toMatch(/windowCanNext/)
    // 翻页状态在 hook 里, 「更近」以 page>0 为界, 不会出现负数页码
    const hookSource = read('./useMarketSync.ts')
    expect(hookSource).toMatch(/windowPage > 0/)
    expect(hookSource).toMatch(/Math\.max\(0, page - 1\)/)
  })

  it('矩阵只缓存当前一段: 窗口翻页按整段平移, 日历请求区间跟着走', () => {
    const hookSource = read('./useMarketSync.ts')
    // 窗口首日 = 今天 - (页码 * 天数)，按整段平移而不是按天抖动
    expect(hookSource).toMatch(/windowPage \* MATRIX_DAYS/)
    expect(hookSource).toMatch(/calendarRange/)
  })

  it('文案不再写死"近 30 天": 翻页后仍然是准确的', () => {
    const zh = readFileSync(
      new URL('../../locales/zh-CN.ts', import.meta.url),
      'utf8',
    )
    const block = zh.slice(
      zh.indexOf('  marketSync: {'),
      zh.indexOf('  financeDetail: {'),
    )
    // 指标/矩阵/空态都改为"本段"口径; 只有补数窗口仍按天数描述
    expect(block).toContain("metricCoverageTitle: '本段覆盖'")
    expect(block).toContain("metricMissingTitle: '本段缺失'")
    expect(block).toContain("metricLatestTitle: '本段最新'")
    expect(block).toContain("matrixTitle: '覆盖矩阵'")
    expect(block).not.toContain('近30天覆盖')
    expect(block).not.toContain('覆盖矩阵（近30天）')
  })

  it('缺口清单与矩阵共用同一状态口径(不再各算一遍)', () => {
    // 单一来源: matrixCellState 在 model 里定义, 矩阵与清单都 import 它
    expect(modelSource).toMatch(/export const matrixCellState/)
    expect(matrixSource).toMatch(/matrixCellState\(date, period, calendars\)/)
    expect(gapListSource).toMatch(/matrixCellState\(date, period, calendars\)/)
  })

  it('缺口清单的标签是按钮而不是纯文本(点一下即同步该时段)', () => {
    expect(gapListSource).toMatch(/<button/)
    expect(gapListSource).toMatch(/aria-label=\{label\}/)
    expect(gapListSource).toMatch(/onSyncDate\(date, group\.period\)/)
  })

  it('数据源/地区属于页首上下文, 而不是和写操作混在一条工具栏里', () => {
    expect(toolbarSource).toMatch(/MarketSyncHeader/)
    // 页首负责数据源与刷新, 操作条只留单日同步/区间补数
    const headerBlock = toolbarSource.slice(
      toolbarSource.indexOf('export function MarketSyncHeader'),
      toolbarSource.indexOf('export function MarketSyncToolbar'),
    )
    expect(headerBlock).toMatch(/market-sync-source-select/)
    expect(headerBlock).toMatch(/onRefreshCalendar/)
  })

  it('同一个补数动作只出现一次(后端本来就会跳过已入库日期)', () => {
    // 重做前「补数」「补缺失」两个按钮调同一个 onBackfill
    const toolbarBlock = toolbarSource.slice(
      toolbarSource.indexOf('export function MarketSyncToolbar'),
    )
    expect(toolbarBlock.match(/onClick=\{onBackfill\}/g) ?? []).toHaveLength(1)
  })

  it('不再复用比价页的页面级 class(重做后有自己的样式边界)', () => {
    for (const source of [viewSource, matrixSource, detailSource]) {
      expect(source).not.toMatch(/price-compare-page/)
      expect(source).not.toMatch(/price-compare-head/)
    }
  })
})
