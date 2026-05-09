import type { ModuleColumnDefinition } from '@/types/module-page'
import { applyCompactItemLayout } from './shared-item-column-utils'

const compactFreightItemWidthMap: Record<string, number> = {
  sourceNo: 140,
  customerName: 104,
  projectName: 130,
  materialCode: 136,
  materialName: 104,
  brand: 68,
  category: 58,
  material: 76,
  spec: 72,
  length: 64,
  quantity: 70,
  quantityUnit: 64,
  pieceWeightTon: 76,
  weightTon: 108,
  warehouseName: 88,
  batchNo: 96,
}

export const freightItemColumns: ModuleColumnDefinition[] = [
  { title: '出库单号', dataIndex: 'sourceNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', width: 104 },
  { title: '项目', dataIndex: 'projectName', width: 130 },
  { title: '商品编码', dataIndex: 'materialCode', width: 128 },
  { title: '商品名称', dataIndex: 'materialName', width: 104 },
  { title: '品牌', dataIndex: 'brand', width: 86 },
  { title: '类别', dataIndex: 'category', width: 72 },
  { title: '材质', dataIndex: 'material', width: 82 },
  { title: '规格', dataIndex: 'spec', width: 78 },
  { title: '长度', dataIndex: 'length', width: 70 },
  {
    title: '数量',
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
  },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  {
    title: '件重/吨',
    dataIndex: 'pieceWeightTon',
    width: 82,
    align: 'center',
    type: 'weight',
  },
  {
    title: '每件支数',
    dataIndex: 'piecesPerBundle',
    width: 76,
    align: 'center',
    type: 'count',
  },
  { title: '批号', dataIndex: 'batchNo', width: 100 },
  {
    title: '总重量（吨）',
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
  },
  { title: '仓库', dataIndex: 'warehouseName', width: 96 },
]

export const compactFreightItemColumns = applyCompactItemLayout(
  freightItemColumns,
  compactFreightItemWidthMap,
  ['customerName', 'projectName', 'brand', 'piecesPerBundle'],
)
