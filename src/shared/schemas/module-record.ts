import { z } from 'zod'
import type { ModuleKey } from '@/module-system/core/module-key'
import {
  exactPageSchema,
  responseDateTimeSchema,
  responseEntityIdSchema,
} from './api'

const DECIMAL_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/

/** 后端 Long 响应为字符串；兼容安全整数后统一输出十进制字符串。 */
export const entityIdSchema = responseEntityIdSchema

const nullableEntityIdSchema = entityIdSchema.nullable()
const optionalEntityIdSchema = entityIdSchema.nullish()
const requiredTextSchema = z.string().min(1)
const nullableTextSchema = z.string().nullable()
const optionalTextSchema = z.string().nullish()
const integerSchema = z.number().int()
const nonNegativeIntegerSchema = integerSchema.nonnegative()
const positiveIntegerSchema = integerSchema.positive()
const decimalSchema = z.number().finite()
const nonNegativeDecimalSchema = decimalSchema.nonnegative()
const nullableDecimalSchema = decimalSchema.nullable()

/** BigDecimal 请求兼容现有表单可能保留的十进制字符串，不做数值转换。 */
const requestDecimalSchema = z.union([
  decimalSchema,
  z.string().regex(DECIMAL_PATTERN),
])
const requestNonNegativeDecimalSchema = z.union([
  nonNegativeDecimalSchema,
  z
    .string()
    .regex(DECIMAL_PATTERN)
    .refine((value) => Number(value) >= 0),
])
const optionalRequestDecimalSchema = requestDecimalSchema.nullish()
const optionalRequestNonNegativeDecimalSchema =
  requestNonNegativeDecimalSchema.nullish()

export const purchaseOrderStatusSchema = z.enum(['草稿', '已审核', '完成采购'])
export const purchaseInboundStatusSchema = z.enum([
  '草稿',
  '已审核',
  '完成入库',
])
export const salesOrderStatusSchema = z.enum([
  '草稿',
  '已审核',
  '交付核定',
  '完成销售',
])
export const salesOutboundStatusSchema = z.enum(['草稿', '已审核'])
export const freightBillStatusSchema = z.enum(['草稿', '已审核'])

// Purchase order

export const purchaseOrderItemSchema = z.strictObject({
  id: entityIdSchema,
  lineNo: integerSchema,
  materialId: nullableEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: nullableTextSchema,
  unit: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: nullableTextSchema,
  batchNo: requiredTextSchema,
  batchNoNormalized: nullableTextSchema,
  remainingQuantity: nonNegativeIntegerSchema,
  salesRemainingQuantity: nonNegativeIntegerSchema,
  salesRemainingWeightTon: nonNegativeDecimalSchema,
  quantity: positiveIntegerSchema,
  quantityUnit: nullableTextSchema,
  pieceWeightTon: nonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: nonNegativeDecimalSchema,
  actualWeightTon: nullableDecimalSchema,
  unitPrice: nonNegativeDecimalSchema,
  amount: decimalSchema,
})

const purchaseOrderRecordShape = {
  id: entityIdSchema,
  orderNo: requiredTextSchema,
  supplierId: nullableEntityIdSchema,
  supplierCode: nullableTextSchema,
  supplierName: requiredTextSchema,
  orderDate: responseDateTimeSchema,
  buyerName: nullableTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  totalWeight: nonNegativeDecimalSchema,
  totalAmount: decimalSchema,
  status: purchaseOrderStatusSchema,
  deletedFlag: z.boolean(),
  remark: nullableTextSchema,
}

export const purchaseOrderListRecordSchema = z
  .strictObject({
    ...purchaseOrderRecordShape,
    items: z.null(),
  })
  .transform(({ items: _items, ...record }) => record)

export const purchaseOrderDetailRecordSchema = z.strictObject({
  ...purchaseOrderRecordShape,
  items: z.array(purchaseOrderItemSchema).min(1),
})

export const purchaseOrderSaveItemSchema = z.strictObject({
  id: entityIdSchema.optional(),
  materialId: optionalEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: optionalTextSchema,
  unit: requiredTextSchema,
  warehouseId: optionalEntityIdSchema,
  warehouseName: optionalTextSchema,
  batchNo: requiredTextSchema,
  quantity: positiveIntegerSchema,
  quantityUnit: optionalTextSchema,
  pieceWeightTon: requestNonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: optionalRequestNonNegativeDecimalSchema,
  unitPrice: requestNonNegativeDecimalSchema,
  amount: optionalRequestDecimalSchema,
})

export const purchaseOrderSaveRequestSchema = z.strictObject({
  orderNo: optionalTextSchema,
  supplierId: entityIdSchema,
  supplierCode: optionalTextSchema,
  supplierName: requiredTextSchema,
  settlementCompanyId: entityIdSchema,
  orderDate: responseDateTimeSchema,
  buyerName: optionalTextSchema,
  status: purchaseOrderStatusSchema.nullish(),
  remark: optionalTextSchema,
  items: z.array(purchaseOrderSaveItemSchema).min(1),
})

export const purchaseOrderImportCandidateSchema = z.strictObject({
  id: entityIdSchema,
  orderNo: requiredTextSchema,
  supplierId: nullableEntityIdSchema,
  supplierCode: nullableTextSchema,
  supplierName: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  buyerName: nullableTextSchema,
  orderDate: responseDateTimeSchema,
  totalWeight: nonNegativeDecimalSchema,
  totalAmount: decimalSchema,
  status: purchaseOrderStatusSchema,
  importableQuantity: positiveIntegerSchema,
})

// Purchase inbound

export const purchaseInboundItemSchema = z.strictObject({
  id: entityIdSchema,
  lineNo: integerSchema,
  materialId: nullableEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: nullableTextSchema,
  unit: requiredTextSchema,
  sourcePurchaseOrderItemId: entityIdSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: requiredTextSchema,
  settlementMode: nullableTextSchema,
  batchNo: nullableTextSchema,
  batchNoNormalized: nullableTextSchema,
  remainingQuantity: nonNegativeIntegerSchema,
  quantity: positiveIntegerSchema,
  quantityUnit: nullableTextSchema,
  pieceWeightTon: nonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: nonNegativeDecimalSchema,
  weighWeightTon: nullableDecimalSchema,
  weightAdjustmentTon: nullableDecimalSchema,
  weightAdjustmentAmount: nullableDecimalSchema,
  unitPrice: nonNegativeDecimalSchema,
  amount: decimalSchema,
})

const purchaseInboundRecordShape = {
  id: entityIdSchema,
  inboundNo: requiredTextSchema,
  purchaseOrderNo: requiredTextSchema,
  supplierId: nullableEntityIdSchema,
  supplierCode: nullableTextSchema,
  supplierName: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: requiredTextSchema,
  inboundDate: responseDateTimeSchema,
  settlementMode: nullableTextSchema,
  totalWeight: nonNegativeDecimalSchema,
  totalAmount: decimalSchema,
  status: purchaseInboundStatusSchema,
  deletedFlag: z.boolean(),
  remark: nullableTextSchema,
  totalWeighWeightTon: nonNegativeDecimalSchema,
  totalWeightAdjustmentTon: decimalSchema,
}

export const purchaseInboundListRecordSchema = z
  .strictObject({
    ...purchaseInboundRecordShape,
    items: z.null(),
  })
  .transform(({ items: _items, ...record }) => record)

export const purchaseInboundDetailRecordSchema = z.strictObject({
  ...purchaseInboundRecordShape,
  items: z.array(purchaseInboundItemSchema).min(1),
})

export const purchaseInboundSaveItemSchema = z.strictObject({
  id: entityIdSchema.optional(),
  materialId: entityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: optionalTextSchema,
  unit: requiredTextSchema,
  sourcePurchaseOrderItemId: entityIdSchema,
  warehouseId: entityIdSchema,
  warehouseName: requiredTextSchema,
  settlementMode: optionalTextSchema,
  batchNo: optionalTextSchema,
  quantity: positiveIntegerSchema,
  quantityUnit: optionalTextSchema,
  pieceWeightTon: requestNonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: optionalRequestNonNegativeDecimalSchema,
  weighWeightTon: optionalRequestDecimalSchema,
  weightAdjustmentTon: optionalRequestDecimalSchema,
  weightAdjustmentAmount: optionalRequestDecimalSchema,
  unitPrice: requestNonNegativeDecimalSchema,
  amount: optionalRequestDecimalSchema,
})

export const purchaseInboundSaveRequestSchema = z.strictObject({
  inboundNo: optionalTextSchema,
  purchaseOrderNo: requiredTextSchema,
  supplierId: entityIdSchema,
  supplierCode: requiredTextSchema,
  supplierName: requiredTextSchema,
  warehouseId: entityIdSchema,
  warehouseName: requiredTextSchema,
  inboundDate: responseDateTimeSchema,
  settlementMode: optionalTextSchema,
  status: purchaseInboundStatusSchema.nullish(),
  remark: optionalTextSchema,
  items: z.array(purchaseInboundSaveItemSchema).min(1),
})

// Sales order

export const salesOrderItemSchema = z.strictObject({
  id: entityIdSchema,
  lineNo: integerSchema,
  materialId: nullableEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: nullableTextSchema,
  unit: requiredTextSchema,
  sourceInboundItemId: nullableEntityIdSchema,
  sourcePurchaseOrderItemId: nullableEntityIdSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: requiredTextSchema,
  batchNo: nullableTextSchema,
  batchNoNormalized: nullableTextSchema,
  quantity: nonNegativeIntegerSchema,
  quantityUnit: nullableTextSchema,
  pieceWeightTon: nonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: nonNegativeDecimalSchema,
  unitPrice: nonNegativeDecimalSchema,
  amount: decimalSchema,
  originalWeightTon: nullableDecimalSchema,
})

const salesOrderRecordShape = {
  id: entityIdSchema,
  orderNo: requiredTextSchema,
  purchaseInboundNo: nullableTextSchema,
  purchaseOrderNo: nullableTextSchema,
  customerCode: nullableTextSchema,
  customerId: nullableEntityIdSchema,
  customerName: requiredTextSchema,
  projectId: nullableEntityIdSchema,
  projectName: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  deliveryDate: responseDateTimeSchema,
  salesName: requiredTextSchema,
  totalWeight: nonNegativeDecimalSchema,
  totalAmount: decimalSchema,
  status: salesOrderStatusSchema,
  deletedFlag: z.boolean(),
  remark: nullableTextSchema,
}

export const salesOrderListRecordSchema = z
  .strictObject({
    ...salesOrderRecordShape,
    items: z.null(),
  })
  .transform(({ items: _items, ...record }) => record)

export const salesOrderDetailRecordSchema = z.strictObject({
  ...salesOrderRecordShape,
  items: z.array(salesOrderItemSchema).min(1),
})

export const salesOrderSaveItemSchema = z.strictObject({
  id: entityIdSchema.optional(),
  materialId: optionalEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: optionalTextSchema,
  unit: requiredTextSchema,
  sourceInboundItemId: optionalEntityIdSchema,
  sourcePurchaseOrderItemId: optionalEntityIdSchema,
  warehouseId: optionalEntityIdSchema,
  warehouseName: requiredTextSchema,
  batchNo: optionalTextSchema,
  quantity: nonNegativeIntegerSchema,
  quantityUnit: optionalTextSchema,
  pieceWeightTon: requestNonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: optionalRequestNonNegativeDecimalSchema,
  unitPrice: requestNonNegativeDecimalSchema,
  amount: optionalRequestDecimalSchema,
})

export const salesOrderSaveRequestSchema = z.strictObject({
  orderNo: optionalTextSchema,
  purchaseInboundNo: optionalTextSchema,
  purchaseOrderNo: optionalTextSchema,
  customerCode: optionalTextSchema,
  customerId: optionalEntityIdSchema,
  customerName: requiredTextSchema,
  projectId: optionalEntityIdSchema,
  projectName: requiredTextSchema,
  settlementCompanyId: optionalEntityIdSchema,
  settlementCompanyName: optionalTextSchema,
  deliveryDate: responseDateTimeSchema,
  salesName: requiredTextSchema,
  status: salesOrderStatusSchema.nullish(),
  remark: optionalTextSchema,
  items: z.array(salesOrderSaveItemSchema).min(1),
})

export const salesOrderSourceCandidateItemSchema = z.strictObject({
  id: entityIdSchema,
  lineNo: integerSchema,
  sourceInboundItemId: entityIdSchema,
  sourcePurchaseOrderItemId: z.null(),
  rootPurchaseOrderItemId: entityIdSchema,
  sourceLineNo: integerSchema,
  inboundNo: requiredTextSchema,
  materialId: nullableEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: nullableTextSchema,
  unit: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: requiredTextSchema,
  batchNo: nullableTextSchema,
  batchNoNormalized: nullableTextSchema,
  quantity: positiveIntegerSchema,
  remainingQuantity: positiveIntegerSchema,
  quantityUnit: nullableTextSchema,
  pieceWeightTon: nonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: nonNegativeDecimalSchema,
  remainingWeightTon: nonNegativeDecimalSchema,
  unitPrice: nonNegativeDecimalSchema,
  amount: decimalSchema,
})

export const salesOrderSourceCandidateSchema = z.strictObject({
  id: entityIdSchema,
  orderNo: requiredTextSchema,
  purchaseOrderNo: requiredTextSchema,
  sourceDocumentType: z.literal('purchase-inbound'),
  sourceNo: requiredTextSchema,
  supplierId: nullableEntityIdSchema,
  supplierCode: nullableTextSchema,
  supplierName: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  orderDate: responseDateTimeSchema,
  status: purchaseOrderStatusSchema,
  importableQuantity: positiveIntegerSchema,
  totalWeight: nonNegativeDecimalSchema,
  totalAmount: decimalSchema,
  items: z.array(salesOrderSourceCandidateItemSchema).min(1),
})

// Sales outbound

export const salesOutboundItemSchema = z.strictObject({
  id: entityIdSchema,
  lineNo: integerSchema,
  sourceNo: nullableTextSchema,
  sourceSalesOrderItemId: entityIdSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  materialId: nullableEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: nullableTextSchema,
  unit: requiredTextSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: requiredTextSchema,
  batchNo: nullableTextSchema,
  batchNoNormalized: nullableTextSchema,
  quantity: nonNegativeIntegerSchema,
  quantityUnit: nullableTextSchema,
  pieceWeightTon: nonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: nonNegativeDecimalSchema,
  unitPrice: nonNegativeDecimalSchema,
  amount: decimalSchema,
})

const salesOutboundRecordShape = {
  id: entityIdSchema,
  outboundNo: requiredTextSchema,
  salesOrderNo: nullableTextSchema,
  customerId: nullableEntityIdSchema,
  customerName: requiredTextSchema,
  projectId: nullableEntityIdSchema,
  projectName: requiredTextSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: nullableTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  outboundDate: responseDateTimeSchema,
  totalWeight: nonNegativeDecimalSchema,
  totalAmount: decimalSchema,
  status: salesOutboundStatusSchema,
  deletedFlag: z.boolean(),
  remark: nullableTextSchema,
}

export const salesOutboundListRecordSchema = z
  .strictObject({
    ...salesOutboundRecordShape,
    items: z.null(),
  })
  .transform(({ items: _items, ...record }) => record)

export const salesOutboundDetailRecordSchema = z.strictObject({
  ...salesOutboundRecordShape,
  items: z.array(salesOutboundItemSchema).min(1),
})

export const salesOutboundSaveItemSchema = z.strictObject({
  id: entityIdSchema.optional(),
  sourceNo: optionalTextSchema,
  sourceSalesOrderItemId: entityIdSchema,
  materialId: optionalEntityIdSchema,
  materialCode: requiredTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: optionalTextSchema,
  unit: requiredTextSchema,
  warehouseId: optionalEntityIdSchema,
  warehouseName: requiredTextSchema,
  batchNo: optionalTextSchema,
  quantity: nonNegativeIntegerSchema,
  quantityUnit: optionalTextSchema,
  pieceWeightTon: requestNonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  weightTon: optionalRequestNonNegativeDecimalSchema,
  unitPrice: requestNonNegativeDecimalSchema,
  amount: optionalRequestDecimalSchema,
})

export const salesOutboundSaveRequestSchema = z.strictObject({
  outboundNo: optionalTextSchema,
  salesOrderNo: optionalTextSchema,
  customerId: optionalEntityIdSchema,
  customerName: requiredTextSchema,
  projectId: optionalEntityIdSchema,
  projectName: requiredTextSchema,
  warehouseName: optionalTextSchema,
  outboundDate: responseDateTimeSchema,
  status: salesOutboundStatusSchema.nullish(),
  remark: optionalTextSchema,
  items: z.array(salesOutboundSaveItemSchema).min(1),
})

// Freight bill

export const freightBillItemSchema = z.strictObject({
  id: entityIdSchema,
  lineNo: integerSchema,
  sourceNo: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  customerId: nullableEntityIdSchema,
  customerName: nullableTextSchema,
  projectId: nullableEntityIdSchema,
  projectName: nullableTextSchema,
  materialId: nullableEntityIdSchema,
  materialCode: requiredTextSchema,
  materialName: nullableTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: nullableTextSchema,
  quantity: positiveIntegerSchema,
  quantityUnit: nullableTextSchema,
  pieceWeightTon: nonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  batchNo: nullableTextSchema,
  batchNoNormalized: nullableTextSchema,
  weightTon: nonNegativeDecimalSchema,
  warehouseId: nullableEntityIdSchema,
  warehouseName: nullableTextSchema,
  sourceFreightBillId: nullableEntityIdSchema,
  sourceFreightBillItemId: nullableEntityIdSchema,
  sourceSalesOrderItemId: nullableEntityIdSchema,
})

const freightBillRecordShape = {
  id: entityIdSchema,
  billNo: requiredTextSchema,
  carrierId: nullableEntityIdSchema,
  carrierCode: nullableTextSchema,
  carrierName: requiredTextSchema,
  settlementCompanyId: nullableEntityIdSchema,
  settlementCompanyName: nullableTextSchema,
  vehicleId: nullableEntityIdSchema,
  vehiclePlate: nullableTextSchema,
  billTime: responseDateTimeSchema,
  unitPrice: nonNegativeDecimalSchema,
  totalWeight: nonNegativeDecimalSchema,
  totalFreight: decimalSchema,
  status: freightBillStatusSchema,
  deletedFlag: z.boolean(),
  remark: nullableTextSchema,
}

export const freightBillListRecordSchema = z
  .strictObject({
    ...freightBillRecordShape,
    items: z.null(),
  })
  .transform(({ items: _items, ...record }) => record)

export const freightBillDetailRecordSchema = z.strictObject({
  ...freightBillRecordShape,
  items: z.array(freightBillItemSchema).min(1),
})

export const freightBillSaveItemSchema = z.strictObject({
  id: entityIdSchema.optional(),
  sourceNo: requiredTextSchema,
  settlementCompanyId: optionalEntityIdSchema,
  settlementCompanyName: optionalTextSchema,
  customerId: optionalEntityIdSchema,
  customerName: optionalTextSchema,
  projectId: optionalEntityIdSchema,
  projectName: optionalTextSchema,
  materialId: optionalEntityIdSchema,
  materialCode: requiredTextSchema,
  materialName: optionalTextSchema,
  brand: requiredTextSchema,
  category: requiredTextSchema,
  material: requiredTextSchema,
  spec: requiredTextSchema,
  length: optionalTextSchema,
  quantity: positiveIntegerSchema,
  quantityUnit: optionalTextSchema,
  pieceWeightTon: requestNonNegativeDecimalSchema,
  piecesPerBundle: nonNegativeIntegerSchema,
  batchNo: optionalTextSchema,
  weightTon: optionalRequestNonNegativeDecimalSchema,
  warehouseId: optionalEntityIdSchema,
  warehouseName: optionalTextSchema,
  sourceSalesOrderItemId: optionalEntityIdSchema,
})

export const freightBillSaveRequestSchema = z.strictObject({
  billNo: optionalTextSchema,
  carrierId: optionalEntityIdSchema,
  carrierCode: optionalTextSchema,
  carrierName: requiredTextSchema,
  settlementCompanyId: optionalEntityIdSchema,
  settlementCompanyName: optionalTextSchema,
  vehiclePlate: optionalTextSchema,
  billTime: responseDateTimeSchema,
  unitPrice: requestNonNegativeDecimalSchema,
  status: freightBillStatusSchema.nullish(),
  remark: optionalTextSchema,
  items: z.array(freightBillSaveItemSchema).min(1),
})

export const MAIN_FLOW_MODULE_KEYS = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
] as const satisfies readonly ModuleKey[]

export type MainFlowModuleKey = (typeof MAIN_FLOW_MODULE_KEYS)[number]

const mainFlowModuleKeySet: ReadonlySet<string> = new Set(MAIN_FLOW_MODULE_KEYS)

export function isMainFlowModuleKey(value: string): value is MainFlowModuleKey {
  return mainFlowModuleKeySet.has(value)
}

export const mainFlowListRecordSchemas = {
  'purchase-order': purchaseOrderListRecordSchema,
  'purchase-inbound': purchaseInboundListRecordSchema,
  'sales-order': salesOrderListRecordSchema,
  'sales-outbound': salesOutboundListRecordSchema,
  'freight-bill': freightBillListRecordSchema,
} satisfies Record<MainFlowModuleKey, z.ZodType>

export const mainFlowDetailRecordSchemas = {
  'purchase-order': purchaseOrderDetailRecordSchema,
  'purchase-inbound': purchaseInboundDetailRecordSchema,
  'sales-order': salesOrderDetailRecordSchema,
  'sales-outbound': salesOutboundDetailRecordSchema,
  'freight-bill': freightBillDetailRecordSchema,
} satisfies Record<MainFlowModuleKey, z.ZodType>

export const mainFlowSaveRequestSchemas = {
  'purchase-order': purchaseOrderSaveRequestSchema,
  'purchase-inbound': purchaseInboundSaveRequestSchema,
  'sales-order': salesOrderSaveRequestSchema,
  'sales-outbound': salesOutboundSaveRequestSchema,
  'freight-bill': freightBillSaveRequestSchema,
} satisfies Record<MainFlowModuleKey, z.ZodType>

export const mainFlowStatusSchemas = {
  'purchase-order': purchaseOrderStatusSchema,
  'purchase-inbound': purchaseInboundStatusSchema,
  'sales-order': salesOrderStatusSchema,
  'sales-outbound': salesOutboundStatusSchema,
  'freight-bill': freightBillStatusSchema,
} satisfies Record<MainFlowModuleKey, z.ZodType>

export const mainFlowListResponseSchemas = {
  'purchase-order': exactPageSchema(purchaseOrderListRecordSchema),
  'purchase-inbound': exactPageSchema(purchaseInboundListRecordSchema),
  'sales-order': exactPageSchema(salesOrderListRecordSchema),
  'sales-outbound': exactPageSchema(salesOutboundListRecordSchema),
  'freight-bill': exactPageSchema(freightBillListRecordSchema),
} satisfies Record<MainFlowModuleKey, z.ZodType>

export const mainFlowDetailResponseSchemas = {
  'purchase-order': purchaseOrderDetailRecordSchema,
  'purchase-inbound': purchaseInboundDetailRecordSchema,
  'sales-order': salesOrderDetailRecordSchema,
  'sales-outbound': salesOutboundDetailRecordSchema,
  'freight-bill': freightBillDetailRecordSchema,
} satisfies Record<MainFlowModuleKey, z.ZodType>

export const purchaseOrderImportCandidatePageResponseSchema = exactPageSchema(
  purchaseOrderImportCandidateSchema,
)
export const salesOrderSourceCandidatePageResponseSchema = exactPageSchema(
  salesOrderSourceCandidateSchema,
)
export const salesOrderOutboundCandidatePageResponseSchema = exactPageSchema(
  salesOrderDetailRecordSchema,
)
export const freightSalesOrderCandidatePageResponseSchema = exactPageSchema(
  salesOrderDetailRecordSchema,
)

export function getMainFlowListResponseSchema<Key extends MainFlowModuleKey>(
  moduleKey: Key,
): (typeof mainFlowListResponseSchemas)[Key]
export function getMainFlowListResponseSchema(
  moduleKey: string,
): (typeof mainFlowListResponseSchemas)[MainFlowModuleKey] | undefined
export function getMainFlowListResponseSchema(moduleKey: string) {
  return isMainFlowModuleKey(moduleKey)
    ? mainFlowListResponseSchemas[moduleKey]
    : undefined
}

export function getMainFlowDetailResponseSchema<Key extends MainFlowModuleKey>(
  moduleKey: Key,
): (typeof mainFlowDetailResponseSchemas)[Key]
export function getMainFlowDetailResponseSchema(
  moduleKey: string,
): (typeof mainFlowDetailResponseSchemas)[MainFlowModuleKey] | undefined
export function getMainFlowDetailResponseSchema(moduleKey: string) {
  return isMainFlowModuleKey(moduleKey)
    ? mainFlowDetailResponseSchemas[moduleKey]
    : undefined
}

export function parseMainFlowSaveRequest<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  payload: unknown,
): ModuleSaveRequestMap[Key]
export function parseMainFlowSaveRequest(
  moduleKey: string,
  payload: unknown,
): unknown
export function parseMainFlowSaveRequest(moduleKey: string, payload: unknown) {
  if (!isMainFlowModuleKey(moduleKey)) {
    return payload
  }
  return mainFlowSaveRequestSchemas[moduleKey].parse(payload)
}

export function parseMainFlowStatus(moduleKey: string, status: string): string {
  if (!isMainFlowModuleKey(moduleKey)) {
    return status
  }
  return mainFlowStatusSchemas[moduleKey].parse(status)
}

export type PurchaseOrderItem = z.output<typeof purchaseOrderItemSchema>
export type PurchaseOrder = z.output<typeof purchaseOrderDetailRecordSchema>
export type PurchaseOrderListRecord = z.output<
  typeof purchaseOrderListRecordSchema
>
export type PurchaseOrderSaveRequest = z.output<
  typeof purchaseOrderSaveRequestSchema
>
export type PurchaseOrderImportCandidate = z.output<
  typeof purchaseOrderImportCandidateSchema
>

export type PurchaseInboundItem = z.output<typeof purchaseInboundItemSchema>
export type PurchaseInbound = z.output<typeof purchaseInboundDetailRecordSchema>
export type PurchaseInboundListRecord = z.output<
  typeof purchaseInboundListRecordSchema
>
export type PurchaseInboundSaveRequest = z.output<
  typeof purchaseInboundSaveRequestSchema
>

export type SalesOrderItem = z.output<typeof salesOrderItemSchema>
export type SalesOrder = z.output<typeof salesOrderDetailRecordSchema>
export type SalesOrderListRecord = z.output<typeof salesOrderListRecordSchema>
export type SalesOrderSaveRequest = z.output<typeof salesOrderSaveRequestSchema>
export type SalesOrderSourceCandidate = z.output<
  typeof salesOrderSourceCandidateSchema
>

export type SalesOutboundItem = z.output<typeof salesOutboundItemSchema>
export type SalesOutbound = z.output<typeof salesOutboundDetailRecordSchema>
export type SalesOutboundListRecord = z.output<
  typeof salesOutboundListRecordSchema
>
export type SalesOutboundSaveRequest = z.output<
  typeof salesOutboundSaveRequestSchema
>

export type FreightBillItem = z.output<typeof freightBillItemSchema>
export type FreightBill = z.output<typeof freightBillDetailRecordSchema>
export type FreightBillListRecord = z.output<typeof freightBillListRecordSchema>
export type FreightBillSaveRequest = z.output<
  typeof freightBillSaveRequestSchema
>

export interface ModuleRecordMap {
  'purchase-order': PurchaseOrder
  'purchase-inbound': PurchaseInbound
  'sales-order': SalesOrder
  'sales-outbound': SalesOutbound
  'freight-bill': FreightBill
}

export interface ModuleListRecordMap {
  'purchase-order': PurchaseOrderListRecord
  'purchase-inbound': PurchaseInboundListRecord
  'sales-order': SalesOrderListRecord
  'sales-outbound': SalesOutboundListRecord
  'freight-bill': FreightBillListRecord
}

export interface ModuleSaveRequestMap {
  'purchase-order': PurchaseOrderSaveRequest
  'purchase-inbound': PurchaseInboundSaveRequest
  'sales-order': SalesOrderSaveRequest
  'sales-outbound': SalesOutboundSaveRequest
  'freight-bill': FreightBillSaveRequest
}

export type LineItem =
  | PurchaseOrderItem
  | PurchaseInboundItem
  | SalesOrderItem
  | SalesOutboundItem
  | FreightBillItem

export type ModuleRecord = ModuleRecordMap[MainFlowModuleKey]
