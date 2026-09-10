import type { Brand, GridRow, PriceData, PriceRow, PriceSheet } from './types'

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

export const dataKeyOf = (row: PriceRow) => `${row.category}|${row.material}`

/** 单据表格固定列宽 */
export const SHEET_COLUMN_WIDTH = {
  spec: 240,
  ton: 60,
  net: 62,
  spot: 66,
  diff: 58,
  action: 40,
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
  if (!data) return undefined
  const base =
    data[refDate]?.[refPeriod]?.[brandName]?.[dataKeyOf(row)]?.[
      String(row.spec)
    ]
  if (base === undefined) return undefined
  return base + (row.length === '12米' ? lengthPremium : 0)
}

export type SheetSummary = {
  totalTon: number
  amount: Record<string, number>
  filled: number
}

export function computeSummary(
  data: PriceData | null,
  sheet: PriceSheet,
  rows: PriceRow[],
  brands: Brand[],
  net: typeof netPrice = netPrice,
): SheetSummary {
  let totalTon = 0
  let filled = 0
  const amount: Record<string, number> = {}
  for (const row of rows) {
    const ton = sheet.inputs[`_:${row.id}`]?.ton
    if (!ton) continue
    totalTon += ton
    for (const brand of brands) {
      const auto = net(
        data,
        sheet.refDate,
        sheet.refPeriod,
        brand.name,
        row,
        sheet.lengthPremium,
      )
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (auto === undefined || spot === undefined) continue
      amount[brand.name] =
        (amount[brand.name] ?? 0) + (auto - spot - brand.freight) * ton
      filled += 1
    }
  }
  return { totalTon, amount, filled }
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
        sheet.lengthPremium,
      )
      if (auto === undefined) continue
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (spot === undefined) missing += 1
    }
  }
  return missing
}

/** 解析粘贴文本为现货价数组(取每行首个数值)。 */
export function parsePasteValues(text: string): number[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t/)[0].trim())
    .map((value) => Number(value.replace(/[^\d.-]/g, '')))
    .filter((value) => !Number.isNaN(value) && value > 0)
}

export function buildGridRows(rows: PriceRow[]): GridRow[] {
  const groups = new Map<string, GridRow>()
  for (const row of rows) {
    let group = groups.get(row.category)
    if (!group) {
      group = {
        key: `h:${row.category}`,
        isGroup: true,
        category: row.category,
        children: [],
      }
      groups.set(row.category, group)
    }
    group.children?.push({
      key: row.id,
      isGroup: false,
      category: row.category,
      rowId: row.id,
      row,
    })
  }
  return CATEGORIES.flatMap((category) => groups.get(category) ?? [])
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

export function makeRow(category = '螺纹钢'): PriceRow {
  return {
    id: Math.random().toString(36).slice(2, 8),
    category,
    material: 'HRB400E',
    spec: (SPECS[category] ?? [12])[0],
    length: (LENGTHS[category] ?? ['9米'])[0],
  }
}

export function makeSheet(
  name: string,
  projectId: string,
  orderDate: string,
  refDate: string,
  refPeriod: string,
): PriceSheet {
  return {
    id: Math.random().toString(36).slice(2, 8),
    name,
    projectId,
    orderDate,
    refDate,
    refPeriod,
    lengthPremium: 30,
    locked: false,
    inputs: {},
  }
}
