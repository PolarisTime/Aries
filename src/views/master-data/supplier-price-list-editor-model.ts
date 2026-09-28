import {
  normalizeSpecNumber,
  type PriceAdjustmentMode,
  type SupplierPriceItemStatus,
  type SupplierPriceListItem,
  type SupplierPriceListItemPayload,
  type SupplierPriceListPayload,
  type SupplierPriceSpecCatalogEntry,
} from '@/api/master/supplier-price-lists'
import type { EntityId } from '@/types/entity-id'

/** 规格归一化实现与 API 层同源，避免两处归一化口径漂移。 */
export { normalizeSpecNumber }

/**
 * 供应商品牌价格表编辑器纯逻辑。
 *
 * <p>设计口径（见 `.local/design/supplier-price-list.md` R1.1）：版本编辑器**不自由增行**，
 * 行由规格全集固定生成，用户只填 `单价 / 状态 / 备注`；单价留空 = 不报价，
 * 与「0 元」严格区分，任何批量操作（整体加减 / TSV 粘贴）都不得把空价写成 0。</p>
 *
 * 本模块不依赖 React，便于单测覆盖边界。
 */

/** 状态枚举 → i18n key（中文文案由 `src/locales` 提供，键名映射在此集中维护）。 */
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

/** 固定行草稿：键来自规格全集，价格/状态/备注可编辑。 */
export type PriceDraftRow = {
  /**
   * 表格行身份。
   *
   * <p>规格全集理论上不应有重复键，但若后端返回重复，`key` 会相同；
   * 表格 rowKey / 错误映射必须用 uid 才能保证每行独立（否则 React key 冲突、错误互相覆盖）。</p>
   */
  uid: string
  /** 归一化条目键（category + material + spec + length），用于匹配与加减留痕 */
  key: string
  category: string
  material: string
  spec: number
  length: string
  sortOrder: number
  /** 已有条目的服务端 ID；规格全集新行没有 */
  itemId?: EntityId
  /** `null` = 不报价；`0` = 真实的 0 元 */
  price: number | null
  priceStatus: SupplierPriceItemStatus
  remark: string | null
}

export type PriceRowErrors = {
  spec?: string
  price?: string
  duplicate?: string
}

const KEY_SEPARATOR = '\u0000'
const EMPTY_KEY_SEPARATOR = '|'

/** 文本归一化：去首尾空白（材质/长度按去空白后的字面量作为键的一部分）。 */
function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 规格归一化为正整数。
 *
 * <p>`md_material.spec` 是 `varchar(64)`（可能带 `Φ`、`mm` 等前后缀），
 * 比价行 `mk_quote_item.spec` 是 integer，两端必须归一化到同一整数键。</p>
 */

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

export type BuildCatalogRowsResult = {
  rows: PriceDraftRow[]
  /** 规格全集里没有的旧版本条目（不得静默丢弃，由 UI 提示） */
  unmatchedPriorItems: SupplierPriceListItem[]
  /** 规格全集内 spec 无法归一化的脏行数 */
  invalidCatalogCount: number
}

/**
 * 用规格全集固定行，并从上一版本按归一化键带出已有价 / 状态 / 备注。
 *
 * @param catalog `GET /supplier-price-lists/spec-catalog` 的规格全集
 * @param priorItems 上一版本（或当前版本）的条目；新增版本时用于带价
 */
export function buildCatalogRows(
  catalog: SupplierPriceSpecCatalogEntry[],
  priorItems: SupplierPriceListItem[] = [],
): BuildCatalogRowsResult {
  const priorByKey = new Map<string, SupplierPriceListItem>()
  for (const item of priorItems) {
    const key = buildPriceRowKey(item)
    if (key && !priorByKey.has(key)) {
      priorByKey.set(key, item)
    }
  }

  const rows: PriceDraftRow[] = []
  const consumedKeys = new Set<string>()
  let invalidCatalogCount = 0

  for (const entry of catalog) {
    const key = buildPriceRowKey(entry)
    if (!key) {
      invalidCatalogCount += 1
      continue
    }
    const prior = priorByKey.get(key)
    if (prior) {
      consumedKeys.add(key)
    }
    rows.push({
      uid: `${key}#${rows.length}`,
      key,
      category: normalizeText(entry.category),
      material: normalizeText(entry.material),
      spec: normalizeSpecNumber(entry.spec) ?? 0,
      length: normalizeText(entry.length),
      sortOrder: Number.isFinite(entry.sortOrder)
        ? entry.sortOrder
        : rows.length,
      ...(prior?.id ? { itemId: prior.id } : {}),
      price: prior ? prior.price : null,
      priceStatus: prior ? prior.priceStatus : 'NORMAL',
      remark: prior ? prior.remark : null,
    })
  }

  const unmatchedPriorItems = priorItems.filter((item) => {
    const key = buildPriceRowKey(item)
    return Boolean(key) && !consumedKeys.has(key as string)
  })

  return { rows, unmatchedPriorItems, invalidCatalogCount }
}

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

/**
 * 行级校验：规格必须为正整数、单价不得为负、同一「材质+规格+长度」不得重复。
 *
 * <p>返回逐行错误（以 {@link PriceDraftRow.uid} 为键），UI 需要在行内展示，
 * 不能只弹一个全局提示。</p>
 */
export function validatePriceRows(
  rows: PriceDraftRow[],
): Map<string, PriceRowErrors> {
  const result = new Map<string, PriceRowErrors>()
  const mutate = (uid: string, patch: PriceRowErrors) => {
    result.set(uid, { ...result.get(uid), ...patch })
  }

  const seen = new Map<string, number>()
  for (const row of rows) {
    const key = buildPriceRowKey(row)
    if (key === null || !Number.isInteger(row.spec) || row.spec <= 0) {
      mutate(row.uid, { spec: '规格必须为正整数' })
    }
    if (row.price !== null && (!Number.isFinite(row.price) || row.price < 0)) {
      mutate(row.uid, { price: '单价不得为负' })
    }
    if (key !== null) {
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
  }

  for (const [duplicateKey, count] of seen) {
    if (count <= 1) {
      continue
    }
    for (const row of rows) {
      if (buildPriceRowKey(row) === duplicateKey) {
        mutate(row.uid, { duplicate: '同一材质+规格+长度的条目重复' })
      }
    }
  }

  return result
}

export function isRowFilled(row: PriceDraftRow): boolean {
  return row.price !== null
}

export type PriceRowFillFilter = 'ALL' | 'FILLED' | 'UNFILLED'

export type PriceRowFilter = {
  keyword?: string
  fill?: PriceRowFillFilter
  category?: string
  material?: string
}

function matchesKeyword(row: PriceDraftRow, keyword: string): boolean {
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
    row.remark ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

/** 编辑器筛选：关键字 + 类别 + 材质 + 只看已填/未填。 */
export function filterPriceRows(
  rows: PriceDraftRow[],
  filter: PriceRowFilter,
): PriceDraftRow[] {
  const fill = filter.fill ?? 'ALL'
  return rows.filter((row) => {
    if (fill === 'FILLED' && !isRowFilled(row)) {
      return false
    }
    if (fill === 'UNFILLED' && isRowFilled(row)) {
      return false
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

export type TsvPasteError = {
  /** 粘贴文本中的行号（从 1 开始，便于用户对回 Excel） */
  line: number
  message: string
  text: string
}

export type TsvPasteResult = {
  rows: PriceDraftRow[]
  errors: TsvPasteError[]
  appliedCount: number
  /** 由空单价清成「不报价」的行数（调用方需要二次确认） */
  clearedCount: number
  /** 单价为空但原本也没有报价，无需提示 */
  unchangedEmptyCount: number
}

/**
 * TSV 粘贴导入（从 Excel 复制）。
 *
 * <p>列布局：4 列 = `材质 / 规格 / 长度 / 单价`；5 列 = `类别 / 材质 / 规格 / 长度 / 单价`。
 * 只写能对齐到固定规格行的数据；行列数不足、规格非正整数、单价格式错误、无法对齐的行
 * 逐行报错且不写入。单价为空 = 不报价（`null`），绝不写 0。</p>
 */
export function applyTsvPaste(
  rows: PriceDraftRow[],
  text: string,
): TsvPasteResult {
  const next = rows.map((row) => ({ ...row }))
  const byFullKey = new Map<string, PriceDraftRow>()
  const byMaterialSpecLength = new Map<string, PriceDraftRow[]>()
  for (const row of next) {
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

    if (priceParsed.price === null) {
      if (target.price === null) {
        unchangedEmptyCount += 1
      } else {
        clearedCount += 1
      }
      target.price = null
      appliedCount += 1
      return
    }

    target.price = priceParsed.price
    if (target.priceStatus === 'OUT_OF_STOCK') {
      // 有价即视为正常报价，否则会出现「无货」却带价的矛盾状态
      target.priceStatus = 'NORMAL'
    }
    appliedCount += 1
  })

  return { rows: next, errors, appliedCount, clearedCount, unchangedEmptyCount }
}

export type AdjustmentPreviewRow = {
  itemId: EntityId | null
  key: string
  label: string
  priceBefore: number
  priceAfter: number
}

export type AdjustmentPreview = {
  mode: PriceAdjustmentMode
  amount: number
  rows: AdjustmentPreviewRow[]
  affectedCount: number
  /** 单价为空（不报价）的条目不参与加减，仅计数 */
  skippedCount: number
  negativeKeys: string[]
  /** 尚未保存到服务端的行（有价但无 itemId），不可参与整体加减 */
  unsavedCount: number
}

/**
 * 整体加减预览：只作用于已保存且 `price !== null` 的条目。
 *
 * <p>调用方**必须**先展示预览再由用户确认；本函数只做计算，不发起请求。</p>
 */
export function buildAdjustmentPreview(
  rows: PriceDraftRow[],
  mode: PriceAdjustmentMode,
  amount: number,
): AdjustmentPreview {
  const previewRows: AdjustmentPreviewRow[] = []
  const negativeKeys: string[] = []
  let skippedCount = 0
  let unsavedCount = 0

  for (const row of rows) {
    if (row.price === null) {
      skippedCount += 1
      continue
    }
    if (!row.itemId) {
      unsavedCount += 1
      continue
    }
    const priceAfter = mode === 'ADD' ? row.price + amount : row.price - amount
    if (priceAfter < 0) {
      negativeKeys.push(row.key)
    }
    previewRows.push({
      itemId: row.itemId,
      key: row.key,
      label: describePriceRow(row),
      priceBefore: row.price,
      priceAfter,
    })
  }

  return {
    mode,
    amount,
    rows: previewRows,
    affectedCount: previewRows.length,
    skippedCount,
    negativeKeys,
    unsavedCount,
  }
}

export function isAdjustmentAmountValid(amount: unknown): boolean {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0
}

/** 版本头（编辑器顶部表单字段）。 */
export type PriceListHeaderDraft = {
  /** 未选择供应商时为空串，由表单校验与 API 层的 ID 校验共同拦截 */
  supplierId: string
  brandName: string
  releasedAt: string
  effectiveFrom: string
  effectiveTo: string | null
  warehouse: string | null
  remark: string | null
}

/**
 * 由固定行生成提交载荷。
 *
 * <p>「不报价」是稀疏矩阵的空缺，因此完全默认的行（price 为空 + 状态 NORMAL + 无备注）
 * 不落库；显式状态或备注的行必须保留，否则「无货 / 价格单议」会丢失语义。</p>
 */
export function buildPriceListPayload(
  header: PriceListHeaderDraft,
  rows: PriceDraftRow[],
): SupplierPriceListPayload {
  const items: SupplierPriceListItemPayload[] = []
  rows.forEach((row, index) => {
    const hasMeaningfulState =
      row.price !== null ||
      row.priceStatus !== 'NORMAL' ||
      Boolean(row.remark && row.remark.trim())
    if (!hasMeaningfulState) {
      return
    }
    items.push({
      category: row.category,
      material: row.material,
      spec: row.spec,
      length: row.length,
      price: row.price,
      priceStatus: row.priceStatus,
      remark: row.remark?.trim() ? row.remark.trim() : null,
      sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : index,
    })
  })
  return {
    supplierId: header.supplierId,
    brandName: header.brandName.trim(),
    releasedAt: header.releasedAt,
    effectiveFrom: header.effectiveFrom,
    effectiveTo: header.effectiveTo,
    warehouse: header.warehouse?.trim() ? header.warehouse.trim() : null,
    remark: header.remark?.trim() ? header.remark.trim() : null,
    items,
  }
}

export type PriceDraftStats = {
  total: number
  filled: number
  empty: number
  statusCounts: Record<SupplierPriceItemStatus, number>
}

/** 编辑器概览统计（固定行总数 / 已填 / 未填 / 各状态计数）。 */
export function computeDraftStats(rows: PriceDraftRow[]): PriceDraftStats {
  const statusCounts = {
    NORMAL: 0,
    PENDING: 0,
    BUNDLED: 0,
    NEGOTIABLE: 0,
    OUT_OF_STOCK: 0,
  } satisfies Record<SupplierPriceItemStatus, number>
  let filled = 0
  for (const row of rows) {
    if (row.price !== null) {
      filled += 1
    }
    statusCounts[row.priceStatus] += 1
  }
  return {
    total: rows.length,
    filled,
    empty: rows.length - filled,
    statusCounts,
  }
}
