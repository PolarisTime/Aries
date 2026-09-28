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
 * 供应商品牌价格表**品牌视图矩阵**的纯逻辑。
 *
 * <p>设计口径（见 `.local/design/supplier-price-list.md` §4.6 修订 R2，含轴向变更）：</p>
 * - **取消版本**：一个（供应商 + 品牌）只有一张表；表头没有发布时刻/生效区间/状态；
 * - 视图按**品牌**分页（品牌 = 标签页），页内**每个供应商一列**；
 * - **行** = 规格全集固定行 `类别 / 材质 / 规格(直径) / 长度`（只读，不自由增行）；
 * - **单元格** = 该（供应商, 品牌）价格表里 `(category, material, spec, length)` 的单价；
 *   留空 = 不报价（提交 `null`，绝不写 0）；
 * - 数据键与原来完全一致：`(供应商, 品牌, 类别, 材质, 规格, 长度) → 单价`，只是矩阵转置；
 * - 整体加减按**价格表（供应商 + 品牌）**生效，因此入口在列头菜单上，不存在跨供应商批量接口。
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

/** 列的人类可读标识：`供应商名`（品牌是页级维度，不需要重复进列名）。 */
export function describePriceColumn(column: {
  supplierId: EntityId
  supplierName: string
}): string {
  return normalizeText(column.supplierName) || `#${column.supplierId}`
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

/**
 * 一个**供应商列**在该品牌视图下的状态。
 *
 * <p>`listId` 为空 = 该（供应商, 品牌）尚无价格表，首次填价时才建表。</p>
 */
export type PriceMatrixColumnInfo = {
  supplierId: EntityId
  supplierName: string
  listId: EntityId | null
  /** 列表返回的更新时间（无表时为空串） */
  updatedAt: string
  /** 由「列表 / 建表」响应的 itemCount 带出，仅作展示 */
  itemCount: number
}

/** 单个（供应商列, 规格行）单元格。 */
export type PriceMatrixCell = {
  /** `null` = 不报价；`0` = 真实的 0 元 */
  price: number | null
  /** 服务端条目 ID；仅存在于「从服务端带出的条目」上 */
  itemId?: EntityId
  /** 服务端条目的状态/备注：维护页不编辑，但全量替换时必须原样带回 */
  priceStatus: SupplierPriceItemStatus
  remark: string | null
}

/**
 * 品牌视图矩阵状态。
 *
 * <p>刻意把行（规格全集）与单元格（供应商列×行）分开：规格全集数百行 × 多供应商时，
 * 逐行 per-supplier 对象会让行渲染依赖整个供应商映射，列内录入的状态更新成本高且不易做
 * 脏值对比。</p>
 */
export type PriceMatrixState = {
  /** 视图所属品牌（数据键的第二段；每个单元格都落在某个 (供应商, 品牌) 表里） */
  brandName: string
  rows: PriceMatrixRow[]
  /** supplierId → 列信息 */
  columns: Record<EntityId, PriceMatrixColumnInfo>
  /** supplierId → 行键 → 单元格 */
  cells: Record<EntityId, Record<string, PriceMatrixCell>>
  /** 列顺序（供应商列展示顺序；新增供应商列追加到末尾） */
  columnOrder: EntityId[]
  /** 规格全集内 spec 无法归一化的脏行数 */
  invalidCatalogCount: number
}

export type BuildMatrixOptions = {
  /** 视图所属品牌 */
  brandName: string
  catalog: SupplierPriceSpecCatalogEntry[]
  /** 该品牌的（供应商, 品牌）现表摘要（`GET /supplier-price-lists?brandName=` 全量） */
  lists: SupplierPriceListSummary[]
  /** 可选的额外供应商列（尚无该品牌价格表，允许先出现空列） */
  extraSuppliers?: { supplierId: EntityId; supplierName: string }[]
}

function emptyCell(): PriceMatrixCell {
  return { price: null, priceStatus: 'NORMAL', remark: null }
}

/**
 * 由规格全集 + 该品牌的现表构建矩阵。
 *
 * <p>列来源 = 已有该品牌价格表的供应商（后端返回顺序）∪ 额外指定的供应商；
 * `brandName` 归一化后必须非空（页级标签就是品牌，不允许空品牌视图）；空品牌返回空矩阵。</p>
 */
export function buildMatrixState(
  options: BuildMatrixOptions,
): PriceMatrixState {
  const brandName = normalizeText(options.brandName)
  const rows: PriceMatrixRow[] = []
  const keyToRowIndex: Record<string, number> = {}
  let invalidCatalogCount = 0

  for (const entry of options.catalog) {
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
    keyToRowIndex[key] = rows.length
    rows.push({
      uid: `${key}#${rows.length}`,
      key,
      category: normalizeText(entry.category),
      material: normalizeText(entry.material),
      spec,
      length: normalizeText(entry.length),
      sortOrder: Number.isFinite(entry.sortOrder)
        ? entry.sortOrder
        : rows.length,
    })
  }

  const columnOrder: EntityId[] = []
  const columns: Record<EntityId, PriceMatrixColumnInfo> = {}
  const cells: Record<EntityId, Record<string, PriceMatrixCell>> = {}

  const pushColumn = (
    supplierId: EntityId,
    supplierName: string,
    listId: EntityId | null,
    updatedAt: string,
    itemCount: number,
  ) => {
    if (!supplierId || columns[supplierId]) {
      return
    }
    columns[supplierId] = {
      supplierId,
      supplierName,
      listId,
      updatedAt,
      itemCount,
    }
    cells[supplierId] = {}
    columnOrder.push(supplierId)
  }

  if (brandName) {
    for (const list of options.lists) {
      if (normalizeText(list.brandName) !== brandName) {
        continue
      }
      pushColumn(
        list.supplierId,
        normalizeText(list.supplierName),
        list.id,
        list.updatedAt,
        list.itemCount,
      )
    }
    for (const extra of options.extraSuppliers ?? []) {
      pushColumn(
        extra.supplierId,
        normalizeText(extra.supplierName),
        null,
        '',
        0,
      )
    }
  }

  return {
    brandName,
    rows,
    columns,
    cells,
    columnOrder,
    invalidCatalogCount,
  }
}

/**
 * 把某（供应商, 品牌）现表的条目灌进对应列。
 *
 * <p>`priorItems` 是该现表的条目全量；规格全集外的条目**不会**进入矩阵，但调用方必须把它们
 * 保留在「全量替换」的提交集合里（见 {@link buildReplaceItems}），否则用户在矩阵里改一格
 * 就会静默删掉历史脏键条目。</p>
 */
export function applyColumnItems(
  state: PriceMatrixState,
  supplierId: EntityId,
  priorItems: SupplierPriceListItem[],
): PriceMatrixState {
  if (!supplierId || !state.columns[supplierId]) {
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
      [supplierId]: { ...(state.cells[supplierId] ?? {}), ...byKey },
    },
  }
}

/** 覆盖单个单元格（唯一允许的写入路径，避免多处手改嵌套映射）。 */
export function updateMatrixCell(
  state: PriceMatrixState,
  supplierId: EntityId,
  rowKey: string,
  patch: Partial<PriceMatrixCell>,
): PriceMatrixState {
  if (!supplierId || !state.columns[supplierId]) {
    return state
  }
  const columnCells = state.cells[supplierId] ?? {}
  const current = columnCells[rowKey] ?? emptyCell()
  return {
    ...state,
    cells: {
      ...state.cells,
      [supplierId]: { ...columnCells, [rowKey]: { ...current, ...patch } },
    },
  }
}

/** 追加供应商列（尚无该品牌价格表的供应商）；已存在时原样返回。 */
export function addSupplierColumn(
  state: PriceMatrixState,
  supplier: { supplierId: EntityId; supplierName: string },
): PriceMatrixState {
  const supplierId = normalizeText(supplier.supplierId)
  if (!supplierId || state.columns[supplierId]) {
    return state
  }
  return {
    ...state,
    columns: {
      ...state.columns,
      [supplierId]: {
        supplierId,
        supplierName: normalizeText(supplier.supplierName),
        listId: null,
        updatedAt: '',
        itemCount: 0,
      },
    },
    cells: { ...state.cells, [supplierId]: {} },
    columnOrder: [...state.columnOrder, supplierId],
  }
}

/** 移除供应商列（仅移除展示；删除服务端现表需另行显式操作）。 */
export function removeSupplierColumn(
  state: PriceMatrixState,
  supplierId: EntityId,
): PriceMatrixState {
  if (!supplierId || !state.columns[supplierId]) {
    return state
  }
  const columns = { ...state.columns }
  delete columns[supplierId]
  const cells = { ...state.cells }
  delete cells[supplierId]
  return {
    ...state,
    columns,
    cells,
    columnOrder: state.columnOrder.filter((id) => id !== supplierId),
  }
}

/** 标记该（供应商, 品牌）已建表（首次填价成功后写入服务端 ID 与权威条目）。 */
export function markColumnListCreated(
  state: PriceMatrixState,
  supplierId: EntityId,
  detail: {
    listId: EntityId
    updatedAt: string
    items: SupplierPriceListItem[]
  },
): PriceMatrixState {
  const column = state.columns[supplierId]
  if (!supplierId || !column) {
    return state
  }
  const withList: PriceMatrixState = {
    ...state,
    columns: {
      ...state.columns,
      [supplierId]: {
        ...column,
        listId: detail.listId,
        updatedAt: detail.updatedAt,
        itemCount: detail.items.filter((item) => item.price !== null).length,
      },
    },
    // 服务端是权威：清掉该列本地草稿，改用响应里的条目（id/状态/备注以它为准）
    cells: { ...state.cells, [supplierId]: {} },
  }
  return applyColumnItems(withList, supplierId, detail.items)
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

/** 某供应商列已填行数（不报价的行不计入）。 */
export function countFilledForColumn(
  state: PriceMatrixState,
  supplierId: EntityId,
): number {
  const columnCells = state.cells[supplierId] ?? {}
  return Object.values(columnCells).filter((cell) => cell.price !== null).length
}

/** 矩阵概览统计。 */
export type MatrixStats = {
  totalRows: number
  columnCount: number
  filledTotal: number
  emptyTotal: number
  updatedAt: string
}

export function computeMatrixStats(state: PriceMatrixState): MatrixStats {
  let filledTotal = 0
  for (const supplierId of state.columnOrder) {
    filledTotal += countFilledForColumn(state, supplierId)
  }
  const columnCount = state.columnOrder.length
  return {
    totalRows: state.rows.length,
    columnCount,
    filledTotal,
    emptyTotal: columnCount * state.rows.length - filledTotal,
    updatedAt:
      state.columnOrder
        .map((supplierId) => state.columns[supplierId]?.updatedAt ?? '')
        .find(Boolean) ?? '',
  }
}

/** 行填充过滤：只看「指定供应商列已填/未填」。 */
export type PriceRowFillFilter = 'ALL' | 'FILLED' | 'UNFILLED'

export type MatrixRowFilter = {
  keyword?: string
  fill?: PriceRowFillFilter
  category?: string
  material?: string
  /** 填充过滤作用的供应商列；为空时按「任一供应商已填」判断 */
  fillSupplierId?: EntityId
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

/** 矩阵行筛选：关键字 + 类别 + 材质 + 只看已填/未填（按供应商列或任一供应商）。 */
export function filterMatrixRows(
  state: PriceMatrixState,
  filter: MatrixRowFilter,
): PriceMatrixRow[] {
  const fill = filter.fill ?? 'ALL'
  const fillSupplierId = filter.fillSupplierId?.trim()
  return state.rows.filter((row) => {
    if (fill !== 'ALL') {
      const filled = fillSupplierId
        ? (state.cells[fillSupplierId]?.[row.key]?.price ?? null) !== null
        : state.columnOrder.some(
            (supplierId) =>
              (state.cells[supplierId]?.[row.key]?.price ?? null) !== null,
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
 * 由矩阵生成某供应商列的全量条目（`PUT` 语义 = 全量替换，必须包含未改动的条目）。
 *
 * <p>三条守卫：</p>
 * 1. 服务端已存在的条目**无论价格是否为 null 都必须带上**，否则会被全量替换删掉
 *    （「不报价」是真实语义，不是「不存在」）；
 * 2. 规格全集外的历史脏键条目不能被静默删除，调用方通过 `preservedItems` 传回；
 * 3. 本地新填且 `price !== null` 的行才追加（空价新行不落库，避免把「不报价」写成条目）。</p>
 */
export function buildReplaceItems(
  state: PriceMatrixState,
  supplierId: EntityId,
  preservedItems: SupplierPriceListItem[] = [],
): SupplierPriceListItemPayload[] {
  const columnCells = state.cells[supplierId] ?? {}
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
    const cell = columnCells[row.key]
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

/** 整体加减的目标：一个（供应商, 品牌）价格表（接口是单表粒度）。 */
export type PriceAdjustTarget = {
  supplierId: EntityId
  listId: EntityId
}

export type AdjustmentPreviewRow = {
  itemId: EntityId
  supplierId: EntityId
  supplierName: string
  key: string
  label: string
  priceBefore: number
  priceAfter: number
}

export type MatrixAdjustmentPreview = {
  mode: PriceAdjustmentMode
  amount: number
  /** 目标价格表（该供应商在该品牌下没有表时为 null） */
  target: PriceAdjustTarget | null
  itemIds: EntityId[]
  rows: AdjustmentPreviewRow[]
  affectedCount: number
  /** 单价为空（不报价）的条目不参与加减，仅计数 */
  skippedCount: number
  negativeLabels: string[]
  /** 有价但服务端尚无条目的行：无法加减，需先保存（失焦即存） */
  unsavedCount: number
  /** 目标供应商在该品牌下尚无价格表 */
  missingList: boolean
}

/**
 * 整体加减预览：只作用于**目标（供应商, 品牌）价格表里已落库**的 `price !== null` 条目。
 *
 * <p>调用方必须先展示预览再由用户确认；本函数只做计算，不发起请求。加减**按价格表生效**，
 * 因此不存在跨供应商的批量接口。</p>
 */
export function buildMatrixAdjustmentPreview(
  state: PriceMatrixState,
  supplierId: EntityId,
  mode: PriceAdjustmentMode,
  amount: number,
): MatrixAdjustmentPreview {
  const column = state.columns[supplierId]
  const columnCells = state.cells[supplierId] ?? {}
  const rows: AdjustmentPreviewRow[] = []
  const itemIds: EntityId[] = []
  const negativeLabels: string[] = []
  let skippedCount = 0
  let unsavedCount = 0

  const columnLabel = column ? describePriceColumn(column) : `#${supplierId}`

  for (const row of state.rows) {
    const cell = columnCells[row.key]
    if (!cell || cell.price === null) {
      skippedCount += 1
      continue
    }
    if (!cell.itemId) {
      unsavedCount += 1
      continue
    }
    if (!column?.listId) {
      continue
    }
    const priceAfter =
      mode === 'ADD' ? cell.price + amount : cell.price - amount
    if (priceAfter < 0) {
      negativeLabels.push(`${columnLabel} ${describePriceRow(row)}`)
    }
    itemIds.push(cell.itemId)
    rows.push({
      itemId: cell.itemId,
      supplierId,
      supplierName: columnLabel,
      key: `${supplierId}${KEY_SEPARATOR}${row.key}`,
      label: `${columnLabel} ${describePriceRow(row)}`,
      priceBefore: cell.price,
      priceAfter,
    })
  }

  return {
    mode,
    amount,
    target: column?.listId ? { supplierId, listId: column.listId } : null,
    itemIds,
    rows,
    affectedCount: rows.length,
    skippedCount,
    negativeLabels,
    unsavedCount,
    missingList: !column?.listId,
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
  supplierId: EntityId
  errors: TsvPasteError[]
  appliedCount: number
  /** 由空单价清成「不报价」的单元格数（调用方需要二次确认） */
  clearedCount: number
  /** 单价为空但原本也没有报价，无需提示 */
  unchangedEmptyCount: number
}

/**
 * 把一段 TSV 文本写入**指定供应商列**（该列所属的（供应商, 品牌）价格表）。
 *
 * <p>列布局（与比价页一致的从 Excel 复制口径）：4 列 = `材质 / 规格 / 长度 / 单价`；
 * 5 列 = `类别 / 材质 / 规格 / 长度 / 单价`。只能对齐到固定规格行；列数不足、规格非正整数、
 * 单价格式错误、无法对齐的行逐行报错且不写入。单价为空 = 不报价（`null`），绝不写 0。</p>
 *
 * <p>整块粘贴（多供应商 × 规格）由调用方按列拆分后逐列调用本函数，保证每个单元格都落到
 * 各自的（供应商, 品牌）价格表，不猜目标。</p>
 */
export function applyMatrixPaste(
  state: PriceMatrixState,
  supplierId: EntityId,
  text: string,
): MatrixPasteResult {
  let working = state
  const byFullKey = new Map<string, PriceMatrixRow>()
  const byMaterialSpecLength = new Map<string, PriceMatrixRow[]>()
  for (const row of working.rows) {
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

    const current = working.cells[supplierId]?.[target.key]
    if (priceParsed.price === null) {
      if (current?.price === null || current === undefined) {
        unchangedEmptyCount += 1
      } else {
        clearedCount += 1
      }
      working = updateMatrixCell(working, supplierId, target.key, {
        price: null,
      })
      appliedCount += 1
      return
    }

    working = updateMatrixCell(working, supplierId, target.key, {
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
    state: working,
    supplierId,
    errors,
    appliedCount,
    clearedCount,
    unchangedEmptyCount,
  }
}

/* ------------------------------------------------------------ 整块粘贴 */

/** 整块粘贴里识别出的一个目标列。 */
export type BlockPasteColumn = {
  supplierId: EntityId
  supplierName: string
  /** 该列的 TSV（材质 / 规格 / 长度 / 单价，或带类别 5 列） */
  text: string
}

export type BlockPasteLayout = {
  columns: BlockPasteColumn[]
  /** 无法识别为当前视图任何供应商的列名（跳过而不是乱写） */
  unknownSupplierNames: string[]
}

/**
 * 解析「供应商 × 规格」整块粘贴。
 *
 * <p>列布局：`供应商 / 材质 / 规格 / 长度 / 单价`（也允许再带「类别」作为第 4 列）。
 * 首行第二格不是数字时视为表头行（`供应商 / 材质 / 规格 / 长度 / 单价`）并跳过。
 * 返回按供应商名匹配到的列；未匹配到的列名单独回报，**不会**猜着写入。</p>
 */
export function parseBlockPasteLayout(
  text: string,
  suppliers: { supplierId: EntityId; supplierName: string }[],
): BlockPasteLayout {
  const byName = new Map<
    string,
    { supplierId: EntityId; supplierName: string }
  >()
  for (const supplier of suppliers) {
    const name = normalizeText(supplier.supplierName)
    if (name) {
      byName.set(name, supplier)
    }
  }
  const buckets = new Map<EntityId, string[]>()
  const ordered: EntityId[] = []
  const matched = new Map<EntityId, string>()
  const unknownSupplierNames: string[] = []

  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (!line.trim()) {
      return
    }
    const cells = line.split('\t').map((cell) => cell.trim())
    if (cells.length < 5) {
      return
    }
    const [supplierName, ...rest] = cells
    if (!supplierName) {
      return
    }
    if (index === 0 && normalizeSpecNumber(rest[1]) === null) {
      // 表头行：供应商 / 材质 / 规格 / 长度 / 单价
      return
    }
    const supplier = byName.get(supplierName)
    if (!supplier) {
      if (!unknownSupplierNames.includes(supplierName)) {
        unknownSupplierNames.push(supplierName)
      }
      return
    }
    if (!buckets.has(supplier.supplierId)) {
      buckets.set(supplier.supplierId, [])
      matched.set(supplier.supplierId, supplier.supplierName)
      ordered.push(supplier.supplierId)
    }
    buckets.get(supplier.supplierId)?.push(rest.join('\t'))
  })

  return {
    columns: ordered.map((supplierId) => ({
      supplierId,
      supplierName: matched.get(supplierId) ?? `#${supplierId}`,
      text: (buckets.get(supplierId) ?? []).join('\n'),
    })),
    unknownSupplierNames,
  }
}

/* ------------------------------------------------------------ 整块粘贴预览 */

/** 整块粘贴的单列预览（不写状态，只算会写多少行、报哪些错）。 */
export type BlockPasteColumnPreview = {
  supplierId: EntityId
  supplierName: string
  appliedCount: number
  clearedCount: number
  errors: TsvPasteError[]
}

export type BlockPastePreview = {
  columns: BlockPasteColumnPreview[]
  appliedCount: number
  clearedCount: number
  errorCount: number
  /** 无法识别为当前视图任何供应商的列名（跳过而不是乱写） */
  unknownSupplierNames: string[]
}

/**
 * 整块粘贴预览：`供应商 / 材质 / 规格 / 长度 / 单价`（可带类别）。
 *
 * <p>纯读：按供应商名拆列后逐列调用 {@link applyMatrixPaste} 的计算结果，但**不返回新状态**；
 * 真正写入时调用方再对原状态逐列 `applyMatrixPaste`，保证写入与预览一致且各自落表。</p>
 */
export function previewBlockPaste(
  state: PriceMatrixState,
  text: string,
): BlockPastePreview {
  const layout = parseBlockPasteLayout(
    text,
    state.columnOrder.map((supplierId) => ({
      supplierId,
      supplierName: state.columns[supplierId]?.supplierName ?? '',
    })),
  )
  const columns: BlockPasteColumnPreview[] = []
  let appliedCount = 0
  let clearedCount = 0
  let errorCount = 0
  for (const column of layout.columns) {
    const result = applyMatrixPaste(state, column.supplierId, column.text)
    columns.push({
      supplierId: column.supplierId,
      supplierName: column.supplierName,
      appliedCount: result.appliedCount,
      clearedCount: result.clearedCount,
      errors: result.errors,
    })
    appliedCount += result.appliedCount
    clearedCount += result.clearedCount
    errorCount += result.errors.length
  }
  return {
    columns,
    appliedCount,
    clearedCount,
    errorCount,
    unknownSupplierNames: layout.unknownSupplierNames,
  }
}

/* ------------------------------------------------------------ 变更检出 */

/** 单元格指纹：仅包含会随编辑变化的字段（`price` 决定提交必要性）。 */
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
  for (const supplierId of state.columnOrder) {
    const columnCells = state.cells[supplierId] ?? {}
    parts.push(
      `#${supplierId}|${state.columns[supplierId]?.listId ?? ''}|${state.rows
        .map((row) => cellSignature(columnCells[row.key]))
        .join(',')}`,
    )
  }
  return parts.join('\n')
}

/** 列级即存：这些供应商列相对基线有改动（含「新填价但尚无表」的列）。 */
export function dirtySupplierIds(
  state: PriceMatrixState,
  baseline: string,
): EntityId[] {
  if (!baseline) {
    return []
  }
  const currentParts = matrixSignature(state).split('\n')
  const baselineParts = baseline.split('\n')
  return state.columnOrder.filter(
    (_supplierId, index) => currentParts[index] !== baselineParts[index],
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
