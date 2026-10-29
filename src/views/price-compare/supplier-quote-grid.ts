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

/**
 * 金额四舍五入到「分」—— **唯一出口**。
 *
 * <p>为什么要有它：输入框不再用 `precision={2}`（那会把 3350 显示成 `3350.00`，
 * 一列铺满 `.00` 既噪声又撑宽），所以小数位改由这里收敛：手录 `3350.555` 落库成 3350.56，
 * 整数仍原样显示（不带 `.00`），一列 5 位数放得下。</p>
 */
export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100
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

/**
 * 是否是**可展示的定尺列**。
 *
 * <p>`''` 与 `'-'` 在商品资料里表示"该规格没有定尺"（如盘螺是卷材，不分 9米/12米），
 * 它们不是一种定尺，不该占一列表头（旧实现会多出一个「不分定尺」列，用户反馈"没有这种东西"）。
 * 这类行的价格只有一格，渲染时横跨所有定尺列。</p>
 */
export function isLengthColumn(length: string): boolean {
  return length !== '' && length !== '-'
}

/** 网格里出现的全部定尺（去重 + 排序）。 */
export function orderedLengths(rows: readonly QuoteRow[]): string[] {
  return [...new Set(rows.map((row) => row.length))].sort(
    (left, right) => lengthRank(left) - lengthRank(right),
  )
}

/**
 * 类别分组顺序：盘螺单独一组放最前，螺纹(直条)在后，其余类别再靠后。
 *
 * <p>报价单的阅读习惯是「先盘螺、再螺纹」，而且螺纹要按材质分成 HRB400 / HRB400E 两组
 * （见 {@link materialRankOf}）——所以类别是**粗分组**、材质是**细分组**，规格在组内按数值升序。</p>
 */
const CATEGORY_ORDER = ['盘螺', '直条', '螺纹', '高线']

export function categoryRankOf(category: string): number {
  const index = CATEGORY_ORDER.indexOf((category ?? '').trim())
  return index >= 0 ? index : 50
}

/** 材质分组顺序：HRB400 → HRB400E → HPB300 → 其它（组内仍按规格数值排序）。 */
const MATERIAL_ORDER = ['HRB400', 'HRB400E', 'HPB300']

export function materialRankOf(material: string): number {
  const index = MATERIAL_ORDER.indexOf((material ?? '').trim().toUpperCase())
  return index >= 0 ? index : 50
}

/**
 * 分组展示用的合并跨度：类别按连续同类合并、材质按「类别+材质」连续合并，
 * 并在每个组的第一行标 `groupStart`（表格用它画一条更粗的分隔线）。
 */
export type SpecRowGroupSpan = {
  categorySpan: number
  materialSpan: number
  groupStart: boolean
}

/** 计算 {@link groupSpecRows} 结果的合并跨度（入参必须是已排好序的行）。 */
export function specRowGroupSpans(
  rows: readonly SpecRow[],
): Map<string, SpecRowGroupSpan> {
  const spans = new Map<string, SpecRowGroupSpan>()
  let index = 0
  while (index < rows.length) {
    const category = rows[index].category
    let categoryEnd = index
    while (
      categoryEnd + 1 < rows.length &&
      rows[categoryEnd + 1].category === category
    ) {
      categoryEnd += 1
    }
    const categorySpan = categoryEnd - index + 1
    let cursor = index
    let firstOfCategory = true
    while (cursor <= categoryEnd) {
      const material = rows[cursor].material
      let materialEnd = cursor
      while (
        materialEnd + 1 <= categoryEnd &&
        rows[materialEnd + 1].material === material
      ) {
        materialEnd += 1
      }
      for (let rowIndex = cursor; rowIndex <= materialEnd; rowIndex += 1) {
        spans.set(specRowKey(rows[rowIndex]), {
          categorySpan: rowIndex === index ? categorySpan : 0,
          materialSpan: rowIndex === cursor ? materialEnd - cursor + 1 : 0,
          groupStart: firstOfCategory && rowIndex === cursor,
        })
      }
      firstOfCategory = false
      cursor = materialEnd + 1
    }
    index = categoryEnd + 1
  }
  return spans
}

/** 真正的定尺列（9米/12米…），已按报价单习惯排序。 */
export function columnLengths(rows: readonly QuoteRow[]): string[] {
  return orderedLengths(rows).filter(isLengthColumn)
}

/** 该规格行没有定尺维度（盘螺一类）：价格只需要一格。 */
export function hasNoLength(row: SpecRow): boolean {
  return !row.lengths.some(isLengthColumn)
}

/**
 * 某规格行落格用的定尺值：有定尺取第一个真实定尺；没有定尺就取它自己的占位值（`''`/`'-'`），
 * 保证这类行仍然能算出与后端条目一致的 rowKey。
 */
export function placementLengthOf(row: SpecRow): string {
  return row.lengths.find(isLengthColumn) ?? row.lengths[0] ?? ''
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
      categoryRankOf(left.category) - categoryRankOf(right.category) ||
      materialRankOf(left.material) - materialRankOf(right.material) ||
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
    // 无定尺行（盘螺一类）只有一格：矩阵第一列落到它的占位定尺上，其余列无处可落
    const noLength = hasNoLength(specRow)
    const placementLength = placementLengthOf(specRow)
    line.forEach((raw, columnOffset) => {
      const slot = args.slots[args.startSlotIndex + columnOffset]
      if (!slot) {
        dropped += 1
        return
      }
      if (noLength) {
        if (columnOffset > 0) {
          dropped += 1
          return
        }
      } else if (!specRow.lengths.includes(slot.length)) {
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
        rowKey: `${specRow.category}|${specRow.material}|${specRow.spec}|${
          noLength ? placementLength : slot.length
        }`,
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
  /**
   * 单个定尺列（9米 / 12米）的宽度：刚好放得下 **5 位数** 的金额。
   *
   * <p>原来是 96px（按 6 位数 + 两位小数留的余量）。去掉 `.00` 后实测：5 位数文本约 52px，
   * 加上单元格内边距 8.4 + 输入框内边距 7 + 边框，列宽 76px 正好不裁字
   * （64px 实测会裁掉第 5 位）。</p>
   */
  lengthCell: 76,
  /** 规格横置视图里「材质 / 规格」标签列的宽度。 */
  labelCell: 96,
  brand: 170,
} as const

/**
 * 网格总宽：固定列（序号/类别/材质/规格） + 品牌数 × 定尺数 × 单定尺列宽。
 *
 * <p>品牌列不再是"一格塞 9米/12米 两行"，而是按定尺拆成两列，所以宽度要乘定尺数。</p>
 */
export function sheetWidthOf(brandCount: number, lengthCount = 1): number {
  const { index, category, material, specNo, lengthCell } = SHEET_COLUMN_WIDTH
  return (
    index +
    category +
    material +
    specNo +
    Math.max(brandCount, 1) * Math.max(lengthCount, 1) * lengthCell
  )
}

/** 品牌列的显示偏好：顺序 + 隐藏集合（按供应商存到 localStorage）。 */
export type BrandPrefs = {
  order: string[]
  hidden: string[]
  /** 隐藏的定尺列（9米/12米…）：有些供应商只报其中一种定尺。 */
  hiddenLengths: string[]
}

const EMPTY_PREFS: BrandPrefs = { order: [], hidden: [], hiddenLengths: [] }

/** 解析本地保存的偏好；任何脏数据都退化为「默认顺序、不隐藏」，不影响打开页面。 */
export function parseBrandPrefs(raw: string | null): BrandPrefs {
  if (!raw) return { ...EMPTY_PREFS }
  try {
    const value = JSON.parse(raw) as {
      order?: unknown
      hidden?: unknown
      hiddenLengths?: unknown
    }
    const strings = (input: unknown): string[] =>
      Array.isArray(input)
        ? input.filter((item): item is string => typeof item === 'string')
        : []
    return {
      order: strings(value.order),
      hidden: strings(value.hidden),
      // 老数据没有这个字段 → 空集合（全部定尺列显示）
      hiddenLengths: strings(value.hiddenLengths),
    }
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

/**
 * 「基价模式」下整列的应有价格: 基价 + 各规格加价。
 *
 * <p>与 {@link buildBasePriceFillPlan}（只补空格）不同，这里返回**全部已配置规格**的价 ——
 * 基价模式就是"以基价为准重新算一遍"，不再看格子里原来有什么值。
 * 基价行本身不返回（它就是输入源）。</p>
 */
export function buildBasePriceColumnPrices(args: {
  base: BaseRuleRef
  basePrice: number
  items: readonly BaseRuleItem[]
  specRows: readonly SpecRow[]
}): Map<string, number> {
  const plan = buildBasePriceFillPlan({
    ...args,
    // 基价模式要覆盖整列，因此"已填"一律视为未填
    isFilled: () => false,
  })
  return new Map(plan.map((cell) => [cell.rowKey, cell.value]))
}
