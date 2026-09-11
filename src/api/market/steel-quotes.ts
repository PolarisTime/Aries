import { z } from 'zod'
import { apiGet } from '@/api/core/client'
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
