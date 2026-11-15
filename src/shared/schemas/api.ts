import { z } from 'zod'
import type { DOCUMENT_STATUS, STATUS } from '@/constants/status-constants'

const integerStringSchema = z
  .string()
  .trim()
  .regex(/^-?\d+$/)
  .transform(Number)

const MAX_SIGNED_LONG = 9_223_372_036_854_775_807n
const ENTITY_ID_PATTERN = /^[1-9]\d*$/
const responseEntityIdStringSchema = z
  .string()
  .refine(
    (value) =>
      ENTITY_ID_PATTERN.test(value) && BigInt(value) <= MAX_SIGNED_LONG,
    '实体 ID 格式错误或超出范围',
  )

/** 后端 Long 响应为字符串；兼容期仅接受安全整数 number。 */
export const responseEntityIdSchema = z
  .union([responseEntityIdStringSchema, z.number().int().positive().safe()])
  .transform(String)

/**
 * 严格响应侧实体 ID：只接受十进制字符串，**不接受任何数值形式**。
 *
 * <p>用于已确认后端按 `JacksonConfig` 输出字符串的响应。数值形式哪怕落在
 * `Number.MAX_SAFE_INTEGER` 内，一旦被 schema 接受就会把数值雪花 ID 固化进契约；
 * 19 位雪花 ID 转 Number 会静默丢低位，之后按错误的 id 查询/更新/删除。
 * 仍需过渡兼容的历史响应请显式使用 {@link responseEntityIdSchema} 并记录迁移计划。</p>
 */
export const strictResponseEntityIdSchema = responseEntityIdStringSchema

/** 客户端传入的实体 ID 必须为十进制字符串（雪花 ID 不做 JSON number）。 */
export const requestEntityIdSchema = z
  .string()
  .trim()
  .regex(ENTITY_ID_PATTERN, '实体 ID 必须为正整数的十进制字符串')
  .refine(
    (value) =>
      !ENTITY_ID_PATTERN.test(value) || BigInt(value) <= MAX_SIGNED_LONG,
    '实体 ID 超出范围',
  )

/** 后端 Jackson 将 Long 输出为字符串，边界层统一归一化为安全整数。 */
const responseIntegerSchema = z.union([
  z.number().int().safe(),
  integerStringSchema.pipe(z.number().int().safe()),
])

export const responsePositiveIntegerSchema = responseIntegerSchema.pipe(
  z.number().int().positive(),
)

export const responseNonNegativeIntegerSchema = responseIntegerSchema.pipe(
  z.number().int().nonnegative(),
)

/** v2 日期和时间统一使用 ISO-8601 字符串。 */
export const responseDateTimeSchema = z.string().min(1)

export const rawRecordSchema = z.record(z.string(), z.unknown())

/** v2 后端 PageResponse 的唯一分页结构。 */
export const exactPageSchema = <ItemSchema extends z.ZodType>(
  itemSchema: ItemSchema,
) =>
  z.strictObject({
    content: z.array(itemSchema),
    totalElements: responseNonNegativeIntegerSchema,
    totalPages: responseNonNegativeIntegerSchema,
    currentPage: responseNonNegativeIntegerSchema,
    pageSize: responseNonNegativeIntegerSchema,
    hasMore: z.boolean(),
  })

export const rawRecordPageSchema = exactPageSchema(rawRecordSchema)

const apiProblemFieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
})

export const apiProblemSchema = z.looseObject({
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.number().int(),
  traceId: z.string().optional(),
  timestamp: z.string().min(1),
  errors: z.array(apiProblemFieldErrorSchema).optional(),
})

export type ApiProblem = z.output<typeof apiProblemSchema>

/**
 * 单据/业务状态 code（与后端 `DocumentStatus.code()` 逐字一致）。
 *
 * <p>2026-11 起 DB 与 API 统一使用英文 code（Flyway V219）。比较、筛选、提交
 * 一律用 code；展示必须走 `statusLabel()`（无 t()）或 `getStatusText(status, t)`（组件），
 * 不要把 code 直接渲染给用户。</p>
 */
export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS]

/** 启用/禁用状态 code。 */
export type EnabledStatus = typeof STATUS.NORMAL | typeof STATUS.DISABLED

/** 结算主体下拉选项 */
export interface SettlementCompanyOption {
  id: string
  companyName: string
}
