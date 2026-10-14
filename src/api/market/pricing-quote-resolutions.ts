import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import type {
  ProjectPriceDateBasis,
  ProjectPricePeriod,
  ProjectPricePeriodPolicy,
} from '@/api/master/project-options'
import { ENDPOINTS } from '@/constants/endpoints'
import { strictResponseEntityIdSchema } from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'

/** 回退说明（日期或时段）：applied=true 时前端按 reason 提示，绝不静默替换。 */
export const pricingQuoteFallbackSchema = z.looseObject({
  applied: z.boolean(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
})

/**
 * 取价基准解析结果。
 * <p>
 * 本接口只回答「取哪天、哪个时段」，不含具体价格；取价仍走
 * {@code GET /material-price-matches?quoteDate&period&source&region}。
 * 日期为 ISO 字符串（yyyy-MM-dd），雪花 ID 为十进制字符串。
 *
 * <p>`projectId` 用严格响应 schema：只接受十进制字符串。原先允许数值形式
 * （`z.union([z.string(), z.number()])`），会把数值雪花 ID 固化进契约——
 * 19 位雪花 ID 转 Number 静默丢低位，之后的回填/比较都基于错误的 id。</p>
 */
export const pricingQuoteResolutionSchema = z.looseObject({
  projectId: strictResponseEntityIdSchema,
  /** 本次生效的基准口径：DELIVERY/ORDER/MANUAL。 */
  basis: z.string(),
  /** 本次生效的顺延交易日数（仅 ORDER 有意义）。 */
  offsetDays: z.number(),
  /** 本次生效的「报单日休市按前一交易日结算」开关。 */
  settlePrevOnClosed: z.boolean(),
  /** 本次生效的时段策略：AUTO/FIXED/MANUAL。 */
  periodPolicy: z.string(),
  /** 目标时段（配置或调用方要求；AUTO 时可能为空）。 */
  requestedPeriod: z.string().nullable().optional(),
  /** 基准日（送货日期/报单日期/手工日期；本身可能是休市日）。 */
  targetDate: z.string().nullable().optional(),
  /** 基准日是否为有行情交易日。 */
  targetIsTradingDay: z.boolean(),
  /** 实际取价日（交易日历回退后）。 */
  quoteDate: z.string().nullable().optional(),
  /** 实际取价时段；当日无可取行情时为空。 */
  period: z.string().nullable().optional(),
  /** 实际取价日是否取到了行情（false 时前端必须提示并阻止取价）。 */
  quoteAvailable: z.boolean(),
  /** 建议日期：基准日无行情时给出（前一个交易日），供界面一键采纳。 */
  suggestedDate: z.string().nullable().optional(),
  /** 中文解析说明，界面直接展示。 */
  explanation: z.string().nullable().optional(),
  dateFallback: pricingQuoteFallbackSchema.nullable().optional(),
  periodFallback: pricingQuoteFallbackSchema.nullable().optional(),
  /** 实际取价日的可用时段（供界面提示与手工覆盖）。 */
  availablePeriods: z.array(z.string()).optional(),
})

export type PricingQuoteResolution = z.infer<
  typeof pricingQuoteResolutionSchema
>

export type PricingQuoteFallback = z.infer<typeof pricingQuoteFallbackSchema>

/** 单据级临时覆盖参数：省略即沿用项目配置。 */
export type PricingQuoteResolutionParams = {
  /** 报单日期（ISO yyyy-MM-dd）；基准为 ORDER 时必传。 */
  orderDate?: string
  /** 送货日期（ISO yyyy-MM-dd）；基准为 DELIVERY 时必传。 */
  deliveryDate?: string
  basis?: ProjectPriceDateBasis
  offsetDays?: number
  settlePrevOnClosed?: boolean
  periodPolicy?: ProjectPricePeriodPolicy
  period?: ProjectPricePeriod
  /** 手工取价日期（ISO yyyy-MM-dd）；基准为 MANUAL 时必传。 */
  quoteDate?: string
}

/**
 * 解析项目取价基准：把「项目配置 + 单据日期」换算成实际取价日与实际时段。
 *
 * <p>项目不存在返回 404；缺必填单据日期/参数越界/固定策略缺时段返回 422（ProblemDetail）。</p>
 */
export function fetchPricingQuoteResolution(
  projectId: EntityId,
  params: PricingQuoteResolutionParams = {},
  signal?: AbortSignal,
): Promise<PricingQuoteResolution> {
  const id = parseEntityId(projectId, 'projectId')
  return apiGet(
    ENDPOINTS.PROJECT_PRICING_QUOTE_RESOLUTIONS(id),
    pricingQuoteResolutionSchema,
    { params: { ...params }, signal },
  )
}
