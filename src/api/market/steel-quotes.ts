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

/** 手动触发后端行情同步: 抓取指定日期(默认今天)最新行情并入库。 */
export function syncSteelQuotes(date?: string): Promise<SteelQuoteSyncResult> {
  return apiPost(
    ENDPOINTS.STEEL_QUOTE_SYNCS,
    steelQuoteSyncResponseSchema,
    date ? { date } : {},
  )
}

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
