import { z } from 'zod'
import {
  exactPageSchema,
  requestEntityIdSchema,
  responseEntityIdSchema,
} from './api'

/**
 * 销售合同状态契约: 草稿 / 审核 / 签发 / 归档 / 作废。
 * 流转: 草稿 → 审核 → 签发 → 归档, 不支持逆向回退;
 * 作废仅允许自 草稿 / 审核 / 归档, 签发不可作废。
 */
export const salesContractStatusSchema = z.enum([
  '草稿',
  '审核',
  '签发',
  '归档',
  '作废',
])
export type SalesContractStatus = z.output<typeof salesContractStatusSchema>

/** 参与合同额度累计的状态: 审核 / 签发 / 归档(草稿与作废不计入)。 */
export const SALES_CONTRACT_QUOTA_STATUSES: readonly SalesContractStatus[] = [
  '审核',
  '签发',
  '归档',
]

const DECIMAL_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/

/** 金额/吨位响应兼容数值与十进制字符串，统一归一化为有限 number。 */
const responseDecimalSchema = z
  .union([z.number(), z.string().trim().regex(DECIMAL_PATTERN)])
  .transform((value) => (typeof value === 'number' ? value : Number(value)))
  .pipe(z.number().finite())

const responseNonNegativeDecimalSchema = responseDecimalSchema.pipe(
  z.number().nonnegative(),
)

const dateTextSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期必须为 yyyy-MM-dd 格式')

const optionalDateTextSchema = z.union([
  dateTextSchema,
  z.literal(''),
  z.null(),
])

export const salesContractResponseSchema = z.object({
  id: responseEntityIdSchema,
  contractNo: z.string(),
  name: z.string().nullish(),
  customerId: responseEntityIdSchema,
  customerName: z.string().nullish(),
  projectId: responseEntityIdSchema,
  projectName: z.string().nullish(),
  signDate: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  totalAmount: responseNonNegativeDecimalSchema,
  totalTonnage: responseNonNegativeDecimalSchema,
  status: salesContractStatusSchema,
  remark: z.string().nullish(),
  /** 乐观锁版本号; 后端以响应体或 X-Resource-Version 响应头回传。 */
  version: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((value) =>
      value === null || value === undefined || value === ''
        ? undefined
        : String(value),
    ),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
})
export type SalesContractResponse = z.output<typeof salesContractResponseSchema>

export const salesContractListPageSchema = exactPageSchema(
  salesContractResponseSchema,
)
export type SalesContractListPage = z.output<typeof salesContractListPageSchema>

/**
 * 新增/整体替换请求体。
 *
 * <p>契约要点: {@code contractNo} 可空, 为空时由后端按雪花 ID 自动生成;
 * {@code signDate} 为后端必填; {@code customerName/projectName} 由后端按客户/项目快照回填,
 * 不进入请求体; 状态经独立子资源(PATCH /{id}/status)流转, 因此不进入整体替换载荷。</p>
 */
export const salesContractUpsertPayloadSchema = z.object({
  contractNo: z.string().trim().max(64).optional(),
  name: z.string().trim().min(1).max(128),
  customerId: requestEntityIdSchema,
  projectId: requestEntityIdSchema,
  signDate: dateTextSchema,
  startDate: optionalDateTextSchema.optional(),
  endDate: optionalDateTextSchema.optional(),
  totalAmount: z.number().finite().nonnegative(),
  totalTonnage: z.number().finite().nonnegative(),
  remark: z.string().trim().max(255).optional(),
})
export type SalesContractUpsertPayload = z.input<
  typeof salesContractUpsertPayloadSchema
>

export const salesContractStatusUpdatePayloadSchema = z.object({
  status: salesContractStatusSchema,
})
export type SalesContractStatusUpdatePayload = z.input<
  typeof salesContractStatusUpdatePayloadSchema
>

/**
 * 销售订单开单前的合同额度校验结果。
 * 字段缺失时按“无数据”宽容处理，保证校验失败不阻断保存。
 */
export const salesContractCheckSchema = z.object({
  hasContract: z.boolean().default(false),
  contractAmount: responseNonNegativeDecimalSchema.default(0),
  usedAmount: responseNonNegativeDecimalSchema.default(0),
  remainingAmount: responseDecimalSchema.default(0),
  contractTonnage: responseNonNegativeDecimalSchema.default(0),
  usedTonnage: responseNonNegativeDecimalSchema.default(0),
  remainingTonnage: responseDecimalSchema.default(0),
  exceededAmount: responseNonNegativeDecimalSchema.default(0),
  exceededTonnage: responseNonNegativeDecimalSchema.default(0),
  message: z.string().default(''),
})
export type SalesContractCheck = z.output<typeof salesContractCheckSchema>
