import { z } from 'zod'
import { apiDeleteNoContent, apiGet, apiPost, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  exactPageSchema,
  responseNonNegativeIntegerSchema,
  responsePositiveIntegerSchema,
} from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'

/**
 * 供应商品牌价格表 API。
 *
 * <p>契约见 `.local/design/supplier-price-list.md` §4.6 修订 R2：**取消版本**，
 * 一个（供应商 + 品牌）只有一张价格表（唯一键 = `supplier_id + brand_name`）；
 * 条目只要 `(category, material, spec, length) → price`，`price = null` 表示「不报价」，
 * 与「0 元」严格区分；雪花 ID 全程十进制字符串。</p>
 *
 * <p>R2 作废了 `releasedAt` / `status` / `effectiveFrom` / `effectiveTo` 语义：响应里这些字段
 * 一律不再读取（旧后端字段仍在时仅做兼容忽略），列表每行是一个（供应商, 品牌）现表。</p>
 */

/**
 * 条目报价状态。
 *
 * <p>R2.2：数据层保留该字段，维护页**不再展示与编辑**；这里保留类型与归一化是为了
 * `PUT` 全量替换时不把服务端已有语义（无货/价格单议等）丢失。</p>
 */
export const PRICE_ITEM_STATUSES = [
  'NORMAL',
  'PENDING',
  'BUNDLED',
  'NEGOTIABLE',
  'OUT_OF_STOCK',
] as const

export type SupplierPriceItemStatus = (typeof PRICE_ITEM_STATUSES)[number]

/** 整体加减方向。 */
export type PriceAdjustmentMode = 'ADD' | 'SUBTRACT'

export type SupplierPriceListItem = {
  /** 已有条目的服务端 ID；新建草稿行没有 */
  id?: EntityId
  category: string
  material: string
  spec: number
  length: string
  /** `null` = 不报价（禁止用 0 表示不报价） */
  price: number | null
  priceStatus: SupplierPriceItemStatus
  remark: string | null
  sortOrder: number
}

/**
 * 价格表摘要 = 一个（供应商, 品牌）的现表。
 *
 * <p>`updatedAt` 取代原「发布时刻」作为展示用的更新时间；`releasedAt` / `status` 仅在
 * 后端尚未切到 R2 契约时作兼容兜底（前端不展示）。</p>
 */
export type SupplierPriceListSummary = {
  id: EntityId
  supplierId: EntityId
  supplierName: string
  brandName: string
  /** 更新时间（R2 之前为 `released_at`，之后为 `updated_at`） */
  updatedAt: string
  itemCount: number
  version?: number
}

export type SupplierPriceListDetail = SupplierPriceListSummary & {
  items: SupplierPriceListItem[]
}

/** 规格全集条目：矩阵固定行，用户只在品牌列里填单价。 */
export type SupplierPriceSpecCatalogEntry = {
  category: string
  material: string
  spec: number
  length: string
  sortOrder: number
}

export type SupplierPriceListQuery = {
  supplierId?: EntityId
  brandName?: string
  page: number
  size: number
}

export type SupplierPriceListPage = {
  content: SupplierPriceListSummary[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

/** 创建/全量替换价格表的条目载荷。 */
export type SupplierPriceListItemPayload = {
  category: string
  material: string
  spec: number
  price: number | null
  length: string
  priceStatus: SupplierPriceItemStatus
  remark: string | null
  sortOrder: number
}

export type SupplierPriceListPayload = {
  supplierId: EntityId
  brandName: string
  items: SupplierPriceListItemPayload[]
}

export type SupplierPriceAdjustmentPayload = {
  mode: PriceAdjustmentMode
  amount: number
  /** 省略/空数组 = 整表 */
  itemIds?: EntityId[]
}

export type SupplierPriceAdjustmentResult = {
  adjustmentId: EntityId
  affectedCount: number
  /** 显式指定但 price 为 NULL（不报价）而被跳过的条目数 */
  skippedCount: number
  items: { id: EntityId; price: number | null }[]
}

export type SupplierPriceMatrixColumn = {
  supplierId: EntityId
  supplierName: string
  brandName: string
  listId: EntityId | null
  updatedAt: string | null
}

export type SupplierPriceMatrixCell = {
  brandName: string
  price: number | null
  priceStatus: SupplierPriceItemStatus
  listId: EntityId | null
}

export type SupplierPriceMatrixRow = {
  category: string
  material: string
  spec: number
  length: string
  cells: SupplierPriceMatrixCell[]
}

export type SupplierPriceMatrix = {
  columns: SupplierPriceMatrixColumn[]
  rows: SupplierPriceMatrixRow[]
}

export type SupplierPriceListMatrixQuery = {
  supplierIds?: EntityId[]
  brandNames?: string[]
  category?: string
}

const priceItemStatusSchema = z.enum(PRICE_ITEM_STATUSES)

/** numeric(12,2) 允许 number 或十进制字符串；非法取值失败关闭，不得静默变 0。 */
const priceValueSchema = z.union([
  z.number(),
  z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d+)?$/, '单价格式错误'),
])

/** 规格 = 直径 mm，必须为正整数（md_material.spec 为字符串，需归一化为整数）。 */
const specValueSchema = z.union([
  responsePositiveIntegerSchema,
  z
    .string()
    .trim()
    .regex(/^\d+$/, '规格必须为正整数')
    .transform(Number)
    .pipe(z.number().int().positive()),
])

const integerLikeSchema = z.union([
  z.number().int(),
  z
    .string()
    .trim()
    .regex(/^-?\d+$/)
    .transform(Number),
])

const summaryFields = {
  id: z.unknown(),
  supplierId: z.unknown(),
  supplierName: z.string().nullish(),
  brandName: z.string(),
  // R2: updatedAt 取代 releasedAt；两者都缺时留空字符串（不渲染更新时间）
  updatedAt: z.string().nullish(),
  releasedAt: z.string().nullish(),
  itemCount: responseNonNegativeIntegerSchema.nullish(),
  // 兼容后端早期命名；三者取第一个可用值
  itemsCount: responseNonNegativeIntegerSchema.nullish(),
  itemTotal: responseNonNegativeIntegerSchema.nullish(),
  version: integerLikeSchema.nullish(),
}

const summaryRowSchema = z.looseObject(summaryFields)

const itemRowSchema = z.looseObject({
  id: z.unknown().nullish(),
  category: z.string().nullish(),
  material: z.string(),
  spec: specValueSchema,
  length: z.string().nullish(),
  price: priceValueSchema.nullish(),
  priceStatus: z.string().nullish(),
  remark: z.string().nullish(),
  sortOrder: integerLikeSchema.nullish(),
})

const detailRowSchema = z.looseObject({
  ...summaryFields,
  items: z.array(itemRowSchema).nullish(),
})

const supplierPriceListPageSchema = exactPageSchema(summaryRowSchema)

const specCatalogRowSchema = z.looseObject({
  category: z.string().nullish(),
  material: z.string(),
  spec: specValueSchema,
  length: z.string().nullish(),
  sortOrder: integerLikeSchema.nullish(),
})

const adjustmentResponseSchema = z.looseObject({
  adjustmentId: z.unknown(),
  affectedCount: responseNonNegativeIntegerSchema.nullish(),
  skippedCount: responseNonNegativeIntegerSchema.nullish(),
  items: z
    .array(
      z.looseObject({
        id: z.unknown(),
        price: priceValueSchema.nullish(),
      }),
    )
    .nullish(),
})

const matrixColumnSchema = z.looseObject({
  supplierId: z.unknown(),
  supplierName: z.string().nullish(),
  brandName: z.string(),
  listId: z.unknown().nullish(),
  updatedAt: z.string().nullish(),
  releasedAt: z.string().nullish(),
})

const matrixCellSchema = z.looseObject({
  brandName: z.string(),
  price: priceValueSchema.nullish(),
  priceStatus: z.string().nullish(),
  listId: z.unknown().nullish(),
})

const matrixRowSchema = z.looseObject({
  category: z.string().nullish(),
  material: z.string(),
  spec: specValueSchema,
  length: z.string().nullish(),
  cells: z.array(matrixCellSchema).nullish(),
})

const matrixSchema = z.looseObject({
  columns: z.array(matrixColumnSchema),
  rows: z.array(matrixRowSchema),
})

/** 归一化单价格：`null`/空串 → 不报价；`0` 保持为 0。 */
export function normalizePriceValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 规格归一化为正整数。
 *
 * <p>`md_material.spec` 是 `varchar(64)`（可能带 `Φ`、`mm` 等前后缀），
 * 而条目键与比价行要求 integer，两端必须归一化到同一整数键。</p>
 */
export function normalizeSpecNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null
  }
  if (typeof value !== 'string') {
    return null
  }
  const text = value.trim()
  if (!text || text.includes('-')) {
    // 负数/区间（如 `-3`、`12-14`）没有唯一整数语义，不做猜测
    return null
  }
  // 容忍前后缀（`Φ12`、`12mm`、`12米`），但要求只有一个数字段
  const matched = /^[^\d]*(\d+)[^\d]*$/.exec(text)
  if (!matched) {
    return null
  }
  const parsed = Number(matched[1])
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/** 规格为条目键的一部分：无法归一化时失败关闭，不得写成 0。 */
function requireSpecNumber(value: unknown, field: string): number {
  const spec = normalizeSpecNumber(value)
  if (spec === null) {
    throw new Error(`规格契约无效（必须为正整数）：${field}`)
  }
  return spec
}

/** 未知/新增状态枚举降级为 NORMAL，避免单条脏数据让整页打不开。 */
export function normalizePriceItemStatus(
  value: unknown,
): SupplierPriceItemStatus {
  const parsed = priceItemStatusSchema.safeParse(value)
  return parsed.success ? parsed.data : 'NORMAL'
}

type SummaryRaw = z.infer<typeof summaryRowSchema>
type ItemRaw = z.infer<typeof itemRowSchema>

function normalizeSummary(
  raw: SummaryRaw,
  field: string,
): SupplierPriceListSummary {
  return {
    id: parseEntityId(raw.id, `${field}.id`),
    supplierId: parseEntityId(raw.supplierId, `${field}.supplierId`),
    supplierName: raw.supplierName ?? '',
    brandName: raw.brandName,
    // R2: 更新时间优先取 updatedAt，旧后端只有 releasedAt 时兜底
    updatedAt: raw.updatedAt ?? raw.releasedAt ?? '',
    itemCount: raw.itemCount ?? raw.itemsCount ?? raw.itemTotal ?? 0,
    ...(raw.version == null ? {} : { version: raw.version }),
  }
}

function normalizeItem(raw: ItemRaw, field: string): SupplierPriceListItem {
  return {
    ...(raw.id == null ? {} : { id: parseEntityId(raw.id, `${field}.id`) }),
    category: raw.category ?? '',
    material: raw.material,
    spec: requireSpecNumber(raw.spec, `${field}.spec`),
    length: raw.length ?? '',
    price: normalizePriceValue(raw.price),
    priceStatus: normalizePriceItemStatus(raw.priceStatus),
    remark: raw.remark ?? null,
    sortOrder: raw.sortOrder ?? 0,
  }
}

function normalizeDetail(
  raw: z.infer<typeof detailRowSchema>,
  field: string,
): SupplierPriceListDetail {
  return {
    ...normalizeSummary(raw, field),
    items: (raw.items ?? []).map((item, index) =>
      normalizeItem(item, `${field}.items[${index}]`),
    ),
  }
}

function buildListQueryParams(query: SupplierPriceListQuery) {
  return {
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.brandName ? { brandName: query.brandName } : {}),
    page: Math.max(query.page - 1, 0),
    size: Math.min(Math.max(query.size, 1), 200),
  }
}

/** 分页查询价格表现表（每行一个「供应商 + 品牌」）。 */
export async function fetchSupplierPriceLists(
  query: SupplierPriceListQuery,
  signal?: AbortSignal,
): Promise<SupplierPriceListPage> {
  const response = await apiGet(
    ENDPOINTS.SUPPLIER_PRICE_LISTS,
    supplierPriceListPageSchema,
    {
      params: buildListQueryParams(query),
      ...(signal ? { signal } : {}),
    },
  )
  return {
    ...response,
    content: response.content.map((row, index) =>
      normalizeSummary(row, `supplierPriceLists[${index}]`),
    ),
  }
}

/**
 * 单页最大条数（与 `buildListQueryParams` 的 `size` 上限一致）。
 *
 * <p>取全量时按这个页大小翻页，避免出现「接口允许 200、这里却按 100 翻页」的双份事实。</p>
 */
const PRICE_LIST_PAGE_SIZE = 200

/** 安全上限：供应商数量级远小于此值，防止后端分页契约异常时无限翻页。 */
const PRICE_LIST_MAX_PAGES = 50

/**
 * 取某供应商（或全部）的价格表**全量**摘要。
 *
 * <p>矩阵编辑器需要一次性拿到该供应商全部（品牌）现表：品牌列 = 已有价格表的品牌 ∪
 * 经营品牌，缺了任何一页都会把已有品牌的列错判成「尚无价格表」。因此这里显式翻页，
 * 直到取满 `totalElements` 或触达安全上限。</p>
 */
export async function fetchAllSupplierPriceLists(
  query: { supplierId?: EntityId } = {},
  signal?: AbortSignal,
): Promise<SupplierPriceListSummary[]> {
  const collected: SupplierPriceListSummary[] = []
  for (let page = 1; page <= PRICE_LIST_MAX_PAGES; page += 1) {
    const response = await fetchSupplierPriceLists(
      {
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        page,
        size: PRICE_LIST_PAGE_SIZE,
      },
      signal,
    )
    collected.push(...response.content)
    if (
      response.content.length === 0 ||
      collected.length >= response.totalElements ||
      page >= response.totalPages
    ) {
      break
    }
  }
  return collected
}

/** 读取单个（供应商, 品牌）价格表 + 条目全量。 */
export async function fetchSupplierPriceList(
  id: EntityId,
  signal?: AbortSignal,
): Promise<SupplierPriceListDetail> {
  const raw = await apiGet(
    ENDPOINTS.SUPPLIER_PRICE_LIST(parseEntityId(id, 'priceListId')),
    detailRowSchema,
    signal ? { signal } : {},
  )
  return normalizeDetail(raw, `supplierPriceList[${id}]`)
}

/**
 * 规格全集（只读投影）。
 * 矩阵编辑器据此固定行，用户只在品牌列里填价。
 */
export async function fetchSupplierPriceSpecCatalog(
  query: { category?: string; material?: string } = {},
  signal?: AbortSignal,
): Promise<SupplierPriceSpecCatalogEntry[]> {
  const rows = await apiGet(
    ENDPOINTS.SUPPLIER_PRICE_LIST_SPEC_CATALOG,
    z.array(specCatalogRowSchema),
    {
      params: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.material ? { material: query.material } : {}),
      },
      ...(signal ? { signal } : {}),
    },
  )
  return rows.map((row, index) => ({
    category: row.category ?? '',
    material: row.material,
    spec: requireSpecNumber(row.spec, `specCatalog[${index}].spec`),
    length: row.length ?? '',
    sortOrder: row.sortOrder ?? 0,
  }))
}

function buildItemsBody(items: SupplierPriceListItemPayload[]) {
  return items.map((item) => ({
    category: item.category,
    material: item.material,
    spec: item.spec,
    length: item.length,
    price: item.price,
    priceStatus: item.priceStatus,
    remark: item.remark,
    sortOrder: item.sortOrder,
  }))
}

/** 建表（同一供应商 + 品牌已存在未删除现表 → 后端 409）。 */
export async function createSupplierPriceList(
  payload: SupplierPriceListPayload,
): Promise<SupplierPriceListDetail> {
  const raw = await apiPost(
    ENDPOINTS.SUPPLIER_PRICE_LISTS,
    detailRowSchema,
    {
      supplierId: parseEntityId(payload.supplierId, 'supplierId'),
      brandName: payload.brandName,
      items: buildItemsBody(payload.items),
    },
    withIdempotencyKey(),
  )
  return normalizeDetail(raw, 'supplierPriceList.create')
}

/** 全量替换条目（幂等）。 */
export async function updateSupplierPriceList(
  id: EntityId,
  payload: SupplierPriceListPayload,
): Promise<SupplierPriceListDetail> {
  const priceListId = parseEntityId(id, 'priceListId')
  const raw = await apiPut(
    ENDPOINTS.SUPPLIER_PRICE_LIST(priceListId),
    detailRowSchema,
    {
      supplierId: parseEntityId(payload.supplierId, 'supplierId'),
      brandName: payload.brandName,
      items: buildItemsBody(payload.items),
    },
    withIdempotencyKey(),
  )
  return normalizeDetail(raw, `supplierPriceList[${priceListId}]`)
}

/** 删除（软删）单个（供应商, 品牌）价格表。 */
export async function deleteSupplierPriceList(id: EntityId): Promise<void> {
  await apiDeleteNoContent(
    ENDPOINTS.SUPPLIER_PRICE_LIST(parseEntityId(id, 'priceListId')),
  )
}

/** 整表/选区加减；只影响 `price IS NOT NULL` 的条目。 */
export async function createSupplierPriceAdjustment(
  id: EntityId,
  payload: SupplierPriceAdjustmentPayload,
): Promise<SupplierPriceAdjustmentResult> {
  const raw = await apiPost(
    ENDPOINTS.SUPPLIER_PRICE_LIST_PRICE_ADJUSTMENTS(
      parseEntityId(id, 'priceListId'),
    ),
    adjustmentResponseSchema,
    {
      mode: payload.mode,
      amount: payload.amount,
      ...(payload.itemIds?.length
        ? {
            itemIds: payload.itemIds.map((itemId, index) =>
              parseEntityId(itemId, `itemIds[${index}]`),
            ),
          }
        : {}),
    },
    withIdempotencyKey(),
  )
  return {
    adjustmentId: parseEntityId(raw.adjustmentId, 'adjustmentId'),
    affectedCount: raw.affectedCount ?? 0,
    skippedCount: raw.skippedCount ?? 0,
    items: (raw.items ?? []).map((item, index) => ({
      id: parseEntityId(item.id, `adjustment.items[${index}].id`),
      price: normalizePriceValue(item.price),
    })),
  }
}

/** 只读对照矩阵（跨供应商/品牌）。 */
export async function fetchSupplierPriceListMatrix(
  query: SupplierPriceListMatrixQuery = {},
  signal?: AbortSignal,
): Promise<SupplierPriceMatrix> {
  const raw = await apiGet(ENDPOINTS.SUPPLIER_PRICE_LIST_MATRIX, matrixSchema, {
    params: {
      ...(query.supplierIds?.length
        ? { supplierIds: query.supplierIds.join(',') }
        : {}),
      ...(query.brandNames?.length
        ? { brandNames: query.brandNames.join(',') }
        : {}),
      ...(query.category ? { category: query.category } : {}),
    },
    ...(signal ? { signal } : {}),
  })
  return {
    columns: raw.columns.map((column, index) => ({
      supplierId: parseEntityId(
        column.supplierId,
        `matrix.columns[${index}].supplierId`,
      ),
      supplierName: column.supplierName ?? '',
      brandName: column.brandName,
      listId:
        parseOptionalEntityId(
          column.listId,
          `matrix.columns[${index}].listId`,
        ) ?? null,
      updatedAt: column.updatedAt ?? column.releasedAt ?? null,
    })),
    rows: raw.rows.map((row, index) => ({
      category: row.category ?? '',
      material: row.material,
      spec: requireSpecNumber(row.spec, `matrix.rows[${index}].spec`),
      length: row.length ?? '',
      cells: (row.cells ?? []).map((cell, cellIndex) => ({
        brandName: cell.brandName,
        price: normalizePriceValue(cell.price),
        priceStatus: normalizePriceItemStatus(cell.priceStatus),
        listId:
          parseOptionalEntityId(
            cell.listId,
            `matrix.rows[${index}].cells[${cellIndex}].listId`,
          ) ?? null,
      })),
    })),
  }
}
