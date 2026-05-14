import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview, statusMap } from './shared'
import { masterStatusFilter } from './shared-filters'

export const masterWarehousePageConfigs: Record<string, ModulePageConfig> = {
  warehouse: {
    key: 'warehouse',
    title: '仓库资料',
    kicker: 'Master Data',
    description:
      '仓库主数据统一维护仓库编码、仓库名称、仓库类型、联系人和启用状态，供采购入库、销售出库和物流单页面复用。',
    primaryNoKey: 'warehouseCode',
    actions: actionSet,
    filters: [
      {
        key: 'keyword',
        label: '关键字',
        type: 'input',
        placeholder: '仓库编码 / 名称 / 联系人',
      },
      {
        key: 'warehouseType',
        label: '仓库类型',
        type: 'select',
        options: [
          { label: '自有仓', value: '自有仓' },
          { label: '合作仓', value: '合作仓' },
          { label: '中转仓', value: '中转仓' },
          { label: '第三方仓', value: '第三方仓' },
        ],
      },
      { ...masterStatusFilter },
    ],
    columns: [
      { title: '仓库编码', dataIndex: 'warehouseCode', width: 140 },
      { title: '仓库名称', dataIndex: 'warehouseName', width: 160 },
      { title: '仓库类型', dataIndex: 'warehouseType', width: 110 },
      { title: '联系人', dataIndex: 'contactName', width: 110 },
      { title: '联系电话', dataIndex: 'contactPhone', width: 140 },
      { title: '仓库地址', dataIndex: 'address', width: 240 },
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
      { label: '仓库编码', key: 'warehouseCode' },
      { label: '仓库名称', key: 'warehouseName' },
      { label: '仓库类型', key: 'warehouseType' },
      { label: '联系人', key: 'contactName' },
      { label: '联系电话', key: 'contactPhone' },
      { label: '仓库地址', key: 'address' },
      { label: '状态', key: 'status', type: 'status' },
      { label: '备注', key: 'remark' },
    ],
    detailColumnCount: 4,
    formFields: [
      {
        key: 'warehouseCode',
        label: '仓库编码',
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'warehouseName',
        label: '仓库名称',
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'warehouseType',
        label: '仓库类型',
        type: 'select',
        required: true,
        row: 1,
        options: [
          { label: '自有仓', value: '自有仓' },
          { label: '合作仓', value: '合作仓' },
          { label: '中转仓', value: '中转仓' },
          { label: '第三方仓', value: '第三方仓' },
        ],
      },
      { key: 'contactName', label: '联系人', type: 'input', row: 1 },
      { key: 'contactPhone', label: '联系电话', type: 'input', row: 2 },
      {
        key: 'address',
        label: '仓库地址',
        type: 'input',
        row: 2,
        fullRow: true,
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        defaultValue: '正常',
        options: enabledStatusOptions,
        row: 3,
      },
      { key: 'remark', label: '备注', type: 'textarea', row: 4, fullRow: true },
    ],
    data: [],
    buildOverview: (rows) => buildMasterOverview(rows),
    statusMap,
    rowHighlightStatuses: ['禁用'],
  },
}
