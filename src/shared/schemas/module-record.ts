import { z } from 'zod'
import { materialInfoSchema, weightPriceSchema } from './api'

const snowflakeIdSchema = z.union([z.string(), z.number()])

// ── 行项目 Schema ──────────────────────────────────────

/** 行项目通用字段 — looseObject 保留模块特有字段兼容存量 */
const lineItemSchema = z
  .looseObject({
    id: z.string(),
    sourceNo: z.string().optional(),
    sourcePurchaseOrderItemId: snowflakeIdSchema.optional(),
    sourceSalesOrderItemId: snowflakeIdSchema.optional(),
    sourceInboundItemId: snowflakeIdSchema.optional(),
    warehouseName: z.string().optional(),
    batchNo: z.string().optional(),
    settlementMode: z.string().optional(),
    customerName: z.string().optional(),
    projectName: z.string().optional(),
    materialName: z.string().optional(),
    weighWeightTon: z.union([z.string(), z.number()]).optional(),
    weightAdjustmentTon: z.union([z.string(), z.number()]).optional(),
    weightAdjustmentAmount: z.union([z.string(), z.number()]).optional(),
  })
  .extend(materialInfoSchema.shape)
  .extend(weightPriceSchema.shape)

export type LineItem = z.infer<typeof lineItemSchema>

// ── 模块记录 Schema ────────────────────────────────────

/** 模块记录通用字段 */
export const moduleRecordSchema = z.looseObject({
  id: z.string(),
  status: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(lineItemSchema).optional(),
  attachmentIds: z.array(z.string()).optional(),
  createdBy: z.union([z.string(), z.number()]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type ModuleRecord = z.infer<typeof moduleRecordSchema>

// ── 业务实体 Schema（按模块精确类型） ──────────────────

/** 采购订单行项目 */
const purchaseOrderItemSchema = lineItemSchema.extend({
  quantity: z.number(),
  unitPrice: z.number(),
  pieceWeightTon: z.number(),
  piecesPerBundle: z.number(),
  unit: z.string(),
  materialCode: z.string(),
})
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>

/** 销售订单行项目 */
export const salesOrderItemSchema = purchaseOrderItemSchema.extend({
  sourceInboundItemId: snowflakeIdSchema.optional(),
  sourcePurchaseOrderItemId: snowflakeIdSchema.optional(),
})
export type SalesOrderItem = z.infer<typeof salesOrderItemSchema>

/** 采购入库行项目 */
export const purchaseInboundItemSchema = lineItemSchema.extend({
  sourcePurchaseOrderItemId: snowflakeIdSchema.optional(),
  settlementMode: z.string().optional(),
  weighWeightTon: z.number().optional(),
  weightAdjustmentTon: z.number().optional(),
  weightAdjustmentAmount: z.number().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  pieceWeightTon: z.number(),
})
export type PurchaseInboundItem = z.infer<typeof purchaseInboundItemSchema>

/** 销售出库行项目 */
export const salesOutboundItemSchema = lineItemSchema.extend({
  sourceNo: z.string().optional(),
  sourceSalesOrderItemId: snowflakeIdSchema.optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  pieceWeightTon: z.number(),
})
export type SalesOutboundItem = z.infer<typeof salesOutboundItemSchema>

// ── 运行时解析（API 边界使用）──────────────────────────

/** 安全解析模块记录，失败返回 id 为空的哨兵记录 */

/** 安全解析行项目，失败返回 id 为空的哨兵记录 */
