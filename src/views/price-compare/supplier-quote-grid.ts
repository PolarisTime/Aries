import { type QuoteRow, quoteRowKey } from './supplier-price-list-model'

/** 粘贴到网格的一格：`null` 表示清空。 */
export type GridPasteCell = {
  brandName: string
  rowKey: string
  value: number | null
}

export type GridPastePlan = {
  cells: GridPasteCell[]
  /** 因非数字、负数或越界被丢弃的格子数（用于提示，不阻断整次粘贴）。 */
  dropped: number
}

/**
 * 解析 Excel 剪贴板文本。
 *
 * <p>Excel 复制多格时是「行用 \n、列用 \t」；末尾常带一个空行，需要去掉。
 * 单元格里的千分位逗号会被去掉（`3,280.00` → `3280.00`），其余按原样解析。</p>
 */
export function parseClipboardGrid(text: string): string[][] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n$/, '')
  if (!normalized.trim()) return []
  return normalized
    .split('\n')
    .map((line) => line.split('\t').map((cell) => cell.trim()))
}

/** 单元格文本 → 价格；空串表示「清空」；非法/负数返回 `undefined`（丢弃）。 */
export function parseGridPrice(raw: string): number | null | undefined {
  const text = raw.replace(/,/g, '').trim()
  if (text === '') return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0) return undefined
  return value
}

/**
 * 把粘贴矩阵从锚点铺到网格上（行优先，右侧/下侧越界部分丢弃）。
 *
 * <p>锚点 = 当前聚焦的单元格；矩阵第一格覆盖锚点本身，向右扩展品牌列、向下扩展规格行。
 * 这是 Excel 的基本行为，也是「整列报价一次贴进来」的关键。</p>
 */
export function buildPastePlan(args: {
  matrix: readonly (readonly string[])[]
  brandNames: readonly string[]
  rows: readonly QuoteRow[]
  startBrandIndex: number
  startRowIndex: number
}): GridPastePlan {
  const cells: GridPasteCell[] = []
  let dropped = 0

  args.matrix.forEach((line, rowOffset) => {
    const row = args.rows[args.startRowIndex + rowOffset]
    if (!row) {
      dropped += line.length
      return
    }
    const rowKey = quoteRowKey(row)
    line.forEach((raw, columnOffset) => {
      const brandName = args.brandNames[args.startBrandIndex + columnOffset]
      if (!brandName) {
        dropped += 1
        return
      }
      const value = parseGridPrice(raw)
      if (value === undefined) {
        dropped += 1
        return
      }
      cells.push({ brandName, rowKey, value })
    })
  })

  return { cells, dropped }
}

export type GridTarget = { brandIndex: number; rowIndex: number }

/**
 * 方向键/回车后的目标单元格；越界返回 `null`（调用方放行浏览器默认行为，
 * 例如在最后一格按 Tab 时离开表格，而不是把焦点困在网格里）。
 */
export function nextGridCell(args: {
  brandIndex: number
  rowIndex: number
  deltaCol: number
  deltaRow: number
  brandCount: number
  rowCount: number
}): GridTarget | null {
  const brandIndex = args.brandIndex + args.deltaCol
  const rowIndex = args.rowIndex + args.deltaRow
  if (brandIndex < 0 || brandIndex >= args.brandCount) return null
  if (rowIndex < 0 || rowIndex >= args.rowCount) return null
  return { brandIndex, rowIndex }
}

/**
 * 报价网格的固定列宽（px）。
 *
 * <p>表格用 `tableLayout="fixed"` + 固定总宽，避免 antd 按容器宽度把列拉伸（实测 4 列被拉到
 * 满屏：序号 200px、品牌列 780px）。总宽随品牌列数线性增长，窄屏时横向滚动。</p>
 */
export const SHEET_COLUMN_WIDTH = {
  index: 52,
  category: 96,
  spec: 200,
  brand: 160,
} as const

/** 网格总宽：固定列 + 品牌列 × 品牌数（至少按 1 列算，空表也不塌）。 */
export function sheetWidthOf(brandCount: number): number {
  const { index, category, spec, brand } = SHEET_COLUMN_WIDTH
  return index + category + spec + Math.max(brandCount, 1) * brand
}

/** 品牌列的显示偏好：顺序 + 隐藏集合（按供应商存到 localStorage）。 */
export type BrandPrefs = {
  order: string[]
  hidden: string[]
}

const EMPTY_PREFS: BrandPrefs = { order: [], hidden: [] }

/** 解析本地保存的偏好；任何脏数据都退化为「默认顺序、不隐藏」，不影响打开页面。 */
export function parseBrandPrefs(raw: string | null): BrandPrefs {
  if (!raw) return { ...EMPTY_PREFS }
  try {
    const value = JSON.parse(raw) as { order?: unknown; hidden?: unknown }
    const strings = (input: unknown): string[] =>
      Array.isArray(input)
        ? input.filter((item): item is string => typeof item === 'string')
        : []
    return { order: strings(value.order), hidden: strings(value.hidden) }
  } catch {
    return { ...EMPTY_PREFS }
  }
}

export function serializeBrandPrefs(prefs: BrandPrefs): string {
  return JSON.stringify(prefs)
}

/**
 * 按偏好顺序排列品牌列。
 *
 * <p>偏好里没有记录的品牌（新出现的经营品牌）按传入顺序追加在末尾，不会被藏掉。</p>
 */
export function applyBrandOrder(
  base: readonly string[],
  order: readonly string[],
): string[] {
  const rank = new Map(order.map((name, index) => [name, index]))
  return [...base].sort((left, right) => {
    const leftRank = rank.get(left) ?? Number.POSITIVE_INFINITY
    const rightRank = rank.get(right) ?? Number.POSITIVE_INFINITY
    if (leftRank === rightRank) return base.indexOf(left) - base.indexOf(right)
    return leftRank - rightRank
  })
}

/** 把第 from 列移动到 to 位置（越界或原地返回原顺序副本）。 */
export function reorderBrands(
  base: readonly string[],
  from: number,
  to: number,
): string[] {
  const names = [...base]
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= names.length ||
    to >= names.length
  ) {
    return names
  }
  const [moved] = names.splice(from, 1)
  if (moved === undefined) return [...base]
  names.splice(to, 0, moved)
  return names
}

/**
 * 左移/右移一格。
 *
 * <p>拖动排序必须提供非拖动替代（WCAG 2.2 SC 2.5.7）：列头菜单里的「左移/右移」就是这个等价路径，
 * 触屏与键盘用户不必拖动。</p>
 */
export function shiftBrand(
  base: readonly string[],
  brand: string,
  delta: number,
): string[] {
  const index = base.indexOf(brand)
  if (index < 0) return [...base]
  return reorderBrands(base, index, index + delta)
}

/** 切换某列的显示/隐藏，返回新的隐藏集合。 */
export function toggleHidden(
  hidden: readonly string[],
  brand: string,
): string[] {
  return hidden.includes(brand)
    ? hidden.filter((name) => name !== brand)
    : [...hidden, brand]
}

/** 规格行关键字过滤：类别/材质/规格/定尺任一命中（忽略大小写与首尾空格）。 */
export function filterQuoteRows(
  rows: readonly QuoteRow[],
  keyword: string,
): QuoteRow[] {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return [...rows]
  return rows.filter((row) =>
    `${row.category} ${row.material} ${row.spec} ${row.length}`
      .toLowerCase()
      .includes(needle),
  )
}
