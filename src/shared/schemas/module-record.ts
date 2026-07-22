import type { AuditActorId } from '@/types/audit-actor-id'

// ── 行项目 Schema ──────────────────────────────────────

/** 行项目通用字段，索引签名保留模块特有字段兼容存量。 */
export interface LineItem {
  [key: string]: unknown
  id: string
  customerId?: string
  projectId?: string
  supplierId?: string
  carrierId?: string
  materialId?: string
  warehouseId?: string
  settlementCompanyId?: string
  sourceNo?: string
  sourcePurchaseOrderItemId?: string
  sourceSalesOrderItemId?: string
  sourceInboundItemId?: string
  warehouseName?: string
  batchNo?: string
  settlementMode?: string
  customerName?: string
  projectName?: string
  materialName?: string
  materialCode?: string
  brand?: string
  category?: string
  material?: string
  spec?: string
  length?: string
  unit?: string
  quantity?: string | number
  quantityUnit?: string
  pieceWeightTon?: string | number
  piecesPerBundle?: string | number
  weightTon?: string | number
  unitPrice?: string | number
  amount?: string | number
  weighWeightTon?: string | number
  weightAdjustmentTon?: string | number
  weightAdjustmentAmount?: string | number
}

// ── 模块记录 Schema ────────────────────────────────────

/** 模块记录通用字段，索引签名保留模块特有字段兼容存量。 */
export interface ModuleRecord {
  [key: string]: unknown
  id: string
  customerId?: string
  projectId?: string
  supplierId?: string
  carrierId?: string
  counterpartyId?: string
  settlementCompanyId?: string
  sourcePurchaseOrderId?: string
  sourceCustomerStatementId?: string
  sourceSupplierStatementId?: string
  sourceFreightStatementId?: string
  sourceStatementId?: string
  status?: string
  remark?: string
  items?: LineItem[]
  attachmentIds?: string[]
  createdBy?: AuditActorId
  createdAt?: string
  updatedBy?: AuditActorId
  updatedAt?: string
}

// ── 业务实体 Schema（按模块精确类型） ──────────────────

/** 采购订单行项目 */
export interface PurchaseOrderItem extends LineItem {
  quantity: number
  unitPrice: number
  pieceWeightTon: number
  piecesPerBundle: number
  unit: string
  materialCode: string
}

/** 销售订单行项目 */
export interface SalesOrderItem extends PurchaseOrderItem {
  sourceInboundItemId?: string
  sourcePurchaseOrderItemId?: string
}

/** 采购入库行项目 */
export interface PurchaseInboundItem extends LineItem {
  sourcePurchaseOrderItemId?: string
  settlementMode?: string
  weighWeightTon?: number
  weightAdjustmentTon?: number
  weightAdjustmentAmount?: number
  quantity: number
  unitPrice: number
  pieceWeightTon: number
}

/** 销售出库行项目 */
export interface SalesOutboundItem extends LineItem {
  sourceNo?: string
  sourceSalesOrderItemId?: string
  quantity: number
  unitPrice: number
  pieceWeightTon: number
}
