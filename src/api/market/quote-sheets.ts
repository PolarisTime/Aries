import { z } from 'zod'
import { apiDeleteNoContent, apiGet, apiPost, apiPut } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

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
  category: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  spec: z.union([z.number(), z.string()]).nullable().optional(),
  length: z.string().nullable().optional(),
  ton: z.union([z.number(), z.string()]).nullable().optional(),
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
  status: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  brands: z.array(brandSchema).nullable().optional(),
  items: z.array(itemSchema).nullable().optional(),
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
  category: string
  material: string
  spec?: number
  length: string
  ton?: number
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
  status?: string
  remark?: string
  brands: QuoteSheetBrandRecord[]
  items: QuoteSheetItemRecord[]
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
  status?: string
  remark?: string
  brands: QuoteSheetBrandRecord[]
  items: {
    category: string
    material: string
    spec: number
    length: string
    ton?: number
    prices: {
      brandName: string
      spotPrice?: number
      supplierId?: EntityId
    }[]
  }[]
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

function normalizeSheet(
  raw: z.infer<typeof sheetSchema>,
  index: number,
): QuoteSheetRecord {
  const projectId = parseOptionalEntityId(
    raw.projectId,
    `sheets[${index}].projectId`,
  )
  const items: QuoteSheetItemRecord[] = (raw.items ?? []).map(
    (item, itemIndex): QuoteSheetItemRecord => ({
      id: parseEntityId(item.id, `sheets[${index}].items[${itemIndex}].id`),
      category: asString(item.category).trim(),
      material: asString(item.material).trim(),
      length: asString(item.length).trim(),
      ...(toOptionalNumber(item.spec) !== undefined
        ? { spec: toOptionalNumber(item.spec) }
        : {}),
      ...(toOptionalNumber(item.ton) !== undefined
        ? { ton: toOptionalNumber(item.ton) }
        : {}),
      prices: (item.prices ?? []).map((price, priceIndex) =>
        normalizePrice(price, priceIndex),
      ),
    }),
  )
  return {
    id: parseEntityId(raw.id, `sheets[${index}].id`),
    name: raw.name,
    orderDate: raw.orderDate,
    refDate: raw.refDate,
    refPeriod: raw.refPeriod,
    lengthPremium: toOptionalNumber(raw.lengthPremium) ?? 30,
    locked: Boolean(raw.locked),
    brands: (raw.brands ?? []).map((brand, brandIndex) => ({
      brandName: brand.brandName,
      freight: toOptionalNumber(brand.freight) ?? 0,
      sortOrder: toOptionalNumber(brand.sortOrder) ?? brandIndex,
    })),
    items,
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
): Promise<QuoteSheetRecord> {
  const response = await apiPut(ENDPOINTS.QUOTE_SHEET(id), sheetSchema, payload)
  return normalizeSheet(response, 0)
}

export async function deleteQuoteSheet(id: EntityId): Promise<void> {
  await apiDeleteNoContent(ENDPOINTS.QUOTE_SHEET(id))
}
