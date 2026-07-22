import { z } from 'zod'

const rawRecordSchema = z.record(z.string(), z.unknown())

export const rawPageSchema = <ItemSchema extends z.ZodType>(
  itemSchema: ItemSchema,
) =>
  z.looseObject({
    content: z.array(itemSchema).optional(),
    records: z.array(itemSchema).optional(),
    totalElements: z.number(),
    totalPages: z.number().optional(),
    currentPage: z.number().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    size: z.number().optional(),
    first: z.boolean().optional(),
    last: z.boolean().optional(),
    hasMore: z.boolean().optional(),
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
