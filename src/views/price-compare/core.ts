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
  spec: 200,
  action: 34,
  ton: 54,
  net: 58,
  spot: 62,
  diff: 54,
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
  const premium =
    row.category === '螺纹钢' && row.length === '12米' ? lengthPremium : 0
  return base + premium
}

export type SheetSummary = {
  totalTon: number
  filled: number
}

export function computeSummary(
  data: PriceData | null,
  sheet: PriceSheet,
  rows: PriceRow[],
  brands: Brand[],
): SheetSummary {
  let totalTon = 0
  let filled = 0
  for (const row of rows) {
    const ton = sheet.inputs[`_:${row.id}`]?.ton
    if (!ton) continue
    totalTon += ton
    for (const brand of brands) {
      const auto = netPrice(
        data,
        sheet.refDate,
        sheet.refPeriod,
        brand.name,
        row,
        sheet.lengthPremium,
      )
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (auto === undefined || spot === undefined) continue
      filled += 1
    }
  }
  return { totalTon, filled }
}

/** 单个商品行在各品牌中的最优(差价最大)品牌, 无有效数据返回 undefined。 */
export function bestBrandOfRow(
  data: PriceData | null,
  sheet: PriceSheet,
  row: PriceRow,
  brands: Brand[],
): string | undefined {
  let best: string | undefined
  let bestDiff = Number.NEGATIVE_INFINITY
  for (const brand of brands) {
    const auto = netPrice(
      data,
      sheet.refDate,
      sheet.refPeriod,
      brand.name,
      row,
      sheet.lengthPremium,
    )
    const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
    if (auto === undefined || spot === undefined) continue
    const diff = auto - spot - brand.freight
    if (diff > bestDiff) {
      bestDiff = diff
      best = brand.name
    }
  }
  return best
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

export const DEFAULT_STATUS = '报价'

export function defaultSheetRows(): PriceRow[] {
  return [
    ...[12, 14, 16, 18, 20, 22, 25].map((spec) => ({
      ...makeRow('螺纹钢'),
      spec,
      length: '9米',
    })),
    ...[6, 8, 10].map((spec) => ({ ...makeRow('盘螺'), spec, length: '-' })),
  ]
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
    status: DEFAULT_STATUS,
    projectId,
    orderDate,
    refDate,
    refPeriod,
    lengthPremium: 30,
    locked: false,
    inputs: {},
    rows: defaultSheetRows(),
  }
}

/** 复制单据(新 ID, 名称追加“副本”)。 */
export function copySheet(sheet: PriceSheet): PriceSheet {
  return {
    ...structuredClone(sheet),
    id: Math.random().toString(36).slice(2, 8),
    name: `${sheet.name} 副本`,
    locked: false,
  }
}
