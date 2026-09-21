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
  prices: {
    brandName: string
    spotPrice?: number
    supplierId?: EntityId
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

export async function createQuoteSheet(
  payload: QuoteSheetPayload,
): Promise<QuoteSheetRecord> {
  const response = await apiPost(ENDPOINTS.QUOTE_SHEETS, sheetSchema, payload)
  return normalizeSheet(response, 0)
}

export async function updateQuoteSheet(
  id: EntityId,
  payload: QuoteSheetPayload,
  expectedVersion?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET(id),
    sheetSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
  )
  return normalizeSheet(response, 0)
}

export async function deleteQuoteSheet(id: EntityId): Promise<void> {
  await apiDeleteNoContent(ENDPOINTS.QUOTE_SHEET(id))
}

/** 仅保存表头字段(不传 brands/items), 携带 If-Match 版本。 */
export async function updateQuoteSheetHeader(
  id: EntityId,
  payload: QuoteSheetHeaderPayload,
  expectedVersion?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET(id),
    sheetSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
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
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiPostResponse(
    ENDPOINTS.QUOTE_SHEET_ITEMS(id),
    itemSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
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
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiPutResponse(
    ENDPOINTS.QUOTE_SHEET_ITEM(id, itemId),
    itemSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
  )
  return {
    item: normalizeItem(response.data, 'quoteSheetItem'),
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}

/** 删除商品行(204), 返回服务端权威单据版本。 */
export async function deleteQuoteSheetItem(
  id: EntityId,
  itemId: EntityId,
  expectedVersion?: string,
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiDeleteResponse(
    ENDPOINTS.QUOTE_SHEET_ITEM(id, itemId),
    withConcurrencyHeaders(expectedVersion),
  )
  return {
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}
