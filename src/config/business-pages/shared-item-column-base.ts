import type { ModuleColumnDefinition } from '@/types/module-page'
import { insertColumnsAfter } from './shared-item-column-utils'

const materialInfoColumns: ModuleColumnDefinition[] = [
  {
    title: '商品编码',
    dataIndex: 'materialCode',
    width: 128,
    required: true,
    align: 'center',
  },
  {
    title: '品牌',
    dataIndex: 'brand',
    width: 86,
    required: true,
    align: 'center',
  },
  {
    title: '类别',
    dataIndex: 'category',
    width: 72,
    required: true,
    align: 'center',
  },
  {
    title: '材质',
    dataIndex: 'material',
    width: 82,
    required: true,
    align: 'center',
  },
  {
    title: '规格',
    dataIndex: 'spec',
    width: 78,
    required: true,
    align: 'center',
  },
  { title: '长度', dataIndex: 'length', width: 70, align: 'center' },
  {
    title: '单位',
    dataIndex: 'unit',
    width: 58,
    required: true,
    align: 'center',
  },
  {
    title: '件重/吨',
    dataIndex: 'pieceWeightTon',
    width: 82,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: '每件支数',
    dataIndex: 'piecesPerBundle',
    width: 76,
    align: 'center',
    type: 'count',
  },
]

export const orderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  {
    title: '数量',
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
    required: true,
  },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  {
    title: '总重量（吨）',
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    width: 88,
    align: 'center',
    type: 'amount',
    required: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 92,
    align: 'center',
    type: 'amount',
    required: true,
  },
]

export const batchOrderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '批号', dataIndex: 'batchNo', width: 100 },
  {
    title: '数量',
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
    required: true,
  },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  {
    title: '总重量（吨）',
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    width: 88,
    align: 'center',
    type: 'amount',
    required: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 92,
    align: 'center',
    type: 'amount',
    required: true,
  },
]

export const purchaseItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '码头', dataIndex: 'warehouseName', width: 96, required: true },
  { title: '批号', dataIndex: 'batchNo', width: 100 },
  {
    title: '数量',
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
    required: true,
  },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  {
    title: '总重量（吨）',
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
    required: true,
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    width: 88,
    align: 'center',
    type: 'amount',
    required: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 92,
    align: 'center',
    type: 'amount',
    required: true,
  },
]

export const purchaseWeighColumns: ModuleColumnDefinition[] = [
  {
    title: '过磅重量',
    dataIndex: 'weighWeightTon',
    width: 88,
    align: 'center',
    type: 'weight',
  },
  {
    title: '差额重量（吨）',
    dataIndex: 'weightAdjustmentTon',
    width: 106,
    align: 'center',
    type: 'weight',
  },
  {
    title: '差额金额',
    dataIndex: 'weightAdjustmentAmount',
    width: 92,
    align: 'center',
    type: 'amount',
  },
]

const purchaseInboundSettlementColumns: ModuleColumnDefinition[] = [
  {
    title: '结算方式',
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

export const supplierStatementItemColumns = insertColumnsAfter(
  orderItemColumns,
  'weightTon',
  purchaseWeighColumns,
)

export const batchSupplierStatementItemColumns = insertColumnsAfter(
  batchOrderItemColumns,
  'weightTon',
  purchaseWeighColumns,
)
