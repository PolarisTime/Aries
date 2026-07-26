import { z } from 'zod'

const integerStringSchema = z
  .string()
  .trim()
  .regex(/^-?\d+$/)
  .transform(Number)

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

/** LocalDate/LocalDateTime 可能是 ISO 字符串或 epoch 毫秒。 */
export const responseDateTimeSchema = z.union([
  z.string().min(1),
  z.number().int(),
])

const rawRecordSchema = z.record(z.string(), z.unknown())

export const rawPageSchema = <ItemSchema extends z.ZodType>(
  itemSchema: ItemSchema,
) =>
  z.looseObject({
    content: z.array(itemSchema).optional(),
    records: z.array(itemSchema).optional(),
    totalElements: responseNonNegativeIntegerSchema,
    totalPages: responseNonNegativeIntegerSchema.optional(),
    currentPage: responseNonNegativeIntegerSchema.optional(),
    page: responseNonNegativeIntegerSchema.optional(),
    pageSize: responseNonNegativeIntegerSchema.optional(),
    size: responseNonNegativeIntegerSchema.optional(),
    first: z.boolean().optional(),
    last: z.boolean().optional(),
    hasMore: z.boolean().optional(),
  })

/** 当前后端 PageResponse 的精确结构，仅供已完成契约迁移的端点使用。 */
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

export const apiResponseSchema = <DataSchema extends z.ZodType>(
  dataSchema: DataSchema,
) =>
  z.object({
    code: z.number(),
    data: dataSchema,
    message: z.string().optional(),
    traceId: z.string().optional(),
  })

export const rawRecordResponseSchema = apiResponseSchema(rawRecordSchema)
export const rawPageResponseSchema = apiResponseSchema(
  rawPageSchema(rawRecordSchema),
)
export const nullResponseSchema = apiResponseSchema(z.null().optional())
export const stringResponseSchema = apiResponseSchema(z.string())
export const stringArrayResponseSchema = apiResponseSchema(z.array(z.string()))

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
