import i18next from 'i18next'
import type { ModuleColumnDefinition } from '@/types/module-page'
import { applyCompactItemLayout } from './shared-item-column-utils'

const compactFreightItemWidthMap: Record<string, number> = {
  sourceNo: 140,
  customerName: 136,
  projectName: 156,
  materialCode: 240,
  materialName: 156,
  brand: 92,
  category: 84,
  material: 92,
  spec: 128,
  length: 64,
  quantity: 70,
  quantityUnit: 64,
  pieceWeightTon: 90,
  weightTon: 108,
  warehouseName: 132,
  batchNo: 120,
}

// 仓库紧邻商品身份字段，物流明细按仓库和品牌核对时更易扫描。
export const freightItemColumns: ModuleColumnDefinition[] = [
  {
    title: i18next.t('modules.columns.outboundNo'),
    dataIndex: 'sourceNo',
    width: 140,
  },
  {
    title: i18next.t('modules.columns.materialCode'),
    dataIndex: 'materialCode',
    width: 148,
  },
  {
    title: i18next.t('modules.columns.materialName'),
    dataIndex: 'materialName',
    width: 156,
  },
  { title: i18next.t('modules.columns.spec'), dataIndex: 'spec', width: 128 },
  {
    title: i18next.t('modules.columns.material'),
    dataIndex: 'material',
    width: 92,
  },
  {
    title: i18next.t('modules.columns.customerName'),
    dataIndex: 'customerName',
    width: 136,
  },
  {
    title: i18next.t('modules.columns.projectName'),
    dataIndex: 'projectName',
    width: 156,
  },
  {
    title: i18next.t('modules.columns.warehouse'),
    dataIndex: 'warehouseName',
    width: 132,
  },
  { title: i18next.t('modules.columns.brand'), dataIndex: 'brand', width: 92 },
  {
    title: i18next.t('modules.columns.category'),
    dataIndex: 'category',
    width: 84,
  },
  {
    title: i18next.t('modules.columns.length'),
    dataIndex: 'length',
    width: 70,
  },
  {
    title: i18next.t('modules.columns.quantity'),
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
  },
  {
    title: i18next.t('modules.columns.quantityUnit'),
    dataIndex: 'quantityUnit',
    width: 64,
    align: 'center',
  },
  {
    title: i18next.t('modules.columns.pieceWeightTon'),
    dataIndex: 'pieceWeightTon',
    width: 90,
    align: 'center',
    type: 'weight',
  },
  {
    title: i18next.t('modules.columns.piecesPerBundle'),
    dataIndex: 'piecesPerBundle',
    width: 76,
    align: 'center',
    type: 'count',
  },
  {
    title: i18next.t('modules.columns.batchNo'),
    dataIndex: 'batchNo',
    width: 130,
  },
  {
    title: i18next.t('modules.columns.weightTon'),
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
  },
]

export const compactFreightItemColumns = applyCompactItemLayout(
  freightItemColumns,
  compactFreightItemWidthMap,
  ['category', 'piecesPerBundle', 'batchNo'],
)

// 物流对账单明细列：客户名称/项目名称抽到项目分组行展示，移除商品编码、商品名称、每件支数、批号列，
// 品牌列提前到商品名称位置，出库单号（物流单号）列加宽以便完整显示雪花 ID。
const freightStatementColumnOrder = [
  'sourceNo',
  'warehouseName',
  'brand',
  'spec',
  'material',
  'category',
  'length',
  'quantity',
  'quantityUnit',
  'pieceWeightTon',
  'weightTon',
] as const

export const freightStatementItemColumns: ModuleColumnDefinition[] =
  freightStatementColumnOrder
    .map((key) => freightItemColumns.find((column) => column.dataIndex === key))
    .filter((column): column is ModuleColumnDefinition => column != null)
    .map((column) =>
      column.dataIndex === 'sourceNo' ? { ...column, width: 180 } : column,
    )
