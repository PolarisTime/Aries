import {
  normalizePriceItemStatus,
  normalizeSpecNumber,
  type PriceAdjustmentMode,
  type SupplierPriceItemStatus,
  type SupplierPriceListItem,
  type SupplierPriceListItemPayload,
  type SupplierPriceListSummary,
  type SupplierPriceSpecCatalogEntry,
} from '@/api/master/supplier-price-lists'
import type { EntityId } from '@/types/entity-id'

/** 规格归一化实现与 API 层同源，避免两处归一化口径漂移。 */
export { normalizeSpecNumber }

/**
 * 供应商品牌价格表矩阵编辑器的纯逻辑。
 *
 * <p>设计口径（见 `.local/design/supplier-price-list.md` §4.6 修订 R2）：</p>
 * - **取消版本**：一个（供应商 + 品牌）只有一张表，表头不再有发布时刻/生效区间/状态；
 * - **行** = 规格全集固定行 `类别 / 材质 / 规格(直径) / 长度`（只读，不自由增行）；
 * - **列** = 每个品牌一列，列内只填「单价」；单元格留空 = 不报价（`null`，绝不写 0）；
 * - 没有任何批量操作（整表加减 / TSV 粘贴）可以把空价写成 0。
 *
 * <p>本模块不依赖 React，便于单测覆盖边界。</p>
 */

/** 状态枚举 → i18n key（R2 维护页不展示状态，但仍需保留服务端语义）。 */
export const PRICE_ITEM_STATUS_I18N_KEYS: Record<
  SupplierPriceItemStatus,
  string
> = {
  NORMAL: 'supplierPriceList.itemStatus.normal',
  PENDING: 'supplierPriceList.itemStatus.pending',
  BUNDLED: 'supplierPriceList.itemStatus.bundled',
  NEGOTIABLE: 'supplierPriceList.itemStatus.negotiable',
  OUT_OF_STOCK: 'supplierPriceList.itemStatus.outOfStock',
}

/** 状态枚举的契约中文（测试用于与语言包比对，防止中英文案漂移）。 */
export const PRICE_ITEM_STATUS_ZH_LABELS: Record<
  SupplierPriceItemStatus,
  string
> = {
  NORMAL: '正常',
  PENDING: '在途待卸',
  BUNDLED: '搭配',
  NEGOTIABLE: '价格单议',
  OUT_OF_STOCK: '无货',
}

export const PRICE_ITEM_STATUS_ORDER: SupplierPriceItemStatus[] = [
  'NORMAL',
  'PENDING',
  'BUNDLED',
  'NEGOTIABLE',
  'OUT_OF_STOCK',
]

const KEY_SEPARATOR = '\u0000'
const EMPTY_KEY_SEPARATOR = '|'

/** 文本归一化：去首尾空白（材质/长度按去空白后的字面量作为键的一部分）。 */
function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 条目归一化键；spec 无法归一化为正整数时返回 null（视为脏数据，不参与匹配）。 */
export function buildPriceRowKey(input: {
  category?: unknown
  material?: unknown
  spec?: unknown
  length?: unknown
}): string | null {
  const spec = normalizeSpecNumber(input.spec)
  if (spec === null) {
    return null
  }
  return [
    normalizeText(input.category),
    normalizeText(input.material),
    String(spec),
    normalizeText(input.length),
  ].join(KEY_SEPARATOR)
}

/** 仅按材质 + 规格 + 长度的次级索引键（4 列 TSV 粘贴无类别时用）。 */
function buildMaterialSpecLengthKey(input: {
  material?: unknown
  spec?: unknown
  length?: unknown
}): string | null {
  const spec = normalizeSpecNumber(input.spec)
  if (spec === null) {
    return null
  }
  return [
    normalizeText(input.material),
    String(spec),
    normalizeText(input.length),
  ].join(EMPTY_KEY_SEPARATOR)
}

/** 行的人类可读标识（预览/错误提示用），如 `螺纹钢 抗震钢E Φ12 9米`。 */
export function describePriceRow(row: {
  category: string
  material: string
  spec: number
  length: string
}): string {
  return [row.category, row.material, `Φ${row.spec}`, row.length]
    .filter(Boolean)
    .join(' ')
}

/* ------------------------------------------------------------ 矩阵结构 */

/** 矩阵固定行：规格全集里的定位列（只读）。 */
export type PriceMatrixRow = {
  /**
   * 表格行身份。
   *
   * <p>规格全集理论上不应有重复键，但若后端返回重复，`key` 会相同；表格 rowKey 必须用
   * uid 才能保证每行独立（否则 React key 冲突、错误互相覆盖）。</p>
   */
  uid: string
  /** 归一化条目键（category + material + spec + length），用于匹配与加减留痕 */
  key: string
  category: string
  material: string
  spec: number
  length: string
  sortOrder: number
}

/** 某个品牌列的状态（`listId` 为空 = 该品牌尚无价格表，首次填价时才建表）。 */
export type PriceMatrixListInfo = {
  brandName: string
  listId: EntityId | null
  /** 列表返回的更新时间（无表时为空串） */
  updatedAt: string
  /** 由「列表 / 建表」响应的 itemCount 带出，仅作展示 */
  itemCount: number
}

/** 单个（品牌, 行）单元格。 */
export type PriceMatrixCell = {
  /** `null` = 不报价；`0` = 真实的 0 元 */
  price: number | null
  /** 服务端条目 ID；仅存在于「从服务端带出的条目」上 */
  itemId?: EntityId
  /** 服务端条目的状态/备注：维护页不编辑，但 PUT 全量替换时必须原样带回 */
  priceStatus: SupplierPriceItemStatus
  remark: string | null
}

/**
 * 矩阵编辑器状态。
 *
 * <p>刻意把行（规格全集）与单元格（品牌×行）分开：规格全集数百行 × 多品牌时，
 * 逐行 per-brand 对象会让行渲染依赖整个品牌映射，列内录入的状态更新成本高且不易做
 * 脏值对比。</p>
 */
export type PriceMatrixState = {
  rows: PriceMatrixRow[]
  /** brandName → 列信息 */
  lists: Record<string, PriceMatrixListInfo>
  /** brandName → 行键 → 单元格 */
  cells: Record<string, Record<string, PriceMatrixCell>>
  /** 列顺序（品牌列展示顺序；新增品牌列追加到末尾） */
  brandOrder: string[]
  /** 规格全集内 spec 无法归一化的脏行数 */
  invalidCatalogCount: number
}

export type BuildMatrixOptions = {
  catalog: SupplierPriceSpecCatalogEntry[]
  /** 当前供应商的（供应商, 品牌）现表摘要 */
  lists: SupplierPriceListSummary[]
  /** 该供应商经营品牌（`md_supplier_brand`，经供应商选项接口带出） */
  supplierBrands?: string[]
  /** 显式追加的品牌列（手输品牌；允许尚无价格表） */
  extraBrands?: string[]
}

function emptyCell(): PriceMatrixCell {
  return { price: null, priceStatus: 'NORMAL', remark: null }
}

function upsertRowKey(map: Record<string, number>, key: string, index: number) {
  if (!(key in map)) {
    map[key] = index
  }
}

/**
 * 由规格全集 + 现表构建矩阵。
 *
 * <p>列来源 = 已有价格表的品牌（按后端返回顺序）∪ 该供应商经营品牌 ∪ 手工追加品牌；
 * 顺序上已有价格表在前（有数据优先可见），其余品牌追加在后。有价格表的品牌会按归一化
 * 条目键带出单价、状态、备注与条目 ID；规格全集外的历史条目既不显示也不在此丢弃，
 * 由 {@link PriceMatrixState} 的使用方通过 `PUT` 全量替换时的条目集合守卫（见
 * `buildReplaceItems`）保证不被静默删除。</p>
 */
export function buildMatrixState(
  options: BuildMatrixOptions,
): PriceMatrixState {
  const { catalog, lists } = options
  const rows: PriceMatrixRow[] = []
  const keyToRowIndex: Record<string, number> = {}
  const materialSpecLengthIndexes: Record<string, number[]> = {}
  let invalidCatalogCount = 0

  for (const entry of catalog) {
    const key = buildPriceRowKey(entry)
    if (!key) {
      invalidCatalogCount += 1
      continue
    }
    // 归一化后重复的键只保留第一行（与后端去重口径一致）
    if (key in keyToRowIndex) {
      continue
    }
    const spec = normalizeSpecNumber(entry.spec)
    if (spec === null) {
      invalidCatalogCount += 1
      continue
    }
    const material = normalizeText(entry.material)
    const length = normalizeText(entry.length)
    const row: PriceMatrixRow = {
      uid: `${key}#${rows.length}`,
      key,
      category: normalizeText(entry.category),
      material,
      spec,
      length,
      sortOrder: Number.isFinite(entry.sortOrder)
        ? entry.sortOrder
        : rows.length,
    }
    upsertRowKey(keyToRowIndex, key, rows.length)
    const secondary = buildMaterialSpecLengthKey({ material, spec, length })
    if (secondary) {
      const bucket = materialSpecLengthIndexes[secondary] ?? []
      bucket.push(rows.length)
      materialSpecLengthIndexes[secondary] = bucket
    }
    rows.push(row)
  }

  const brandOrder: string[] = []
  const listsByBrand: Record<string, PriceMatrixListInfo> = {}
  for (const list of lists) {
    const brand = normalizeText(list.brandName)
    if (!brand || listsByBrand[brand]) {
      continue
    }
    listsByBrand[brand] = {
      brandName: brand,
      listId: list.id,
      updatedAt: list.updatedAt,
      itemCount: list.itemCount,
    }
    brandOrder.push(brand)
  }

  for (const brand of [
    ...(options.supplierBrands ?? []),
    ...(options.extraBrands ?? []),
  ]) {
    const name = normalizeText(brand)
    if (!name || brandOrder.includes(name)) {
      continue
    }
    listsByBrand[name] = {
      brandName: name,
      listId: null,
      updatedAt: '',
      itemCount: 0,
    }
    brandOrder.push(name)
  }

  return {
    rows,
    lists: listsByBrand,
    cells: {},
    brandOrder,
    invalidCatalogCount,
  }
}

/**
 * 把现表条目灌进给定品牌列。
 *
 * <p>`priorItems` 是该（供应商, 品牌）现表的条目全量；规格全集外的条目**不会**进入矩阵，
 * 但调用方必须把它们保留在「全量替换」的提交集合里（见 {@link buildReplaceItems}），
 * 否则用户在矩阵里改一格就会静默删掉历史脏键条目。</p>
 */
export function applyBrandItems(
  state: PriceMatrixState,
  brandName: string,
  priorItems: SupplierPriceListItem[],
): PriceMatrixState {
  const brand = normalizeText(brandName)
  if (!brand) {
    return state
  }
  const byKey: Record<string, PriceMatrixCell> = {}
  for (const item of priorItems) {
    const key = buildPriceRowKey(item)
    if (!key) {
      continue
    }
    byKey[key] = {
      price: item.price,
      ...(item.id ? { itemId: item.id } : {}),
      priceStatus: normalizePriceItemStatus(item.priceStatus),
      remark: item.remark ?? null,
    }
  }
  return {
    ...state,
    cells: {
      ...state.cells,
      [brand]: {
        ...(state.cells[brand] ?? {}),
        ...byKey,
      },
    },
  }
}

/** 覆盖单个单元格（唯一允许的写入路径，避免多处手改嵌套映射）。 */
export function updateMatrixCell(
  state: PriceMatrixState,
  brandName: string,
  rowKey: string,
  patch: Partial<PriceMatrixCell>,
): PriceMatrixState {
  const brand = normalizeText(brandName)
  if (!brand) {
    return state
  }
  const brandCells = state.cells[brand] ?? {}
  const current = brandCells[rowKey] ?? emptyCell()
  return {
    ...state,
    cells: {
      ...state.cells,
      [brand]: {
        ...brandCells,
        [rowKey]: { ...current, ...patch },
      },
    },
  }
}

/** 追加品牌列（手输品牌 / 选择经营品牌）；已存在时原样返回。 */
export function addBrandColumn(
  state: PriceMatrixState,
  brandName: string,
): PriceMatrixState {
  const brand = normalizeText(brandName)
  if (!brand || state.lists[brand]) {
    return state
  }
  return {
    ...state,
    lists: {
      ...state.lists,
      [brand]: {
        brandName: brand,
        listId: null,
        updatedAt: '',
        itemCount: 0,
      },
    },
    brandOrder: [...state.brandOrder, brand],
  }
}

/** 移除品牌列（仅移除展示；删除服务端现表需另行显式操作）。 */
export function removeBrandColumn(
  state: PriceMatrixState,
  brandName: string,
): PriceMatrixState {
  const brand = normalizeText(brandName)
  if (!brand || !state.lists[brand]) {
    return state
  }
  const lists = { ...state.lists }
  delete lists[brand]
  const cells = { ...state.cells }
  delete cells[brand]
  return {
    ...state,
    lists,
    cells,
    brandOrder: state.brandOrder.filter((name) => name !== brand),
  }
}

/** 标记某品牌列已建表（首次填价成功后写入服务端 ID）。 */
export function markBrandListCreated(
  state: PriceMatrixState,
  brandName: string,
  detail: {
    listId: EntityId
    updatedAt: string
    items: SupplierPriceListItem[]
  },
): PriceMatrixState {
  const brand = normalizeText(brandName)
  if (!brand) {
    return state
  }
  const withList: PriceMatrixState = {
    ...state,
    lists: {
      ...state.lists,
      [brand]: {
        brandName: brand,
        listId: detail.listId,
        updatedAt: detail.updatedAt,
        itemCount: detail.items.filter((item) => item.price !== null).length,
      },
    },
    // 服务端是权威：清掉该列本地草稿，改用响应里的条目（id/状态/备注以它为准）
    cells: { ...state.cells, [brand]: {} },
  }
  return applyBrandItems(withList, brand, detail.items)
}

/* ------------------------------------------------------------ 校验与统计 */

export type PriceCellParseResult = {
  price: number | null
  error?: string
}

/** 单元格文本 → 单价。`''` = 不报价（null）；`'0'` = 0 元。 */
export function parsePriceCellText(text: unknown): PriceCellParseResult {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw) {
    return { price: null }
  }
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    return { price: null, error: '单价必须是数字，留空表示不报价' }
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return { price: null, error: '单价必须是数字，留空表示不报价' }
  }
  if (parsed < 0) {
    return { price: null, error: '单价不得为负' }
  }
  return { price: parsed }
}

/** 矩阵行级错误（规格非法 / 重复键），按 `uid` 归集。 */
export type MatrixRowErrors = {
  spec?: string
  duplicate?: string
}

/** 规格行校验：规格必须为正整数、同一「类别+材质+规格+长度」不得重复。 */
export function validateMatrixRows(
  rows: PriceMatrixRow[],
): Map<string, MatrixRowErrors> {
  const result = new Map<string, MatrixRowErrors>()
  const mutate = (uid: string, patch: MatrixRowErrors) => {
    result.set(uid, { ...result.get(uid), ...patch })
  }
  const seen = new Map<string, number>()
  for (const row of rows) {
    const key = buildPriceRowKey(row)
    if (key === null || !Number.isInteger(row.spec) || row.spec <= 0) {
      mutate(row.uid, { spec: '规格必须为正整数' })
      continue
    }
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  for (const [duplicateKey, count] of seen) {
    if (count <= 1) {
      continue
    }
    for (const row of rows) {
      if (buildPriceRowKey(row) === duplicateKey) {
        mutate(row.uid, { duplicate: '同一类别+材质+规格+长度的条目重复' })
      }
    }
  }
  return result
}

export function isCellFilled(cell: PriceMatrixCell | undefined): boolean {
  return Boolean(cell && cell.price !== null)
}

/** 某品牌已填行数（不报价的行不计入）。 */
export function countFilledForBrand(
  state: PriceMatrixState,
  brandName: string,
): number {
  const brandCells = state.cells[brandName] ?? {}
  return Object.values(brandCells).filter((cell) => cell.price !== null).length
}

/** 矩阵概览统计。 */
export type MatrixStats = {
  totalRows: number
  brandCount: number
  filledTotal: number
  emptyTotal: number
  updatedAt: string
}

export function computeMatrixStats(state: PriceMatrixState): MatrixStats {
  let filledTotal = 0
  for (const brand of state.brandOrder) {
    filledTotal += countFilledForBrand(state, brand)
  }
  const brands = state.brandOrder.length
  return {
    totalRows: state.rows.length,
    brandCount: brands,
    filledTotal,
    emptyTotal: brands * state.rows.length - filledTotal,
    updatedAt:
      state.brandOrder
        .map((brand) => state.lists[brand]?.updatedAt ?? '')
        .find(Boolean) ?? '',
  }
}

/** 行填充过滤：只看「指定品牌已填/未填」。 */
export type PriceRowFillFilter = 'ALL' | 'FILLED' | 'UNFILLED'

export type MatrixRowFilter = {
  keyword?: string
  fill?: PriceRowFillFilter
  category?: string
  material?: string
  /** 填充过滤作用的品牌列；为空时按「任一品牌已填」判断 */
  fillBrand?: string
}

function matchesKeyword(row: PriceMatrixRow, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase()
  if (!needle) {
    return true
  }
  return [
    row.category,
    row.material,
    String(row.spec),
    `φ${row.spec}`,
    row.length,
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

/** 矩阵行筛选：关键字 + 类别 + 材质 + 只看已填/未填（按品牌列或任一品牌）。 */
export function filterMatrixRows(
  state: PriceMatrixState,
  filter: MatrixRowFilter,
): PriceMatrixRow[] {
  const fill = filter.fill ?? 'ALL'
  const fillBrand = filter.fillBrand?.trim()
  return state.rows.filter((row) => {
    if (fill !== 'ALL') {
      const filled = fillBrand
        ? (state.cells[fillBrand]?.[row.key]?.price ?? null) !== null
        : state.brandOrder.some(
            (brand) => (state.cells[brand]?.[row.key]?.price ?? null) !== null,
          )
      if (fill === 'FILLED' && !filled) {
        return false
      }
      if (fill === 'UNFILLED' && filled) {
        return false
      }
    }
    if (filter.category && row.category !== filter.category) {
      return false
    }
    if (filter.material && row.material !== filter.material) {
      return false
    }
    return matchesKeyword(row, filter.keyword ?? '')
  })
}

/* ------------------------------------------------------------ 提交载荷 */

/**
 * 由矩阵生成某品牌的全量条目（`PUT` 语义 = 全量替换，必须包含未改动的条目）。
 *
 * <p>三条守卫：</p>
 * 1. 服务端已存在的条目**无论价格是否为 null 都必须带上**，否则会被全量替换删掉
 *    （「不报价」是真实语义，不是「不存在」）；
 * 2. 规格全集外的历史脏键条目不能被静默删除，调用方通过 `preservedItems` 传回；
 * 3. 本地新填且 `price !== null` 的行才追加（空价新行不落库，避免把「不报价」写成条目）。</p>
 */
export function buildReplaceItems(
  state: PriceMatrixState,
  brandName: string,
  preservedItems: SupplierPriceListItem[] = [],
): SupplierPriceListItemPayload[] {
  const brandCells = state.cells[brandName] ?? {}
  const items: SupplierPriceListItemPayload[] = []
  const emitted = new Set<string>()

  const push = (row: {
    key: string
    category: string
    material: string
    spec: number
    length: string
    sortOrder: number
    price: number | null
    priceStatus: SupplierPriceItemStatus
    remark: string | null
  }) => {
    if (emitted.has(row.key)) {
      return
    }
    emitted.add(row.key)
    items.push({
      category: row.category,
      material: row.material,
      spec: row.spec,
      length: row.length,
      price: row.price,
      priceStatus: row.priceStatus,
      remark: row.remark?.trim() ? row.remark.trim() : null,
      sortOrder: row.sortOrder,
    })
  }

  state.rows.forEach((row, index) => {
    const cell = brandCells[row.key]
    const hasItemId = Boolean(cell?.itemId)
    const hasPrice = cell?.price !== null && cell?.price !== undefined
    if (!hasItemId && !hasPrice) {
      return
    }
    push({
      key: row.key,
      category: row.category,
      material: row.material,
      spec: row.spec,
      length: row.length,
      sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : index,
      price: cell?.price ?? null,
      priceStatus: cell?.priceStatus ?? 'NORMAL',
      remark: cell?.remark ?? null,
    })
  })

  for (const item of preservedItems) {
    const key = buildPriceRowKey(item)
    if (!key || emitted.has(key)) {
      continue
    }
    push({
      key,
      category: item.category,
      material: item.material,
      spec: item.spec,
      length: item.length,
      sortOrder: item.sortOrder,
      price: item.price,
      priceStatus: item.priceStatus,
      remark: item.remark,
    })
  }

  return items
}

/** 加价/减价后是否可能出现负数（用于整体加减的前置阻断）。 */
export function wouldPriceGoNegative(
  price: number,
  mode: PriceAdjustmentMode,
  amount: number,
): boolean {
  return (mode === 'ADD' ? price + amount : price - amount) < 0
}

/* ------------------------------------------------------------ 整体加减 */

export type AdjustmentPreviewRow = {
  itemId: EntityId
  brandName: string
  key: string
  label: string
  priceBefore: number
  priceAfter: number
}

export type MatrixAdjustmentPreview = {
  mode: PriceAdjustmentMode
  amount: number
  /** 按品牌分组的可执行加减条目（每个品牌一次 `price-adjustments` 调用） */
  brandPlans: {
    brandName: string
    listId: EntityId
    itemIds: EntityId[]
    affectedCount: number
    skippedCount: number
  }[]
  rows: AdjustmentPreviewRow[]
  affectedCount: number
  /** 单价为空（不报价）的条目不参与加减，仅计数 */
  skippedCount: number
  negativeLabels: string[]
  /** 有价但服务端尚无表/条目 ID 的行：无法加减，需先保存 */
  unsavedCount: number
  /** 品牌列本身未建表时无法参与加减 */
  brandsWithoutList: string[]
}

/**
 * 整体加减预览：只作用于**已建表且条目已落库**的 `price !== null` 条目。
 *
 * <p>调用方必须先展示预览再由用户确认；本函数只做计算，不发起请求。跨品牌一次性预览，
 * 执行时按品牌分别调用 `price-adjustments`（接口是单表粒度）。</p>
 */
export function buildMatrixAdjustmentPreview(
  state: PriceMatrixState,
  mode: PriceAdjustmentMode,
  amount: number,
  brandNames: string[] = state.brandOrder,
): MatrixAdjustmentPreview {
  const previewRows: AdjustmentPreviewRow[] = []
  const brandPlans: MatrixAdjustmentPreview['brandPlans'] = []
  const negativeLabels: string[] = []
  const brandsWithoutList: string[] = []
  let skippedCount = 0
  let unsavedCount = 0

  for (const brand of brandNames) {
    const list = state.lists[brand]
    const brandCells = state.cells[brand] ?? {}
    const itemIds: EntityId[] = []
    let affected = 0
    let skipped = 0

    for (const row of state.rows) {
      const cell = brandCells[row.key]
      if (!cell || cell.price === null) {
        skipped += 1
        continue
      }
      if (!cell.itemId) {
        unsavedCount += 1
        continue
      }
      if (!list?.listId) {
        continue
      }
      const priceAfter =
        mode === 'ADD' ? cell.price + amount : cell.price - amount
      if (priceAfter < 0) {
        negativeLabels.push(`${brand} ${describePriceRow(row)}`)
      }
      itemIds.push(cell.itemId)
      affected += 1
      previewRows.push({
        itemId: cell.itemId,
        brandName: brand,
        key: `${brand}${KEY_SEPARATOR}${row.key}`,
        label: `${brand} ${describePriceRow(row)}`,
        priceBefore: cell.price,
        priceAfter,
      })
    }

    skippedCount += skipped
    if (!list?.listId) {
      if (affected > 0 || skipped > 0) {
        brandsWithoutList.push(brand)
      }
      continue
    }
    brandPlans.push({
      brandName: brand,
      listId: list.listId,
      itemIds,
      affectedCount: affected,
      skippedCount: skipped,
    })
  }

  return {
    mode,
    amount,
    brandPlans: brandPlans.filter((plan) => plan.affectedCount > 0),
    rows: previewRows,
    affectedCount: previewRows.length,
    skippedCount,
    negativeLabels,
    unsavedCount,
    brandsWithoutList,
  }
}

export function isAdjustmentAmountValid(amount: unknown): boolean {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0
}

/* ------------------------------------------------------------ TSV 粘贴 */

export type TsvPasteError = {
  /** 粘贴文本中的行号（从 1 开始，便于用户对回 Excel） */
  line: number
  message: string
  text: string
}

export type MatrixPasteResult = {
  state: PriceMatrixState
  brandName: string
  errors: TsvPasteError[]
  appliedCount: number
  /** 由空单价清成「不报价」的单元格数（调用方需要二次确认） */
  clearedCount: number
  /** 单价为空但原本也没有报价，无需提示 */
  unchangedEmptyCount: number
}

/**
 * 把一段 TSV 文本写入**指定品牌列**。
 *
 * <p>列布局（与比价页一致的从 Excel 复制口径）：4 列 = `材质 / 规格 / 长度 / 单价`；
 * 5 列 = `类别 / 材质 / 规格 / 长度 / 单价`。只能对齐到固定规格行；列数不足、规格非正整数、
 * 单价格式错误、无法对齐的行逐行报错且不写入。单价为空 = 不报价（`null`），绝不写 0。</p>
 */
export function applyMatrixPaste(
  state: PriceMatrixState,
  brandName: string,
  text: string,
): MatrixPasteResult {
  const brand = normalizeText(brandName)
  let next = state.brandOrder.includes(brand)
    ? state
    : addBrandColumn(state, brand)

  const byFullKey = new Map<string, PriceMatrixRow>()
  const byMaterialSpecLength = new Map<string, PriceMatrixRow[]>()
  for (const row of next.rows) {
    const key = buildPriceRowKey(row)
    if (key) {
      byFullKey.set(key, row)
    }
    const secondary = buildMaterialSpecLengthKey(row)
    if (secondary) {
      const bucket = byMaterialSpecLength.get(secondary) ?? []
      bucket.push(row)
      byMaterialSpecLength.set(secondary, bucket)
    }
  }

  const errors: TsvPasteError[] = []
  let appliedCount = 0
  let clearedCount = 0
  let unchangedEmptyCount = 0

  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    const lineNumber = index + 1
    if (!line.trim()) {
      return
    }
    const cells = line.split('\t').map((cell) => cell.trim())
    if (cells.length < 4) {
      errors.push({
        line: lineNumber,
        message: '列数不足：需要「材质 / 规格 / 长度 / 单价」4 列',
        text: line,
      })
      return
    }
    const hasCategory = cells.length >= 5
    const [category, material, specText, length, priceText] = hasCategory
      ? cells
      : ['', cells[0], cells[1], cells[2], cells[3]]

    if (!material) {
      errors.push({ line: lineNumber, message: '材质为空', text: line })
      return
    }
    const spec = normalizeSpecNumber(specText)
    if (spec === null) {
      errors.push({
        line: lineNumber,
        message: '规格必须是正整数',
        text: line,
      })
      return
    }
    const priceParsed = parsePriceCellText(priceText)
    if (priceParsed.error) {
      errors.push({ line: lineNumber, message: priceParsed.error, text: line })
      return
    }

    const fullKey = buildPriceRowKey({ category, material, spec, length })
    let target = fullKey ? byFullKey.get(fullKey) : undefined
    if (!target) {
      // 4 列粘贴没有类别列：退化为「材质+规格+长度」唯一匹配，多义时拒绝写入
      const candidates =
        byMaterialSpecLength.get(
          buildMaterialSpecLengthKey({ material, spec, length }) ?? '',
        ) ?? []
      if (candidates.length === 1) {
        target = candidates[0]
      } else if (candidates.length > 1) {
        errors.push({
          line: lineNumber,
          message:
            '规格全集内有多条同材质+规格+长度但类别不同的行，请带上类别列',
          text: line,
        })
        return
      }
    }
    if (!target) {
      errors.push({
        line: lineNumber,
        message: '规格全集内没有匹配的固定行，未写入（避免脏数据）',
        text: line,
      })
      return
    }

    const current = next.cells[brand]?.[target.key]
    if (priceParsed.price === null) {
      if (current?.price === null || current === undefined) {
        unchangedEmptyCount += 1
      } else {
        clearedCount += 1
      }
      next = updateMatrixCell(next, brand, target.key, { price: null })
      appliedCount += 1
      return
    }

    next = updateMatrixCell(next, brand, target.key, {
      price: priceParsed.price,
      // 有价即视为正常报价，否则会出现「无货」却带价的矛盾状态
      priceStatus:
        current?.priceStatus === 'OUT_OF_STOCK'
          ? 'NORMAL'
          : (current?.priceStatus ?? 'NORMAL'),
    })
    appliedCount += 1
  })

  return {
    state: next,
    brandName: brand,
    errors,
    appliedCount,
    clearedCount,
    unchangedEmptyCount,
  }
}

/* ------------------------------------------------------------ 变更检出 */

/** 单元格指纹：仅包含会随编辑变化的字段（`price` 决定 `PUT` 必要性）。 */
function cellSignature(cell: PriceMatrixCell | undefined): string {
  if (!cell) {
    return ''
  }
  return [
    cell.price === null ? '' : String(cell.price),
    cell.itemId ?? '',
    cell.priceStatus,
    cell.remark ?? '',
  ].join(EMPTY_KEY_SEPARATOR)
}

/** 计算当前矩阵的指纹（用于「有未保存修改」判定）。 */
export function matrixSignature(state: PriceMatrixState): string {
  const parts: string[] = []
  for (const brand of state.brandOrder) {
    const brandCells = state.cells[brand] ?? {}
    parts.push(
      `#${brand}|${state.lists[brand]?.listId ?? ''}|${state.rows
        .map((row) => cellSignature(brandCells[row.key]))
        .join(',')}`,
    )
  }
  return parts.join('\n')
}

/** 列级即存：这些品牌列相对基线有改动（含「新填价但尚无表」的品牌）。 */
export function dirtyBrandNames(
  state: PriceMatrixState,
  baseline: string,
): string[] {
  if (!baseline) {
    return []
  }
  const currentParts = matrixSignature(state).split('\n')
  const baselineParts = baseline.split('\n')
  return state.brandOrder.filter(
    (_brand, index) => currentParts[index] !== baselineParts[index],
  )
}

/** 价格表更新时间展示（截断秒并把 `T` 换成空格）。 */
export function formatUpdatedAt(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.replace('T', ' ').slice(0, 16)
}
