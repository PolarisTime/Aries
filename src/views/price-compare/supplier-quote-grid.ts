import type { QuoteRow } from './supplier-price-list-model'

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

/** 一行规格：定尺收进格子里（同一规格的 9米/12米 是同一行的两个价格）。 */
export type SpecRow = {
  category: string
  material: string
  spec: number
  /** 该规格在商品资料里存在的定尺，已按报价单习惯排序（9米 → 12米 → 无定尺）。 */
  lengths: string[]
}

/** 规格行键：类别|材质|规格（**不含定尺**）。 */
export const specRowKey = (row: SpecRow): string =>
  `${row.category}|${row.material}|${row.spec}`

/**
 * 定尺排序：报价单里 9米 在左、12米 在右，无定尺（"" 或 "-"）排最后。
 *
 * <p>定尺是「同一规格的两个价格维度」，不是两个规格——因此不能按字符串排序
 * （"12米" < "9米" 会颠倒），也不能让 "-" 混在中间。</p>
 */
export function lengthRank(length: string): number {
  if (length === '9米') return 0
  if (length === '12米') return 1
  if (length === '') return 90
  if (length === '-') return 91
  const numeric = Number(length.replace(/[^\d.]/g, ''))
  return Number.isFinite(numeric) ? 10 + numeric : 50
}

/** 网格里出现的全部定尺（去重 + 排序）。 */
export function orderedLengths(rows: readonly QuoteRow[]): string[] {
  return [...new Set(rows.map((row) => row.length))].sort(
    (left, right) => lengthRank(left) - lengthRank(right),
  )
}

/** 把「一个定尺一行」的原始行合并成「一个规格一行、定尺在格子里」。 */
export function groupSpecRows(rows: readonly QuoteRow[]): SpecRow[] {
  const grouped = new Map<string, SpecRow>()
  for (const row of rows) {
    const key = `${row.category}|${row.material}|${row.spec}`
    const existing = grouped.get(key)
    if (existing) {
      if (!existing.lengths.includes(row.length)) {
        existing.lengths.push(row.length)
      }
    } else {
      grouped.set(key, {
        category: row.category,
        material: row.material,
        spec: row.spec,
        lengths: [row.length],
      })
    }
  }
  const result = [...grouped.values()]
  for (const row of result) {
    row.lengths.sort((left, right) => lengthRank(left) - lengthRank(right))
  }
  return result.sort(
    (left, right) =>
      left.category.localeCompare(right.category) ||
      left.material.localeCompare(right.material) ||
      left.spec - right.spec,
  )
}

/** 规格行关键字过滤：类别/材质/规格任一命中（忽略大小写与首尾空格）。 */
export function filterSpecRows(
  rows: readonly SpecRow[],
  keyword: string,
): SpecRow[] {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return [...rows]
  return rows.filter((row) =>
    `${row.category} ${row.material} ${row.spec}`
      .toLowerCase()
      .includes(needle),
  )
}

/** 粘贴的「格位」= 品牌 × 定尺。 */
export type QuoteSlot = {
  brandName: string
  length: string
}

/** 按「品牌 → 定尺」顺序展开成格位列表（与界面 DOM 顺序一致）。 */
export function buildSlots(
  brandNames: readonly string[],
  lengths: readonly string[],
): QuoteSlot[] {
  return brandNames.flatMap((brandName) =>
    lengths.map((length) => ({ brandName, length })),
  )
}

/**
 * 把粘贴矩阵从锚点铺开：行 → 规格行，列 → 格位（品牌 × 定尺）。
 *
 * <p>锚点是当前聚焦的输入框（某品牌某定尺），矩阵第一格覆盖它；列向右依次落到
 * 同品牌的其它定尺 / 下一个品牌，行向下落到后面的规格行。目标行没有该定尺时丢弃该格。</p>
 */
export function buildSpecPastePlan(args: {
  matrix: readonly (readonly string[])[]
  slots: readonly QuoteSlot[]
  specRows: readonly SpecRow[]
  startSlotIndex: number
  startRowIndex: number
}): GridPastePlan {
  const cells: GridPasteCell[] = []
  let dropped = 0

  args.matrix.forEach((line, rowOffset) => {
    const specRow = args.specRows[args.startRowIndex + rowOffset]
    if (!specRow) {
      dropped += line.length
      return
    }
    line.forEach((raw, columnOffset) => {
      const slot = args.slots[args.startSlotIndex + columnOffset]
      if (!slot || !specRow.lengths.includes(slot.length)) {
        dropped += 1
        return
      }
      const value = parseGridPrice(raw)
      if (value === undefined) {
        dropped += 1
        return
      }
      cells.push({
        brandName: slot.brandName,
        rowKey: `${specRow.category}|${specRow.material}|${specRow.spec}|${slot.length}`,
        value,
      })
    })
  })

  return { cells, dropped }
}

/** 规格行 + 定尺 → 后端条目键（与 supplier-price-list-model 的行键同构）。 */
export function rowKeyOfCell(specRow: SpecRow, length: string): string {
  return `${specRow.category}|${specRow.material}|${specRow.spec}|${length}`
}

export const SHEET_COLUMN_WIDTH = {
  index: 52,
  category: 96,
  material: 110,
  specNo: 80,
  brand: 170,
} as const

/** 网格总宽：固定列（序号/类别/材质/规格） + 品牌列 × 品牌数（至少 1 列，空表不塌）。 */
export function sheetWidthOf(brandCount: number): number {
  const { index, category, material, specNo, brand } = SHEET_COLUMN_WIDTH
  return index + category + material + specNo + Math.max(brandCount, 1) * brand
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

/** 基价规则项（与后端/API 同构，避免 grid 模块依赖 api 层）。 */
export type BaseRuleItem = {
  material: string
  spec: number
  length: string
  delta: number
}

/** 基价规格引用。 */
export type BaseRuleRef = {
  material: string
  spec: number
  length: string
}

/** 规则键：材质|规格|定尺（不含类别，与后端规则项键一致）。 */
export const ruleKeyOfRef = (ref: BaseRuleRef): string =>
  `${ref.material}|${ref.spec}|${ref.length}`

/**
 * 按「基价 + 加价」计算应自动填入的空格。
 *
 * <p>只填空格子（`isFilled` 为 false 且规则里配了该规格），不覆盖业务员手工价；
 * 结果价格必须为正数，否则跳过（负价没有业务含义）。</p>
 */
export function buildBasePriceFillPlan(args: {
  base: BaseRuleRef
  basePrice: number
  items: readonly BaseRuleItem[]
  specRows: readonly SpecRow[]
  isFilled: (rowKey: string) => boolean
}): { rowKey: string; value: number }[] {
  if (!(args.basePrice > 0)) return []
  const baseKey = ruleKeyOfRef(args.base)
  const deltas = new Map<string, number>()
  for (const item of args.items) {
    deltas.set(ruleKeyOfRef(item), item.delta)
  }
  const result: { rowKey: string; value: number }[] = []
  for (const specRow of args.specRows) {
    for (const length of specRow.lengths) {
      const ref: BaseRuleRef = {
        material: specRow.material,
        spec: specRow.spec,
        length,
      }
      const ruleKey = ruleKeyOfRef(ref)
      if (ruleKey === baseKey) continue
      const delta = deltas.get(ruleKey)
      if (delta === undefined) continue
      // 草稿键必须带类别（与后端条目键一致），规则键只按 材质|规格|定尺 匹配
      const rowKey = rowKeyOfCell(specRow, length)
      if (args.isFilled(rowKey)) continue
      const value = args.basePrice + delta
      if (!(value > 0)) continue
      result.push({ rowKey, value })
    }
  }
  return result
}
