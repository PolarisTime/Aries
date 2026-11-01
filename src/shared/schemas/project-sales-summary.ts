import { z } from 'zod'
import { responseEntityIdSchema } from './api'
import { responseDecimalSchema } from './decimal'

/**
 * 项目销售汇总（`GET /api/v2/projects/{projectId}/sales-summary`）响应契约。
 *
 * <p>只读聚合模型：后端按项目把「销售订单 / 销售出库 / 客户对账 / 销售合同额度」四个口径
 * 汇总成一个视图，前端不做任何金额或吨位的二次求和 —— 面板上每个数字都必须来自本响应，
 * 否则同一口径会出现两个来源（例如「合计金额」前端再 reduce 一次明细行）。</p>
 *
 * <p>契约要点：</p>
 * <ul>
 *   <li>`projectId` 是雪花 ID，**必须保持字符串**（`responseEntityIdSchema` 兼容期仅接受安全整数
 *       的 number 形式，绝不接受 19 位大整数 number）；</li>
 *   <li>`amountUsageRate` / `tonnageUsageRate` 是「已用 / 合同」比值（0.8532 表示 85.32%），
 *       无有效合同或无合同值时为 `null`；</li>
 *   <li>`unreconciled*` = 送货 − 对账，后端**不做 clamp**，可以为负（红字对账冲销）；
 *       因此这里不能用 nonnegative 校验；</li>
 *   <li>`400/404` 等错误由 HTTP 层以 `RequestError.status` 表达，不进入本 schema。</li>
 * </ul>
 */
export const projectSalesSummarySchema = z.object({
  projectId: responseEntityIdSchema,
  projectName: z.string().default(''),
  /** 合计金额 / 合计吨位：项目下未删除销售订单（可排除本单）+ 本次待保存量。 */
  orderAmount: responseDecimalSchema,
  orderTonnage: responseDecimalSchema,
  /** 合计送货金额 / 合计送货吨位：已审核销售出库 − 已审核销售退货。 */
  deliveredAmount: responseDecimalSchema,
  deliveredTonnage: responseDecimalSchema,
  /** 已对账金额 / 吨位：客户对账单明细合计（红字为负，自然抵消）。 */
  reconciledAmount: responseDecimalSchema,
  reconciledTonnage: responseDecimalSchema,
  /** 未对账金额 / 吨位 = 送货 − 对账；可以为负。 */
  unreconciledAmount: responseDecimalSchema,
  unreconciledTonnage: responseDecimalSchema,
  hasContract: z.boolean().default(false),
  contractAmount: responseDecimalSchema.default(0),
  contractTonnage: responseDecimalSchema.default(0),
  remainingAmount: responseDecimalSchema.default(0),
  remainingTonnage: responseDecimalSchema.default(0),
  exceededAmount: responseDecimalSchema.default(0),
  exceededTonnage: responseDecimalSchema.default(0),
  /** 使用率 = 已用 / 合同；无合同（或合同值 ≤ 0）时为 null。 */
  amountUsageRate: responseDecimalSchema.nullish().transform((v) => v ?? null),
  tonnageUsageRate: responseDecimalSchema.nullish().transform((v) => v ?? null),
  message: z.string().default(''),
})
export type ProjectSalesSummary = z.output<typeof projectSalesSummarySchema>
