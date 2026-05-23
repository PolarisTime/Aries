import {
  batchOrderItemColumns,
  batchSupplierStatementItemColumns,
  orderItemColumns,
  purchaseInboundItemColumns,
  purchaseItemColumns,
  supplierStatementItemColumns,
} from './shared-item-column-base'
import { applyCompactItemLayout } from './shared-item-column-utils'

const compactTradeItemWidthMap: Record<string, number> = {
  sourceNo: 140,
  materialCode: 240,
  brand: 68,
  category: 58,
  material: 76,
  spec: 72,
  length: 64,
  unit: 56,
  warehouseName: 100,
  quantity: 70,
  quantityUnit: 64,
  batchNo: 120,
  pieceWeightTon: 76,
  weightTon: 108,
  settlementMode: 76,
  weighWeightTon: 86,
  weightAdjustmentTon: 106,
  weightAdjustmentAmount: 90,
  unitPrice: 86,
  amount: 90,
}

export const compactOrderItemColumns = applyCompactItemLayout(
  orderItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchOrderItemColumns = applyCompactItemLayout(
  batchOrderItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactWeightOnlyBatchOrderItemColumns = applyCompactItemLayout(
  batchOrderItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle', 'unitPrice', 'amount'],
)

export const compactPurchaseItemColumns = applyCompactItemLayout(
  purchaseItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactPurchaseInboundItemColumns = applyCompactItemLayout(
  purchaseInboundItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactWeightOnlyPurchaseItemColumns = applyCompactItemLayout(
  purchaseItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle', 'unitPrice', 'amount'],
)

export const compactCustomerStatementItemColumns = applyCompactItemLayout(
  [{ title: '订单号', dataIndex: 'sourceNo', width: 160 }, ...orderItemColumns],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchCustomerStatementItemColumns = applyCompactItemLayout(
  [
    { title: '订单号', dataIndex: 'sourceNo', width: 160 },
    ...batchOrderItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactSupplierStatementItemColumns = applyCompactItemLayout(
  [
    { title: '入库单号', dataIndex: 'sourceNo', width: 160 },
    ...supplierStatementItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchSupplierStatementItemColumns = applyCompactItemLayout(
  [
    { title: '入库单号', dataIndex: 'sourceNo', width: 160 },
    ...batchSupplierStatementItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactInvoiceReceiptItemColumns = applyCompactItemLayout(
  [
    { title: '采购订单号', dataIndex: 'sourceNo', width: 160 },
    ...purchaseItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactInvoiceIssueItemColumns = applyCompactItemLayout(
  [
    { title: '销售订单号', dataIndex: 'sourceNo', width: 160 },
    ...purchaseItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)
