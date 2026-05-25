import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, formatInteger } from './shared'
import { masterStatusFilter } from './shared-filters'

export const materialCategoriesPageConfig: ModulePageConfig = {
  key: 'material-categories',
  title: '商品类别',
  kicker: 'Master Data',
  description: '管理商品类别字典，支持按编码和名称增删改查。',
  primaryNoKey: 'categoryCode',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      placeholder: '类别编码 / 类别名称',
    },
    { ...masterStatusFilter },
  ],
  columns: [
    { title: '类别编码', dataIndex: 'categoryCode', width: 150 },
    { title: '类别名称', dataIndex: 'categoryName', width: 180 },
    { title: '排序', dataIndex: 'sortOrder', width: 80, align: 'right' },
    {
      title: '采购过磅',
      dataIndex: 'purchaseWeighRequired',
      width: 100,
      type: 'boolean',
    },
    { title: '状态', dataIndex: 'status', width: 90 },
    { title: '备注', dataIndex: 'remark', width: 200 },
  ],
  detailFields: [
    { label: '类别编码', key: 'categoryCode' },
    { label: '类别名称', key: 'categoryName' },
    { label: '排序', key: 'sortOrder' },
    { label: '采购过磅', key: 'purchaseWeighRequired' },
    { label: '状态', key: 'status' },
    { label: '备注', key: 'remark' },
  ],
  formFields: [
    {
      key: 'categoryCode',
      label: '类别编码',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'categoryName',
      label: '类别名称',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'sortOrder',
      label: '排序',
      type: 'number',
      required: true,
      min: 0,
      precision: 0,
      defaultValue: 0,
      row: 1,
    },
    {
      key: 'purchaseWeighRequired',
      label: '采购过磅',
      type: 'select',
      defaultValue: false,
      row: 2,
      colSpan: 4,
      options: [
        { label: '需要', value: true },
        { label: '不需要', value: false },
      ],
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: '正常',
      options: enabledStatusOptions,
      row: 2,
    },
    { key: 'remark', label: '备注', type: 'textarea', row: 3, fullRow: true },
  ],
  data: [],
  buildOverview: (rows) => [
    { label: '类别数', value: formatInteger(rows.length) },
    {
      label: '启用',
      value: formatInteger(rows.filter((row) => row.status === '正常').length),
    },
    {
      label: '采购过磅',
      value: formatInteger(
        rows.filter((row) => row.purchaseWeighRequired === true).length,
      ),
    },
  ],
}
