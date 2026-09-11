import type {
  Brand,
  PriceData,
  PriceRow,
  PriceSheet,
  SheetGroup,
  SheetInputs,
} from './types'

export const CATEGORIES = ['螺纹钢', '盘螺', '高线', '圆钢']
export const SPECS: Record<string, number[]> = {
  螺纹钢: [10, 12, 14, 16, 18, 20, 22, 25, 28, 32],
  盘螺: [6, 8, 10],
  高线: [6, 8, 10],
  圆钢: [12, 14, 16, 18, 20, 22, 25, 28, 32],
}
export const LENGTHS: Record<string, string[]> = {
  螺纹钢: ['9米', '12米'],
  盘螺: ['-'],
  高线: ['9米', '12米'],
  圆钢: ['9米', '12米'],
}

/** 归一化时段为 上午/中午/下午。 */
export function normalizePeriod(value: string): string {
  const matched = /(上午|中午|下午)\s*$/.exec((value ?? '').trim())
  return matched ? matched[1] : (value ?? '')
}

/** 商品类别规范化: 默认相等, 仅 螺纹钢 与 直条 视为同一类别。 */
export function canonicalCategory(value: string): string {
  return value === '直条' ? '螺纹钢' : value
}

export const dataKeyOf = (row: PriceRow) =>
  row.category && row.material
    ? `${canonicalCategory(row.category)}|${row.material}`
    : ''

/** 现货联动的商品键: 类别+材质+规格+长度 相同即视为同一商品。 */
export const productKeyOf = (row: PriceRow) =>
  row.category && row.material
    ? `${row.category}|${row.material}|${row.spec}|${row.length}`
    : ''

export function syncSpotInputs(
  rows: PriceRow[],
  inputs: SheetInputs,
  brandName: string,
  rowId: string,
  value: number | undefined,
): { inputs: SheetInputs; targets: PriceRow[] } {
  const source = rows.find((row) => row.id === rowId)
  if (!source) return { inputs, targets: [] }
  const key = productKeyOf(source)
  const targets = rows.filter(
    (row) => row.id === rowId || (key && productKeyOf(row) === key),
  )
  const next: SheetInputs = { ...inputs }
  for (const target of targets) {
    const inputKey = `${brandName}:${target.id}`
    next[inputKey] = { ...(next[inputKey] ?? {}), spot: value }
  }
  return { inputs: next, targets }
}

/** 12米加价生效的品种(业务规则) */
const LENGTH_PREMIUM_CATEGORIES = new Set(['螺纹钢'])
/** 现货价合理上限(元/吨), 超出提示 */
export const SPOT_PRICE_MAX = 20000
/** 默认 12 米加价(元/吨) */
export const DEFAULT_LENGTH_PREMIUM = 30

/** 单据表格固定列宽 */
export const SHEET_COLUMN_WIDTH = {
  category: 72,
  spec: 200,
  ton: 84,
  net: 74,
  spot: 72,
  diff: 60,
} as const

/** 网价: 参照日期+时段, 命中则返回并叠加 12 米加价。 */
export function netPrice(
  data: PriceData | null,
  refDate: string,
  refPeriod: string,
  brandName: string,
  row: PriceRow,
  lengthPremium: number,
): number | undefined {
  if (!data || row.spec === null || !row.material) return undefined
  const key = dataKeyOf(row)
  if (!key) return undefined
  const base =
    data[refDate]?.[refPeriod]?.[brandName]?.[key]?.[String(row.spec)]
  if (base === undefined) return undefined
  const premium =
    LENGTH_PREMIUM_CATEGORIES.has(canonicalCategory(row.category)) &&
    row.length === '12米'
      ? lengthPremium
      : 0
  return base + premium
}

/** HRB400 兜底材质 */
export const HRB400_FALLBACK_MATERIAL = 'HRB400E'

/**
 * 取网价: 若 HRB400 无价且开启兜底, 使用 HRB400E 价格并标记 fallback。
 */
export function netPriceWithFallback(
  data: PriceData | null,
  refDate: string,
  refPeriod: string,
  brandName: string,
  row: PriceRow,
  lengthPremium: number,
  allowFallback: boolean,
): { value: number | undefined; fallback: boolean } {
  const direct = netPrice(
    data,
    refDate,
    refPeriod,
    brandName,
    row,
    lengthPremium,
  )
  if (direct !== undefined) return { value: direct, fallback: false }
  if (allowFallback && row.material === 'HRB400') {
    const alt = netPrice(
      data,
      refDate,
      refPeriod,
      brandName,
      { ...row, material: HRB400_FALLBACK_MATERIAL },
      lengthPremium,
    )
    if (alt !== undefined) return { value: alt, fallback: true }
  }
  return { value: undefined, fallback: false }
}

/** 解析单据有效参照(为空时回退到数据源最新日期/首个时段)。 */
export function resolveRef(
  data: PriceData | null,
  sheet: Pick<PriceSheet, 'refDate' | 'refPeriod'>,
): { refDate: string; refPeriod: string } {
  let refDate = sheet.refDate
  if (!refDate) {
    for (const date of Object.keys(data ?? {})) {
      if (!refDate || date > refDate) refDate = date
    }
    refDate = refDate ?? ''
  }
  const periods = Object.keys(data?.[refDate] ?? {})
  const wanted = normalizePeriod(sheet.refPeriod)
  const refPeriod =
    wanted && periods.includes(wanted) ? wanted : (periods[0] ?? wanted ?? '')
  return { refDate, refPeriod }
}

export type SheetSummary = {
  filled: number
}

export function computeSummary(
  data: PriceData | null,
  sheet: PriceSheet,
  rows: PriceRow[],
  brands: Brand[],
  lengthPremium: number,
): SheetSummary {
  let filled = 0
  for (const row of rows) {
    for (const brand of brands) {
      const auto = netPrice(
        data,
        sheet.refDate,
        sheet.refPeriod,
        brand.name,
        row,
        lengthPremium,
      )
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (auto === undefined || spot === undefined) continue
      filled += 1
    }
  }
  return { filled }
}

/** 统计"有网价但未填现货"的数量, 用于标签页角标。 */
export function countMissing(
  data: PriceData | null,
  sheet: PriceSheet,
  rows: PriceRow[],
  brands: Brand[],
): number {
  let missing = 0
  for (const row of rows) {
    for (const brand of brands) {
      const auto = netPrice(
        data,
        sheet.refDate,
        sheet.refPeriod,
        brand.name,
        row,
        0,
      )
      if (auto === undefined) continue
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (spot === undefined) missing += 1
    }
  }
  return missing
}

/** 将 from 位置的元素移动到 to 位置(用于品牌列拖拽排序)。 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  )
    return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export type MaterialMatchLike = {
  brand?: string | null
  category?: string | null
  material?: string | null
  spec?: string | null
  status?: string | null
  quoteDate?: string | null
  period?: string | null
  basePrice?: string | number | null
}

/** 商品行情匹配结果 -> data[日期][时段][品牌][类别|材质][规格] = 网价(不含长度加价)。 */
export function matchesToData(rows: MaterialMatchLike[]): PriceData {
  const patch: PriceData = {}
  for (const row of rows) {
    if (row.status && row.status !== '匹配') continue
    if (
      !row.brand ||
      !row.category ||
      !row.material ||
      !row.spec ||
      !row.quoteDate ||
      !row.period ||
      row.basePrice === null ||
      row.basePrice === undefined
    )
      continue
    const category = canonicalCategory(row.category)
    const spec = String(Number(String(row.spec).replace(/[^0-9.]/g, '')))
    const price = Number(row.basePrice)
    if (!spec || Number.isNaN(price)) continue
    const key = `${category}|${row.material}`
    patch[row.quoteDate] ??= {}
    patch[row.quoteDate][row.period] ??= {}
    patch[row.quoteDate][row.period][row.brand] ??= {}
    patch[row.quoteDate][row.period][row.brand][key] ??= {}
    patch[row.quoteDate][row.period][row.brand][key][spec] = price
  }
  return patch
}

/** 深合并两份行情数据。 */
export function mergePriceData(base: PriceData, patch: PriceData): PriceData {
  const next: PriceData = { ...base }
  for (const [date, periods] of Object.entries(patch)) {
    next[date] = { ...(next[date] ?? {}) }
    for (const [period, brands] of Object.entries(periods)) {
      next[date][period] = { ...(next[date][period] ?? {}) }
      for (const [brand, keys] of Object.entries(brands)) {
        next[date][period][brand] = { ...(next[date][period][brand] ?? {}) }
        for (const [key, specs] of Object.entries(keys)) {
          next[date][period][brand][key] = {
            ...(next[date][period][brand][key] ?? {}),
            ...specs,
          }
        }
      }
    }
  }
  return next
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 8)
}

export function makeGroup(name: string): SheetGroup {
  return { id: makeId(), name }
}

export function makeRow(groupId: string): PriceRow {
  return {
    id: makeId(),
    groupId,
    category: '',
    material: '',
    spec: null,
    length: '',
  }
}

export const DEFAULT_STATUS = '报价'

/** 新建单据默认分组内的行数(均为空行, 由用户自行选择商品)。 */
const DEFAULT_ROW_COUNT = 1

export function defaultSheetRows(groupId: string): PriceRow[] {
  return Array.from({ length: DEFAULT_ROW_COUNT }, () => makeRow(groupId))
}

export function makeSheet(
  name: string,
  projectId: string,
  projectName: string,
  orderDate: string,
  refDate: string,
  refPeriod: string,
): PriceSheet {
  const group = makeGroup('分组 1')
  return {
    id: makeId(),
    name,
    status: DEFAULT_STATUS,
    projectId,
    projectName,
    orderDate,
    refDate,
    refPeriod,
    lengthPremium: DEFAULT_LENGTH_PREMIUM,
    inputs: {},
    groups: [group],
    rows: defaultSheetRows(group.id),
  }
}
