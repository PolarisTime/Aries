import { z } from 'zod'
import { apiPost } from '@/api/core/client'
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

/** 手动触发后端行情同步: 抓取指定日期(默认今天)最新行情并入库。 */
export function syncSteelQuotes(date?: string): Promise<SteelQuoteSyncResult> {
  return apiPost(
    ENDPOINTS.STEEL_QUOTE_SYNCS,
    steelQuoteSyncResponseSchema,
    date ? { date } : {},
  )
}
