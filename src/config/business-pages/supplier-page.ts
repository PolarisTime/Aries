import type { ModulePageConfig } from '@/types/module-page'
import { masterStatusFilter } from './shared-filters'
import { actionSet, buildMasterOverview, statusMap } from './shared'

export const suppliersPageConfig: ModulePageConfig = {
  key: 'supplier',
  title: '供应商资料',
  kicker: 'Master Data',
  description:
    '供应商主数据统一维护基础档案、联系人和合作状态，供采购与对账页面复用。',
  primaryNoKey: 'supplierCode',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      placeholder: '供应商编码 / 名称 / 联系人',
    },
    { ...masterStatusFilter },
  ],
  columns: [
    { title: '供应商编码', dataIndex: 'supplierCode', width: 140 },
    { title: '供应商名称', dataIndex: 'supplierName', width: 180 },
    { title: '联系人', dataIndex: 'contactName', width: 110 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 140 },
    { title: '所在城市', dataIndex: 'city', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    { title: '备注', dataIndex: 'remark', width: 180 },
  ],
  detailFields: [
    { label: '供应商编码', key: 'supplierCode' },
    { label: '供应商名称', key: 'supplierName' },
    { label: '联系人', key: 'contactName' },
    { label: '联系电话', key: 'contactPhone' },
    { label: '所在城市', key: 'city' },
    { label: '状态', key: 'status', type: 'status' },
    { label: '备注', key: 'remark' },
  ],
  detailColumnCount: 4,
  formFields: [
    {
      key: 'supplierCode',
      label: '供应商编码',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'supplierName',
      label: '供应商名称',
      type: 'input',
      required: true,
      row: 1,
    },
    { key: 'contactName', label: '联系人', type: 'input', row: 1 },
    { key: 'contactPhone', label: '联系电话', type: 'input', row: 1 },
    { key: 'city', label: '所在城市', type: 'input', row: 2 },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '正常',
      options: enabledStatusOptions,
      row: 2,
    },
    { key: 'remark', label: '备注', type: 'textarea', row: 3, fullRow: true },
  ],
  data: [],
  buildOverview: (rows) => buildMasterOverview(rows),
  statusMap,
  rowHighlightStatuses: ['禁用'],
}
