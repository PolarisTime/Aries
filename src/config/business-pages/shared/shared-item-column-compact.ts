import i18next from 'i18next'
import type { ModuleColumnDefinition } from '@/types/module-page'
import {
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

export const compactCustomerStatementItemColumns: ModuleColumnDefinition[] = [
  {
    title: i18next.t('modules.columns.brand'),
    dataIndex: 'brand',
    width: 86,
    required: true,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.category'),
    dataIndex: 'category',
    width: 72,
    required: true,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.material'),
    dataIndex: 'material',
    width: 82,
    required: true,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.spec'),
    dataIndex: 'spec',
    width: 100,
    required: true,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.length'),
    dataIndex: 'length',
    width: 70,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.quantity'),
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
    required: true,
  },
  {
    title: i18next.t('modules.columns.quantityUnit'),
    dataIndex: 'quantityUnit',
    width: 76,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.pieceWeightTon'),
    dataIndex: 'pieceWeightTon',
    width: 92,
    align: 'right',
    type: 'weight',
    required: true,
  },
  {
    title: i18next.t('modules.columns.weightTon'),
    dataIndex: 'weightTon',
    width: 108,
    align: 'right',
    type: 'weight',
    required: true,
  },
  {
    title: i18next.t('modules.columns.unitPrice'),
    dataIndex: 'unitPrice',
    width: 88,
    align: 'right',
    type: 'amount',
    required: true,
  },
  {
    title: i18next.t('modules.columns.amount'),
    dataIndex: 'amount',
    width: 100,
    align: 'right',
    type: 'amount',
    required: true,
  },
]
