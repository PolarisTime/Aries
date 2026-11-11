import { z } from 'zod'
import {
  apiDeleteNoContent,
  apiDeleteResponse,
  apiGet,
  apiPost,
  apiPostResponse,
  apiPut,
  apiPutResponse,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'
import {
  normalizeVersion,
  readResourceVersionHeader,
  withConcurrencyHeaders,
} from './quote-concurrency'

/** 数字或数字字符串统一为 number; 空值返回 undefined。 */
function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const brandSchema = z.looseObject({
  brandName: z.string(),
  freight: z.union([z.number(), z.string()]).nullable().optional(),
  sortOrder: z.union([z.number(), z.string()]).nullable().optional(),
})

const priceSchema = z.looseObject({
  brandName: z.string(),
  spotPrice: z.union([z.number(), z.string()]).nullable().optional(),
  supplierId: z.union([z.number(), z.string()]).nullable().optional(),
  supplierName: z.string().nullable().optional(),
  /*
   * 抗震牌号代取的来源材质。**必须用 nullish**：后端未代取时显式给 `null`
   * （"查过、确认没代取"），而字段缺失是另一件事。用 `optional()` 会把 `null`
   * 归一成 `undefined`，两者就分不开了；用 `nullable().optional()` + 手动分支也一样，
   * 不如让 zod 原样保留。
   */
  spotSourceMaterial: z.string().nullish(),
})

const itemSchema = z.looseObject({
  id: z.unknown(),
  rowType: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  spec: z.union([z.number(), z.string()]).nullable().optional(),
  length: z.string().nullable().optional(),
  ton: z.union([z.number(), z.string()]).nullable().optional(),
  remark: z.string().nullable().optional(),
  locked: z.boolean().nullable().optional(),
  prices: z.array(priceSchema).nullable().optional(),
})

const sheetSchema = z.looseObject({
  id: z.unknown(),
  sheetNo: z.string().nullable().optional(),
  name: z.string(),
  projectId: z.union([z.number(), z.string()]).nullable().optional(),
  projectName: z.string().nullable().optional(),
  orderDate: z.string(),
  refDate: z.string(),
  refPeriod: z.string(),
  lengthPremium: z.union([z.number(), z.string()]).nullable().optional(),
  locked: z.boolean().nullable().optional(),
  specQuantityLocked: z.boolean().nullable().optional(),
  status: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  brands: z.array(brandSchema).nullable().optional(),
  items: z.array(itemSchema).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  /** 服务端最后落库时间(ISO 8601): 供「保存时间」展示。 */
  updatedAt: z.string().nullable().optional(),
  version: z.union([z.number(), z.string()]).nullable().optional(),
})

const sheetPageSchema = z.looseObject({
  content: z.array(sheetSchema),
  totalElements: z.union([z.number(), z.string()]),
  totalPages: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
})

export type QuoteSheetPriceRecord = {
  brandName: string
  spotPrice?: number
  supplierId?: EntityId
  supplierName?: string
  /**
   * 这个现货价是「按抗震牌号代取」时实际命中的材质（如报 HRB400、现货只有 HRB400E）。
   *
   * <p><b>`null` 与 `undefined` 语义不同，不能合并</b>：后端未代取时**显式返回 `null`**
   * （= 查过、确认没有代取）；字段缺失（`undefined`）才表示"这条响应没带这个信息"
   * （旧版本后端 / 其它写路径）。角标判据依赖这个区分（{@code null} 不显示角标，
   * 但也不能把它当成"没查过"）。</p>
   */
  spotSourceMaterial?: string | null
}

export type QuoteSheetItemRecord = {
  id: EntityId
  rowType?: 'PRODUCT' | 'SEPARATOR'
  category: string
  material: string
  spec?: number
  length: string
  ton?: number
  remark?: string
  /** 是否锁定(行锁: 只冻结该行规格与吨位; 隔断行恒为 false)。 */
  locked: boolean
  prices: QuoteSheetPriceRecord[]
}

export type QuoteSheetBrandRecord = {
  brandName: string
  freight: number
  sortOrder: number
}

export type QuoteSheetRecord = {
  id: EntityId
  sheetNo?: string
  name: string
  projectId?: EntityId
  projectName?: string
  orderDate: string
  refDate: string
  refPeriod: string
  lengthPremium: number
  locked: boolean
  specQuantityLocked: boolean
  status?: string
  remark?: string
  brands: QuoteSheetBrandRecord[]
  items: QuoteSheetItemRecord[]
  /** 服务端创建时间(ISO 8601)。 */
  createdAt?: string
  /** 服务端最后落库时间(ISO 8601): 供「保存时间」展示。 */
  updatedAt?: string
  version: string
}

/** 保存请求体(整体替换)。 */
export type QuoteSheetPayload = {
  name: string
  projectId?: EntityId
  projectName?: string
  orderDate: string
  refDate: string
  refPeriod: string
  lengthPremium: number
  locked: boolean
  specQuantityLocked: boolean
  status?: string
  remark?: string
  brands: QuoteSheetBrandRecord[]
  items: {
    rowType: 'PRODUCT' | 'SEPARATOR'
    category?: string
    material?: string
    spec?: number
    length?: string
    ton?: number
    remark?: string
    locked?: boolean
    prices: {
      brandName: string
      spotPrice?: number
      supplierId?: EntityId
    }[]
  }[]
}

/** 行级保存请求体(整行替换)。 */
export type QuoteSheetItemPayload = {
  rowType: 'PRODUCT' | 'SEPARATOR'
  category?: string
  material?: string
  spec?: number
  length?: string
  ton?: number
  remark?: string
  locked?: boolean
  prices: {
    brandName: string
    spotPrice?: number
    supplierId?: EntityId
    /**
     * 现货价「按抗震牌号代取」的来源材质（**写入口径**）。
     *
     * <p><b>注意请求与响应的字段名不同</b>：写请求叫 `sourceMaterial`
     * （后端 `QuoteSheetRequest.ItemPriceRequest`），响应才是 `spotSourceMaterial`
     * （`QuoteSheetResponse`）。按响应名去写会被 Jackson 当未知字段静默忽略 ——
     * 实测后果：价格存进去了、来源丢了，刷新后角标消失。</p>
     *
     * <p>`null` 是有效载荷：表示"曾经代取、已被手工覆盖"，用于让服务端清空来源；
     * 省略该字段表示这一格从未涉及代取（服务端保持原值）。</p>
     */
    sourceMaterial?: string | null
  }[]
}

/** 表头保存请求体(不携带 brands/items, 后端仅更新表头字段)。 */
export type QuoteSheetHeaderPayload = {
  name: string
  projectId?: EntityId
  projectName?: string
  orderDate: string
  refDate: string
  refPeriod: string
  lengthPremium: number
  locked: boolean
  specQuantityLocked: boolean
  status?: string
  remark?: string
}

function normalizePrice(
  raw: z.infer<typeof priceSchema>,
  index: number,
): QuoteSheetPriceRecord {
  return {
    brandName: raw.brandName,
    ...(toOptionalNumber(raw.spotPrice) !== undefined
      ? { spotPrice: toOptionalNumber(raw.spotPrice) }
      : {}),
    ...(parseOptionalEntityId(raw.supplierId, `prices[${index}].supplierId`)
      ? {
          supplierId: parseOptionalEntityId(
            raw.supplierId,
            `prices[${index}].supplierId`,
          ),
        }
      : {}),
    ...(raw.supplierName ? { supplierName: raw.supplierName } : {}),
    /*
     * 三态原样透传：有值 → 字符串；后端明确未代取 → `null`；字段缺失 → 不写这个 key
     * （= `undefined`）。这里刻意不用 `raw.spotSourceMaterial || undefined` 之类的归一，
     * 否则 `null` 会被抹成 `undefined`，"查过确认没代取"就退化成"不知道"。
     */
    ...(raw.spotSourceMaterial !== undefined
      ? { spotSourceMaterial: raw.spotSourceMaterial }
      : {}),
  }
}

function normalizeItem(
  item: z.infer<typeof itemSchema>,
  path: string,
): QuoteSheetItemRecord {
  const rowType = item.rowType === 'SEPARATOR' ? 'SEPARATOR' : 'PRODUCT'
  return {
    id: parseEntityId(item.id, `${path}.id`),
    rowType,
    category: asString(item.category).trim(),
    material: asString(item.material).trim(),
    length: asString(item.length).trim(),
    ...(toOptionalNumber(item.spec) !== undefined
      ? { spec: toOptionalNumber(item.spec) }
      : {}),
    ...(toOptionalNumber(item.ton) !== undefined
      ? { ton: toOptionalNumber(item.ton) }
      : {}),
    ...(asString(item.remark).trim() ? { remark: asString(item.remark) } : {}),
    // 隔断行不携带锁定标记。
    locked: rowType === 'SEPARATOR' ? false : Boolean(item.locked),
    prices: (item.prices ?? []).map((price, priceIndex) =>
      normalizePrice(price, priceIndex),
    ),
  }
}

function normalizeSheet(
  raw: z.infer<typeof sheetSchema>,
  index: number,
): QuoteSheetRecord {
  const projectId = parseOptionalEntityId(
    raw.projectId,
    `sheets[${index}].projectId`,
  )
  const items: QuoteSheetItemRecord[] = (raw.items ?? []).map(
    (item, itemIndex) =>
      normalizeItem(item, `sheets[${index}].items[${itemIndex}]`),
  )
  return {
    id: parseEntityId(raw.id, `sheets[${index}].id`),
    name: raw.name,
    orderDate: raw.orderDate,
    refDate: raw.refDate,
    refPeriod: raw.refPeriod,
    lengthPremium: toOptionalNumber(raw.lengthPremium) ?? 30,
    locked: Boolean(raw.locked),
    specQuantityLocked: Boolean(raw.specQuantityLocked),
    brands: (raw.brands ?? []).map((brand, brandIndex) => ({
      brandName: brand.brandName,
      freight: toOptionalNumber(brand.freight) ?? 0,
      sortOrder: toOptionalNumber(brand.sortOrder) ?? brandIndex,
    })),
    items,
    version: normalizeVersion(raw.version) ?? '',
    ...(raw.sheetNo ? { sheetNo: raw.sheetNo } : {}),
    ...(projectId ? { projectId } : {}),
    ...(raw.projectName ? { projectName: raw.projectName } : {}),
    ...(raw.status ? { status: raw.status } : {}),
    ...(raw.remark ? { remark: raw.remark } : {}),
    ...(raw.createdAt ? { createdAt: raw.createdAt } : {}),
    ...(raw.updatedAt ? { updatedAt: raw.updatedAt } : {}),
  }
}

/** 报单比价单据分页(返回已归一化的记录)。 */
export async function fetchQuoteSheets(
  signal?: AbortSignal,
): Promise<QuoteSheetRecord[]> {
  const response = await apiGet(ENDPOINTS.QUOTE_SHEETS, sheetPageSchema, {
    params: { page: 0, size: 200 },
    ...(signal ? { signal } : {}),
  })
  return response.content.map(normalizeSheet)
}

/** 单据详情。 */
export async function fetchQuoteSheet(
  id: EntityId,
  signal?: AbortSignal,
): Promise<QuoteSheetRecord> {
  const response = await apiGet(ENDPOINTS.QUOTE_SHEET(id), sheetSchema, {
    ...(signal ? { signal } : {}),
  })
  return normalizeSheet(response, 0)
}

/**
 * 报价单写接口均带 `X-Idempotency-Key`：后端 `V2QuoteSheetController` 是类级
 * `@IdempotencyRequired`，POST/PUT/DELETE 缺该头会 422。
 *
 * <p>`idempotencyKey` 可选：调用方在同一次用户动作内重试时应传入同一个 key（例如冲突后
 * 重新取版本重发），不传则由 {@link withIdempotencyKey} 在本次请求创建时生成一次；
 * 401 换令牌重试用的是同一份请求配置，因此 key 不会变化。</p>
 */
export async function createQuoteSheet(
  payload: QuoteSheetPayload,
  idempotencyKey?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPost(
    ENDPOINTS.QUOTE_SHEETS,
    sheetSchema,
    payload,
    withIdempotencyKey(undefined, idempotencyKey),
  )
  return normalizeSheet(response, 0)
}

export async function updateQuoteSheet(
  id: EntityId,
  payload: QuoteSheetPayload,
  expectedVersion?: string,
  idempotencyKey?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET(id),
    sheetSchema,
    payload,
    withIdempotencyKey(withConcurrencyHeaders(expectedVersion), idempotencyKey),
  )
  return normalizeSheet(response, 0)
}

export async function deleteQuoteSheet(
  id: EntityId,
  idempotencyKey?: string,
): Promise<void> {
  await apiDeleteNoContent(
    ENDPOINTS.QUOTE_SHEET(id),
    withIdempotencyKey(undefined, idempotencyKey),
  )
}

/** 仅保存表头字段(不传 brands/items), 携带 If-Match 版本。 */
export async function updateQuoteSheetHeader(
  id: EntityId,
  payload: QuoteSheetHeaderPayload,
  expectedVersion?: string,
  idempotencyKey?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET(id),
    sheetSchema,
    payload,
    withIdempotencyKey(withConcurrencyHeaders(expectedVersion), idempotencyKey),
  )
  return normalizeSheet(response, 0)
}

/** 行级写结果: 新行(删除时无) + 服务端权威单据版本。 */
export type QuoteSheetItemWriteResult = {
  item?: QuoteSheetItemRecord
  version?: string
}

/** 新增商品行(201), 返回新行与服务端权威单据版本。 */
export async function addQuoteSheetItem(
  id: EntityId,
  payload: QuoteSheetItemPayload,
  expectedVersion?: string,
  idempotencyKey?: string,
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiPostResponse(
    ENDPOINTS.QUOTE_SHEET_ITEMS(id),
    itemSchema,
    payload,
    withIdempotencyKey(withConcurrencyHeaders(expectedVersion), idempotencyKey),
  )
  return {
    item: normalizeItem(response.data, 'quoteSheetItem'),
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}

/** 整行替换商品行, 返回新行与服务端权威单据版本。 */
export async function updateQuoteSheetItem(
  id: EntityId,
  itemId: EntityId,
  payload: QuoteSheetItemPayload,
  expectedVersion?: string,
  idempotencyKey?: string,
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiPutResponse(
    ENDPOINTS.QUOTE_SHEET_ITEM(id, itemId),
    itemSchema,
    payload,
    withIdempotencyKey(withConcurrencyHeaders(expectedVersion), idempotencyKey),
  )
  return {
    item: normalizeItem(response.data, 'quoteSheetItem'),
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}

/**
 * 调整商品行顺序(子资源 item-order), 返回权威单据(含归一化后的行号)。
 * <p>提交期望顺序(十进制字符串 id); 未提交的行保持相对顺序排在末尾。
 * 行级差异保存不带位置信息, 顺序变化必须走该接口, 否则刷新会恢复原顺序。</p>
 */
export async function reorderQuoteSheetItems(
  id: EntityId,
  itemIds: EntityId[],
  expectedVersion?: string,
  idempotencyKey?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET_ITEM_ORDER(id),
    sheetSchema,
    { itemIds },
    withIdempotencyKey(withConcurrencyHeaders(expectedVersion), idempotencyKey),
  )
  return normalizeSheet(response, 0)
}

/** 删除商品行(204), 返回服务端权威单据版本。 */
export async function deleteQuoteSheetItem(
  id: EntityId,
  itemId: EntityId,
  expectedVersion?: string,
  idempotencyKey?: string,
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiDeleteResponse(
    ENDPOINTS.QUOTE_SHEET_ITEM(id, itemId),
    withIdempotencyKey(withConcurrencyHeaders(expectedVersion), idempotencyKey),
  )
  return {
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}
