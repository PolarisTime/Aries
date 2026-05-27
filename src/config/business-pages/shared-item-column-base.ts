import i18next from 'i18next'
import type { ModuleColumnDefinition } from '@/types/module-page'
import { insertColumnsAfter } from './shared-item-column-utils'

const materialInfoColumns: ModuleColumnDefinition[] = [
  {
    title: i18next.t('modules.columns.materialCode'),
    dataIndex: 'materialCode',
    width: 240,
    required: true,
    align: 'center',
  },
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
    width: 78,
    required: true,
    align: 'center',
  },
  { title: i18next.t('modules.columns.length'), dataIndex: 'length', width: 70, align: 'center' },
  {
    title: i18next.t('modules.columns.unit'),
    dataIndex: 'unit',
    width: 58,
    required: true,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.pieceWeightTon'),
    dataIndex: 'pieceWeightTon',
    width: 82,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: i18next.t('modules.columns.piecesPerBundle'),
    dataIndex: 'piecesPerBundle',
    width: 76,
    align: 'center',
    type: 'count',
  },
]

export const orderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  {
    title: i18next.t('modules.columns.quantity'),
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
    required: true,
  },
  { title: i18next.t('modules.columns.quantityUnit'), dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  {
    title: i18next.t('modules.columns.weightTon'),
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: i18next.t('modules.columns.unitPrice'),
    dataIndex: 'unitPrice',
    width: 88,
    align: 'center',
    type: 'amount',
    required: true,
  },
  {
    title: i18next.t('modules.columns.amount'),
    dataIndex: 'amount',
    width: 92,
    align: 'center',
    type: 'amount',
    required: true,
  },
]

export const batchOrderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: i18next.t('modules.columns.batchNo'), dataIndex: 'batchNo', width: 130 },
  {
    title: i18next.t('modules.columns.quantity'),
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
    required: true,
  },
  { title: i18next.t('modules.columns.quantityUnit'), dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  {
    title: i18next.t('modules.columns.weightTon'),
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: i18next.t('modules.columns.unitPrice'),
    dataIndex: 'unitPrice',
    width: 88,
    align: 'center',
    type: 'amount',
    required: true,
  },
  {
    title: i18next.t('modules.columns.amount'),
    dataIndex: 'amount',
    width: 92,
    align: 'center',
    type: 'amount',
    required: true,
  },
]

export const purchaseItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: i18next.t('modules.columns.warehouseName'), dataIndex: 'warehouseName', width: 110, required: true },
  { title: i18next.t('modules.columns.batchNo'), dataIndex: 'batchNo', width: 130 },
  {
    title: i18next.t('modules.columns.quantity'),
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
    required: true,
  },
  { title: i18next.t('modules.columns.quantityUnit'), dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  {
    title: i18next.t('modules.columns.weightTon'),
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: i18next.t('modules.columns.unitPrice'),
    dataIndex: 'unitPrice',
    width: 88,
    align: 'center',
    type: 'amount',
    required: true,
  },
  {
    title: i18next.t('modules.columns.amount'),
    dataIndex: 'amount',
    width: 92,
    align: 'center',
    type: 'amount',
    required: true,
  },
]

const purchaseWeighColumns: ModuleColumnDefinition[] = [
  {
    title: i18next.t('modules.columns.weighWeight'),
    dataIndex: 'weighWeightTon',
    width: 88,
    align: 'center',
    type: 'weight',
  },
  {
    title: i18next.t('modules.columns.weightAdjustmentTon'),
    dataIndex: 'weightAdjustmentTon',
    width: 106,
    align: 'center',
    type: 'weight',
  },
  {
    title: i18next.t('modules.columns.weightAdjustmentAmount'),
    dataIndex: 'weightAdjustmentAmount',
    width: 92,
    align: 'center',
    type: 'amount',
  },
]

const purchaseInboundSettlementColumns: ModuleColumnDefinition[] = [
  {
    title: i18next.t('modules.columns.settlementMode'),
    dataIndex: 'settlementMode',
    width: 76,
    align: 'center',
    required: true,
  },
  ...purchaseWeighColumns,
]

export const purchaseInboundItemColumns = insertColumnsAfter(
  purchaseItemColumns,
  'weightTon',
  purchaseInboundSettlementColumns,
)


export const batchSupplierStatementItemColumns = insertColumnsAfter(
  batchOrderItemColumns,
  'weightTon',
  purchaseWeighColumns,
)
