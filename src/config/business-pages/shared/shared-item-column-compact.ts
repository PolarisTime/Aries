import i18next from 'i18next'
import {
  batchOrderItemColumns,
  batchSupplierStatementItemColumns,
  orderItemColumns,
  purchaseInboundItemColumns,
  purchaseItemColumns,
} from './shared-item-column-base'
import { applyCompactItemLayout } from './shared-item-column-utils'

const compactTradeItemWidthMap: Record<string, number> = {
  sourceNo: 140,
  materialCode: 280,
  brand: 68,
  category: 58,
  material: 76,
  spec: 72,
  length: 64,
  unit: 56,
  warehouseName: 160,
  quantity: 70,
  quantityUnit: 64,
  batchNo: 130,
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

export const compactBatchCustomerStatementItemColumns = applyCompactItemLayout(
  [
    {
      title: i18next.t('modules.columns.orderNo'),
      dataIndex: 'sourceNo',
      width: 160,
    },
    ...batchOrderItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchSupplierStatementItemColumns = applyCompactItemLayout(
  [
    {
      title: i18next.t('modules.columns.inboundNo'),
      dataIndex: 'sourceNo',
      width: 160,
    },
    ...batchSupplierStatementItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactInvoiceReceiptItemColumns = applyCompactItemLayout(
  [
    {
      title: i18next.t('modules.columns.purchaseOrderNo'),
      dataIndex: 'sourceNo',
      width: 160,
    },
    ...purchaseItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactInvoiceIssueItemColumns = applyCompactItemLayout(
  [
    {
      title: i18next.t('modules.columns.salesOrderNo'),
      dataIndex: 'sourceNo',
      width: 160,
    },
    ...purchaseItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)
