import { z } from 'zod'
import { apiGet, apiPost } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'

export const steelQuoteSyncResponseSchema = z.looseObject({
  // 雪花 ID 按项目规范序列化为字符串
  articleId: z.union([z.string(), z.number()]).nullable().optional(),
  articleUrl: z.string().nullable().optional(),
  articleDate: z.string(),
  articleTime: z.string().nullable().optional(),
  period: z.string(),
  rowCount: z.number(),
  created: z.boolean(),
})

export type SteelQuoteSyncResult = z.infer<typeof steelQuoteSyncResponseSchema>

export const steelQuoteSchema = z.looseObject({
  id: z.union([z.string(), z.number()]).nullable().optional(),
  market: z.string().nullable().optional(),
  quoteDate: z.string(),
  period: z.string(),
  breed: z.string(),
  spec: z.string(),
  material: z.string(),
  factory: z.string(),
  price: z.union([z.number(), z.string()]),
  changeVal: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
})

export type SteelQuote = z.infer<typeof steelQuoteSchema>

const steelQuotePageSchema = z.looseObject({
  content: z.array(steelQuoteSchema),
  totalElements: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
})

const PAGE_SIZE = 200

/** 手动触发后端行情同步: 抓取指定日期(默认今天)最新行情并入库。 */
export function syncSteelQuotes(date?: string): Promise<SteelQuoteSyncResult> {
  return apiPost(
    ENDPOINTS.STEEL_QUOTE_SYNCS,
    steelQuoteSyncResponseSchema,
    date ? { date } : {},
  )
}

/** 拉取指定日期的全部行情明细(自动翻页)。 */
export async function fetchSteelQuotes(
  quoteDate: string,
  period?: string,
): Promise<SteelQuote[]> {
  const all: SteelQuote[] = []
  let page = 0
  for (;;) {
    const response = await apiGet(
      ENDPOINTS.STEEL_QUOTES,
      steelQuotePageSchema,
      {
        params: { quoteDate, period, page, size: PAGE_SIZE },
      },
    )
    all.push(...response.content)
    if (!response.hasMore || response.content.length === 0) break
    page += 1
    if (page > 50) break
  }
  return all
}
