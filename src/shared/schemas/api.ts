import { z } from 'zod'

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

export type DocumentStatus =
  | '草稿'
  | '已审核'
  | '未审核'
  | '已完成'
  | '完成采购'
  | '完成入库'
  | '完成销售'
  | '部分入库'
  | '部分出库'
  | '已签署'
  | '未签署'
  | '待确认'
  | '已确认'
  | '待审核'
  | '已收款'
  | '已付款'
  | '执行中'
  | '已归档'
  | '正常'
  | '禁用'
  | '部分结清'

export type EnabledStatus = '正常' | '禁用'

/** 结算主体下拉选项 */
export interface SettlementCompanyOption {
  id: string
  companyName: string
  taxNo?: string
  status?: string
}
