import { z } from 'zod'
import { apiGet, apiPost } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'

export const materialPriceMatchSchema = z.looseObject({
  materialId: z.union([z.string(), z.number()]).nullable().optional(),
  materialCode: z.string().nullable().optional(),
  brand: z.string().nullable(),
  material: z.string().nullable(),
  category: z.string().nullable(),
  spec: z.string().nullable(),
  length: z.string().nullable(),
  status: z.string(),
  factory: z.string().nullable().optional(),
  matchedSpec: z.string().nullable().optional(),
  singleSpecPrice: z.boolean().optional(),
  basePrice: z.union([z.number(), z.string()]).nullable(),
  price: z.union([z.number(), z.string()]).nullable(),
  priceType: z.string().nullable().optional(),
  changeVal: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  quoteDate: z.string(),
  period: z.string(),
})

export type MaterialPriceMatch = z.infer<typeof materialPriceMatchSchema>

const PAGE_SIZE = 200

/**
 * 拉取商品行情匹配结果(自动翻页)。
 * 后端已按品牌别名/品名映射/规格区间/长度加价完成匹配, 返回每条商品的 basePrice。
 */
export async function fetchMaterialPriceMatches(
  quoteDate: string,
  period?: string,
): Promise<MaterialPriceMatch[]> {
  const all: MaterialPriceMatch[] = []
  for (let page = 0; page <= 50; page += 1) {
    const rows = await apiGet(
      ENDPOINTS.MATERIAL_PRICE_MATCHES,
      z.array(materialPriceMatchSchema),
      { params: { quoteDate, period, page, size: PAGE_SIZE } },
    )
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

const steelQuoteCalendarSchema = z.array(
  z.looseObject({
    quoteDate: z.string(),
    periods: z.array(z.string()),
  }),
)

export type SteelQuoteCalendarItem = z.infer<
  typeof steelQuoteCalendarSchema
>[number]

/** 行情日历: 指定区间内有行情的日期与可用时段。 */
export function fetchSteelQuoteCalendars(
  from: string,
  to: string,
): Promise<SteelQuoteCalendarItem[]> {
  return apiGet(ENDPOINTS.STEEL_QUOTE_CALENDARS, steelQuoteCalendarSchema, {
    params: { from, to },
  })
}

const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.looseObject({
    content: z.array(item),
    totalElements: z.union([z.number(), z.string()]),
    totalPages: z.number(),
    currentPage: z.number(),
    pageSize: z.number(),
    hasMore: z.boolean(),
  })

/** 同步记录(文章)。 */
export const steelQuoteSyncRecordSchema = z.looseObject({
  articleId: z.union([z.string(), z.number()]).nullable().optional(),
  articleUrl: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  articleDate: z.string(),
  articleTime: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  rowCount: z.number().nullable().optional(),
  market: z.string().nullable().optional(),
  fetchedAt: z.string().nullable().optional(),
})
export type SteelQuoteSyncRecord = z.infer<typeof steelQuoteSyncRecordSchema>

export const steelQuoteSyncResponseSchema = z.looseObject({
  articleId: z.union([z.string(), z.number()]).nullable().optional(),
  articleUrl: z.string().nullable().optional(),
  articleDate: z.string(),
  articleTime: z.string().nullable().optional(),
  period: z.string(),
  periods: z.array(z.string()).optional(),
  rowCount: z.number(),
  created: z.boolean(),
})
export type SteelQuoteSyncResult = z.infer<typeof steelQuoteSyncResponseSchema>

/** 行情明细。 */
export const steelQuoteSchema = z.looseObject({
  id: z.union([z.string(), z.number()]).nullable().optional(),
  market: z.string().nullable().optional(),
  quoteDate: z.string(),
  period: z.string().nullable().optional(),
  breed: z.string().nullable().optional(),
  spec: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  factory: z.string().nullable().optional(),
  price: z.union([z.number(), z.string()]).nullable().optional(),
  changeVal: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
})
export type SteelQuote = z.infer<typeof steelQuoteSchema>

/** 手动触发后端行情同步。 */
export function syncSteelQuotes(date?: string): Promise<SteelQuoteSyncResult> {
  return apiPost(
    ENDPOINTS.STEEL_QUOTE_SYNCS,
    steelQuoteSyncResponseSchema,
    date ? { date } : {},
  )
}

/** 同步记录分页。 */
export async function fetchSteelQuoteSyncs(
  page = 0,
  size = 20,
): Promise<{ rows: SteelQuoteSyncRecord[]; total: number }> {
  const res = await apiGet(
    ENDPOINTS.STEEL_QUOTE_SYNCS,
    pageSchema(steelQuoteSyncRecordSchema),
    {
      params: { page, size },
    },
  )
  return { rows: res.content, total: Number(res.totalElements) }
}

/** 行情明细分页。 */
export async function fetchSteelQuotes(params: {
  quoteDate?: string
  period?: string
  breed?: string
  spec?: string
  material?: string
  factory?: string
  page?: number
  size?: number
}): Promise<{ rows: SteelQuote[]; total: number }> {
  const res = await apiGet(
    ENDPOINTS.STEEL_QUOTES,
    pageSchema(steelQuoteSchema),
    {
      params,
    },
  )
  return { rows: res.content, total: Number(res.totalElements) }
}
