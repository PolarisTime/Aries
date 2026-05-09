import {
  materialCategoryOptions,
  warehouseOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { formatInteger, formatWeight, sumBy } from './shared'

export const inventoryReportPageConfig: ModulePageConfig = {
  key: 'inventory-report',
  title: '商品库存报表',
  kicker: 'Reports',
  description:
    '库存报表按商品编码、材质、类别、规格、长度、仓库、批号展示结存结果，便于先确认前端字段和查询交互。',
  readOnly: true,
  actions: [{ key: 'export', label: '导出', type: 'primary' }],
  filters: [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      placeholder: '商品编码 / 品牌 / 规格',
    },
    {
      key: 'warehouseName',
      label: '仓库',
      type: 'select',
      options: warehouseOptions(),
    },
    {
      key: 'category',
      label: '类别',
      type: 'select',
      options: materialCategoryOptions,
    },
  ],
  columns: [
    { title: '商品编码', dataIndex: 'materialCode', width: 150 },
    { title: '品牌', dataIndex: 'brand', width: 120 },
    { title: '材质', dataIndex: 'material', width: 120 },
    { title: '类别', dataIndex: 'category', width: 110 },
    { title: '规格', dataIndex: 'spec', width: 100 },
    { title: '长度', dataIndex: 'length', width: 100 },
    { title: '仓库', dataIndex: 'warehouseName', width: 110 },
    { title: '批号', dataIndex: 'batchNo', width: 140 },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    { title: '数量单位', dataIndex: 'quantityUnit', width: 90 },
    {
      title: '结存重量（吨）',
      dataIndex: 'weightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
  ],
  detailFields: [
    { label: '商品编码', key: 'materialCode' },
    { label: '品牌', key: 'brand' },
    { label: '材质', key: 'material' },
    { label: '类别', key: 'category' },
    { label: '规格', key: 'spec' },
    { label: '长度', key: 'length' },
    { label: '仓库', key: 'warehouseName' },
    { label: '批号', key: 'batchNo' },
    { label: '数量', key: 'quantity', type: 'count' },
    { label: '数量单位', key: 'quantityUnit' },
    { label: '结存重量（吨）', key: 'weightTon', type: 'weight' },
    { label: '每件件重（吨）', key: 'pieceWeightTon', type: 'weight' },
    { label: '单位', key: 'unit' },
  ],
  data: [],
  buildOverview: (rows) => [
    { label: '库存记录', value: formatInteger(rows.length) },
    {
      label: '结存重量（吨）',
      value: formatWeight(sumBy(rows, 'weightTon')),
    },
  ],
}
