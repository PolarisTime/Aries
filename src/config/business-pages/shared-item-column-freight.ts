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
  batchNo: 112,
}

export const freightItemColumns: ModuleColumnDefinition[] = [
  { title: '出库单号', dataIndex: 'sourceNo', width: 140 },
  { title: '商品编码', dataIndex: 'materialCode', width: 148 },
  { title: '商品名称', dataIndex: 'materialName', width: 156 },
  { title: '规格', dataIndex: 'spec', width: 128 },
  { title: '材质', dataIndex: 'material', width: 92 },
  { title: '客户名称', dataIndex: 'customerName', width: 136 },
  { title: '项目名称', dataIndex: 'projectName', width: 156 },
  { title: '品牌', dataIndex: 'brand', width: 92 },
  { title: '类别', dataIndex: 'category', width: 84 },
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
    width: 90,
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
  { title: '仓库', dataIndex: 'warehouseName', width: 132 },
]

export const compactFreightItemColumns = applyCompactItemLayout(
  freightItemColumns,
  compactFreightItemWidthMap,
  ['projectName', 'brand', 'category', 'piecesPerBundle', 'batchNo'],
)
