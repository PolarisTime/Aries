import { z } from 'zod'
import { responseEntityIdSchema } from './api'

/**
 * 客户对账单方向：蓝字（正常销售）与红字（退货冲减）。
 *
 * 历史数据没有 `direction` 字段，宽松解析时统一回退为蓝字；未知取值同样回退，
 * 避免新增字段把旧记录挡在列表之外。
 */
export const STATEMENT_DIRECTIONS = ['蓝字', '红字'] as const

export type StatementDirection = (typeof STATEMENT_DIRECTIONS)[number]

export const DEFAULT_STATEMENT_DIRECTION: StatementDirection = '蓝字'

export const statementDirectionSchema = z
  .enum(STATEMENT_DIRECTIONS)
  .catch(DEFAULT_STATEMENT_DIRECTION)

/** 宽松方向解析，供展示层使用；非红字一律视为蓝字。 */
export function normalizeStatementDirection(
  value: unknown,
): StatementDirection {
  return value === '红字' ? '红字' : DEFAULT_STATEMENT_DIRECTION
}

/**
 * 对账模块专用金额 schema：红字对账单金额/重量/单价为负值，
 * 与销售订单等主流程的非负约束不同，这里必须允许负数。
 */
const statementDecimalSchema = z.number().finite()
const statementNullableDecimalSchema = statementDecimalSchema.nullable()
const statementQuantitySchema = z.number().int()
const statementNullableQuantitySchema = statementQuantitySchema.nullable()
const nullableTextSchema = z.string().nullable()
const optionalTextSchema = z.string().nullish()

export const customerStatementItemSchema = z.looseObject({
  id: responseEntityIdSchema.optional(),
  lineNo: z.number().int().nullish(),
  sourceNo: optionalTextSchema,
  sourceSalesOrderItemId: responseEntityIdSchema.nullish(),
  sourceSalesReturnId: responseEntityIdSchema.nullish(),
  sourceSalesReturnNo: optionalTextSchema,
  materialCode: optionalTextSchema,
  brand: optionalTextSchema,
  category: optionalTextSchema,
  material: optionalTextSchema,
  spec: optionalTextSchema,
  length: optionalTextSchema,
  unit: optionalTextSchema,
  batchNo: nullableTextSchema.optional(),
  quantity: statementNullableQuantitySchema.optional(),
  quantityUnit: nullableTextSchema.optional(),
  pieceWeightTon: statementNullableDecimalSchema.optional(),
  piecesPerBundle: statementNullableQuantitySchema.optional(),
  weightTon: statementNullableDecimalSchema.optional(),
  unitPrice: statementNullableDecimalSchema.optional(),
  amount: statementNullableDecimalSchema.optional(),
})

export const customerStatementRecordSchema = z.looseObject({
  id: responseEntityIdSchema,
  statementNo: z.string().min(1),
  direction: statementDirectionSchema.default(DEFAULT_STATEMENT_DIRECTION),
  sourceSalesReturnId: responseEntityIdSchema.nullish(),
  sourceSalesReturnNo: optionalTextSchema,
  customerCode: optionalTextSchema,
  customerId: responseEntityIdSchema.nullish(),
  customerName: optionalTextSchema,
  projectId: responseEntityIdSchema.nullish(),
  projectName: optionalTextSchema,
  settlementCompanyId: responseEntityIdSchema.nullish(),
  settlementCompanyName: optionalTextSchema,
  startDate: optionalTextSchema,
  endDate: optionalTextSchema,
  salesAmount: statementDecimalSchema,
  receiptAmount: statementNullableDecimalSchema.optional(),
  closingAmount: statementDecimalSchema,
  status: optionalTextSchema,
  remark: optionalTextSchema,
  items: z.array(customerStatementItemSchema).optional(),
})

export type CustomerStatementItem = z.output<typeof customerStatementItemSchema>
export type CustomerStatementRecord = z.output<
  typeof customerStatementRecordSchema
>
