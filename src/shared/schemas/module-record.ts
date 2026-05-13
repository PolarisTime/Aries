import { z } from 'zod'
import { materialInfoFields, weightPriceFields } from './api'

// ── 行项目 Schema ──────────────────────────────────────

/** 行项目通用字段 — .passthrough() 保留模块特有字段 */
export const lineItemSchema = z.object({
  id: z.string().optional(),
  sourceNo: z.string().optional(),
  sourcePurchaseOrderItemId: z.union([z.string(), z.number()]).optional(),
  sourceSalesOrderItemId: z.union([z.string(), z.number()]).optional(),
  sourceInboundItemId: z.union([z.string(), z.number()]).optional(),
  ...materialInfoFields,
  warehouseName: z.string().optional(),
  batchNo: z.string().optional(),
  settlementMode: z.string().optional(),
  ...weightPriceFields,
  customerName: z.string().optional(),
  projectName: z.string().optional(),
  materialName: z.string().optional(),
  weighWeightTon: z.union([z.string(), z.number()]).optional(),
  weightAdjustmentTon: z.union([z.string(), z.number()]).optional(),
  weightAdjustmentAmount: z.union([z.string(), z.number()]).optional(),
}).passthrough()

export type LineItem = z.infer<typeof lineItemSchema>

// ── 模块记录 Schema ────────────────────────────────────

/** 模块记录通用字段 */
export const moduleRecordSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(lineItemSchema).optional(),
  attachmentIds: z.array(z.string()).optional(),
  createdBy: z.union([z.string(), z.number()]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough()

export type ModuleRecord = z.infer<typeof moduleRecordSchema>

// ── 业务实体 Schema（按模块） ──────────────────────────

/** 采购订单行项目 */
export const purchaseOrderItemSchema = lineItemSchema.required({
  materialCode: true,
}).extend({
  quantity: z.number(),
  unitPrice: z.number(),
  pieceWeightTon: z.number(),
  piecesPerBundle: z.number(),
  unit: z.string(),
})
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>

/** 销售订单行项目 */
export const salesOrderItemSchema = purchaseOrderItemSchema.extend({
  sourceInboundItemId: z.number().optional(),
  sourcePurchaseOrderItemId: z.number().optional(),
})
export type SalesOrderItem = z.infer<typeof salesOrderItemSchema>

/** 采购入库行项目 */
export const purchaseInboundItemSchema = lineItemSchema.extend({
  sourcePurchaseOrderItemId: z.number().optional(),
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
  sourceSalesOrderItemId: z.number().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  pieceWeightTon: z.number(),
})
export type SalesOutboundItem = z.infer<typeof salesOutboundItemSchema>

// ── 解析辅助 ───────────────────────────────────────────

export function parseRecord(v: unknown): ModuleRecord {
  return moduleRecordSchema.safeParse(v).success
    ? (v as ModuleRecord)
    : ({ id: '' } as ModuleRecord)
}

export function parseLineItem(v: unknown): LineItem {
  return lineItemSchema.safeParse(v).success
    ? (v as LineItem)
    : ({ id: '' } as LineItem)
}
