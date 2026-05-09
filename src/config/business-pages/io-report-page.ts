import type { ModulePageConfig } from '@/types/module-page'
import { formatInteger, formatWeight, sumBy } from './shared'

export const ioReportPageConfig: ModulePageConfig = {
  key: 'io-report',
  title: '出入库报表',
  kicker: 'Reports',
  description:
    '出入库报表用于查看业务流水，统一展示查询区、流水表格和明细字段，方便继续接库存与追溯链路。',
  readOnly: true,
  actions: [{ key: 'export', label: '导出', type: 'primary' }],
  filters: [
    {
      key: 'keyword',
      label: '来源单号',
      type: 'input',
      placeholder: '输入来源单号',
    },
    {
      key: 'businessType',
      label: '业务类型',
      type: 'select',
      options: [
        { label: '采购入库', value: '采购入库' },
        { label: '销售出库', value: '销售出库' },
      ],
    },
    { key: 'businessDate', label: '业务日期', type: 'dateRange' },
  ],
  columns: [
    {
      title: '业务日期',
      dataIndex: 'businessDate',
      width: 120,
      type: 'date',
    },
    { title: '业务类型', dataIndex: 'businessType', width: 120 },
    { title: '来源单号', dataIndex: 'sourceNo', width: 160 },
    { title: '商品编码', dataIndex: 'materialCode', width: 140 },
    { title: '规格', dataIndex: 'spec', width: 100 },
    { title: '仓库', dataIndex: 'warehouseName', width: 110 },
    { title: '批号', dataIndex: 'batchNo', width: 140 },
    {
      title: '入库数量',
      dataIndex: 'inQuantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    {
      title: '出库数量',
      dataIndex: 'outQuantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    { title: '数量单位', dataIndex: 'quantityUnit', width: 90 },
    {
      title: '入库重量（吨）',
      dataIndex: 'inWeightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
    {
      title: '出库重量（吨）',
      dataIndex: 'outWeightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
  ],
  detailFields: [
    { label: '业务日期', key: 'businessDate', type: 'date' },
    { label: '业务类型', key: 'businessType' },
    { label: '来源单号', key: 'sourceNo' },
    { label: '商品编码', key: 'materialCode' },
    { label: '规格', key: 'spec' },
    { label: '仓库', key: 'warehouseName' },
    { label: '批号', key: 'batchNo' },
    { label: '入库数量', key: 'inQuantity', type: 'count' },
    { label: '出库数量', key: 'outQuantity', type: 'count' },
    { label: '数量单位', key: 'quantityUnit' },
    { label: '入库重量（吨）', key: 'inWeightTon', type: 'weight' },
    { label: '出库重量（吨）', key: 'outWeightTon', type: 'weight' },
    { label: '备注', key: 'remark' },
  ],
  data: [],
  buildOverview: (rows) => [
    { label: '流水数', value: formatInteger(rows.length) },
    {
      label: '入库重量（吨）',
      value: formatWeight(sumBy(rows, 'inWeightTon')),
    },
    {
      label: '出库重量（吨）',
      value: formatWeight(sumBy(rows, 'outWeightTon')),
    },
  ],
}
