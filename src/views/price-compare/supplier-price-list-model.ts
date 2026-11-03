import type {
  SupplierPriceCellInput,
  SupplierPriceColumn,
  SupplierPriceGrid,
  SupplierPriceRow,
  SupplierPriceSpecRow,
} from '@/api/market/supplier-price-lists'

/** 一行 = 一个商品规格；键与后端条目键同构（类别|材质|规格|定尺）。 */
export type QuoteRow = SupplierPriceSpecRow

export const quoteRowKey = (row: QuoteRow): string =>
  `${row.category}|${row.material}|${row.spec}|${row.length}`

/**
 * 一个品牌列的草稿：`rowKey → 价格`。
 *
 * <p>三种状态必须分开，否则「清空一个格子」会保存不了：</p>
 * <ul>
 *   <li>键存在且为数字：本页改成这个价；</li>
 *   <li>键存在且为 <b>null</b>：本页明确清空（保存时该行省略，服务端整组替换即删除条目）；</li>
 *   <li>键不存在：未改动，沿用服务端值。</li>
 * </ul>
 *
 * <p>历史实现把「清空」做成删键，于是渲染时又回落到服务端价格 —— 界面上看不出、保存也清不掉。
 * 因此这里用显式 `null` 表达清空，并由 {@link buildColumnSavePlan} 负责落库。</p>
 */
export type BrandDraft = Record<string, number | null>

/** 服务端某一格的报价与附加字段（状态/备注要原样带回去，见 buildColumnSavePlan）。 */
export type ServerCell = {
  price: number
  priceStatus?: string
  remark?: string
}

/** 一个品牌列的保存计划；`column === null` 表示该品牌下这家供应商还没有价格表，保存时先建列。 */
export type ColumnSavePlan = {
  brandName: string
  column: SupplierPriceColumn | null
  items: SupplierPriceCellInput[]
}

/** 当前应显示的价格：草稿优先（含清空），否则服务端，最后为 null（空格子）。 */
export function draftPrice(
  draft: BrandDraft | undefined,
  rowKey: string,
  serverPrice: number | undefined,
): number | null {
  if (draft && rowKey in draft) {
    const value = draft[rowKey]
    return value === null || value === undefined ? null : value
  }
  return serverPrice === undefined ? null : serverPrice
}

/** 写入一格（`null` = 清空）。返回新草稿，不修改入参。 */
export function setDraftPrice(
  draft: BrandDraft | undefined,
  rowKey: string,
  price: number | null,
): BrandDraft {
  return { ...(draft ?? {}), [rowKey]: price }
}

/** 撤销一格的改动，回到服务端值。 */
export function revertDraftPrice(
  draft: BrandDraft | undefined,
  rowKey: string,
): BrandDraft {
  if (!draft || !(rowKey in draft)) return draft ?? {}
  const next = { ...draft }
  delete next[rowKey]
  return next
}

/** 该列有几处未保存改动。 */
export function draftCount(draft: BrandDraft | undefined): number {
  return draft ? Object.keys(draft).length : 0
}

/**
 * 从品牌网格里取出「该供应商这一列」的服务端数据：`rowKey → {price,status,remark}`。
 *
 * <p>网格行的 `prices` 是 `listId → 价格` 的稀疏表：缺少某列键 = 该供应商不报这个规格。
 * 这里只收敛本列，避免页面每格都做一次 `rows.find`（行数上百时会退化成 O(行²)）。</p>
 */
export function serverCellsOf(
  grid: SupplierPriceGrid | undefined,
  column: SupplierPriceColumn | null,
): Map<string, ServerCell> {
  const cells = new Map<string, ServerCell>()
  if (!column) return cells
  for (const row of grid?.rows ?? []) {
    const price = row.prices[column.listId]
    if (typeof price !== 'number') continue
    const priceStatus = row.priceStatuses[column.listId]
    const remark = row.remarks[column.listId]
    cells.set(quoteRowKey(row), {
      price,
      ...(priceStatus ? { priceStatus } : {}),
      ...(remark ? { remark } : {}),
    })
  }
  return cells
}

/**
 * 报价表的行：**只取自商品资料**（`GET /materials?status=正常`）。
 *
 * <p>商品资料里同一条「类别|材质|规格|定尺」可能有多条重复记录（同一商品被反复录入），这里按该键
 * 合并成一行并按 类别/材质/规格/定尺 排序 —— 表里一行 = 一个商品组合，只出现一次。</p>
 *
 * <p><b>历史价格表不参与建行</b>：品牌网格（`GET /supplier-price-lists/grid`）的行只用于给已存在的
 * 行回填价格（见 {@link serverCellsOf}）。商品被停用/删除后，它的旧报价不再出现在表里（否则会出现
 * 「只有一格能填、其余全是 —」的残行）；那些价格仍随保存原样提交，见 {@link buildColumnSavePlan}。</p>
 */
export function mergeQuoteRows(
  rows: readonly (QuoteRow | SupplierPriceRow)[],
): QuoteRow[] {
  const merged = new Map<string, QuoteRow>()
  for (const row of rows) {
    const normalized: QuoteRow = {
      category: row.category,
      material: row.material,
      spec: row.spec,
      length: row.length,
    }
    const key = quoteRowKey(normalized)
    if (!merged.has(key)) merged.set(key, normalized)
  }
  return [...merged.values()].sort(compareQuoteRows)
}

/** 行序：类别 → 材质 → 规格 → 定尺。表格行序与保存条目序共用这一处，避免两处各排一遍。 */
export function compareQuoteRows(left: QuoteRow, right: QuoteRow): number {
  return (
    left.category.localeCompare(right.category) ||
    left.material.localeCompare(right.material) ||
    left.spec - right.spec ||
    left.length.localeCompare(right.length)
  )
}

/**
 * 把保存条目键（`类别|材质|规格|定尺`）解析回行。
 *
 * <p>「商品资料里已经没有、但该列还存着价格」的历史行只能从 {@link ServerCell} 的键还原；
 * 规格口径与商品资料一致（正整数），解析不出来的键丢弃 —— 宁可少一条条目，也不造非法商品组合。</p>
 */
export function quoteRowFromKey(key: string): QuoteRow | null {
  const [category, material, specText, ...rest] = key.split('|')
  if (category === undefined || material === undefined) return null
  const spec = Number(specText)
  if (!Number.isInteger(spec) || spec <= 0) return null
  return { category, material, spec, length: rest.join('|') }
}

/**
 * 品牌列的显示顺序与集合。
 *
 * <p>三段来源合并（同名只出现一次，靠前者在前）：</p>
 * <ol>
 *   <li>{@code declared}：供应商资料里维护的「经营品牌」—— 录入主路径；</li>
 *   <li>{@code discover}：商品品牌全集，用于**发现历史数据**（经营品牌没维护、但价格表已存在的品牌
 *       不能藏起来，否则那些报价永远无法维护）；</li>
 *   <li>{@code extra}：用户本次手动追加的品牌。</li>
 * </ol>
 */
export function brandColumnOrder(args: {
  declared: readonly string[]
  discover: readonly string[]
  extra: readonly string[]
}): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const brand of [...args.declared, ...args.discover, ...args.extra]) {
    const name = brand.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    ordered.push(name)
  }
  return ordered
}

/**
 * 生成某一品牌列的保存计划；无改动返回 null。
 *
 * <p><b>条目集合 = 可见行 ∪ 服务端已有条目</b>（不是 `rows` 单侧）。保存接口是
 * `PUT .../items` 的**整列替换**：只提交 `rows` 会把「商品资料里已停用/删除、但该列还存着价格」
 * 的历史行从服务端删掉 —— 那是静默数据丢失。历史行只能从 {@link ServerCell} 的键还原成行。</p>
 *
 * <p>四条硬性规则：</p>
 * <ol>
 *   <li><b>只提交价格非空的条目</b>：服务端按整组替换处理，「清空」= 省略该行；</li>
 *   <li><b>原样带回状态与备注</b>：接口未在编辑器里暴露这两项，若不回传，服务端会把
 *       「无货/待定/搭配」重置成 NORMAL、备注清空 —— 那是静默数据丢失；</li>
 *   <li><b>历史行即使不在可见行里也必须提交</b>（见上）；</li>
 *   <li><b>新列且一个价都没有时不建列</b>：避免留下空价格表。</li>
 * </ol>
 */
export function buildColumnSavePlan(args: {
  brandName: string
  column: SupplierPriceColumn | null
  rows: readonly QuoteRow[]
  draft: BrandDraft | undefined
  serverCells: ReadonlyMap<string, ServerCell>
}): ColumnSavePlan | null {
  if (draftCount(args.draft) === 0) return null

  /*
   * 先按「可见行」定基调，再把服务端有、可见行没有的历史条目补进来。
   * 用 Map 而不是数组拼接：同一键只留一份（可见行与历史行重叠时以可见行为准，两者内容相同）。
   */
  const rowsByKey = new Map<string, QuoteRow>()
  for (const row of args.rows) rowsByKey.set(quoteRowKey(row), row)
  for (const key of args.serverCells.keys()) {
    if (rowsByKey.has(key)) continue
    const row = quoteRowFromKey(key)
    if (row) rowsByKey.set(key, row)
  }

  const draft = args.draft ?? {}
  const items: SupplierPriceCellInput[] = []
  for (const [key, row] of rowsByKey) {
    const server = args.serverCells.get(key)
    const price = key in draft ? draft[key] : server?.price
    if (price === null || price === undefined) continue
    items.push({
      category: row.category,
      material: row.material,
      spec: row.spec,
      length: row.length,
      price,
      ...(server?.priceStatus ? { priceStatus: server.priceStatus } : {}),
      ...(server?.remark ? { remark: server.remark } : {}),
    })
  }

  if (!args.column && items.length === 0) return null
  return { brandName: args.brandName, column: args.column, items }
}
