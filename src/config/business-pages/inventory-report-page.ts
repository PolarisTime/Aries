import {
  getWarehouseOptions,
  materialCategoryOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { formatInteger, formatWeight, sumBy } from './shared'
import i18next from 'i18next'

export const inventoryReportPageConfig: ModulePageConfig = {
  key: 'inventory-report',
  title: i18next.t('modules.pages.inventoryReport.inventoryReport'),
  kicker: 'Reports',
  description:
    i18next.t('modules.pages.inventoryReport.inventoryReportDesc'),
  readOnly: true,
  actions: [{ key: 'export', label: i18next.t('modules.pages.inventoryReport.export'), type: 'primary' }],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.inventoryReport.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.inventoryReport.materialPlaceholder'),
    },
    {
      key: 'warehouseName',
      label: i18next.t('modules.pages.inventoryReport.warehouse'),
      type: 'select',
      options: getWarehouseOptions,
    },
    {
      key: 'category',
      label: i18next.t('modules.pages.inventoryReport.category'),
      type: 'select',
      options: materialCategoryOptions,
    },
  ],
  columns: [
    { title: i18next.t('modules.pages.inventoryReport.materialCode'), dataIndex: 'materialCode', width: 150 },
    { title: i18next.t('modules.pages.inventoryReport.brand'), dataIndex: 'brand', width: 120 },
    { title: i18next.t('modules.pages.inventoryReport.material'), dataIndex: 'material', width: 120 },
    { title: i18next.t('modules.pages.inventoryReport.category'), dataIndex: 'category', width: 110 },
    { title: i18next.t('modules.pages.inventoryReport.spec'), dataIndex: 'spec', width: 100 },
    { title: i18next.t('modules.pages.inventoryReport.length'), dataIndex: 'length', width: 100 },
    { title: i18next.t('modules.pages.inventoryReport.warehouse'), dataIndex: 'warehouseName', width: 110 },
    { title: i18next.t('modules.pages.inventoryReport.batchNo'), dataIndex: 'batchNo', width: 140 },
    {
      title: i18next.t('modules.pages.inventoryReport.quantity'),
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    { title: i18next.t('modules.pages.inventoryReport.qtyUnit'), dataIndex: 'quantityUnit', width: 90 },
    {
      title: i18next.t('modules.pages.inventoryReport.stockWeight'),
      dataIndex: 'weightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
  ],
  detailFields: [
    { label: i18next.t('modules.pages.inventoryReport.materialCode'), key: 'materialCode' },
    { label: i18next.t('modules.pages.inventoryReport.brand'), key: 'brand' },
    { label: i18next.t('modules.pages.inventoryReport.material'), key: 'material' },
    { label: i18next.t('modules.pages.inventoryReport.category'), key: 'category' },
    { label: i18next.t('modules.pages.inventoryReport.spec'), key: 'spec' },
    { label: i18next.t('modules.pages.inventoryReport.length'), key: 'length' },
    { label: i18next.t('modules.pages.inventoryReport.warehouse'), key: 'warehouseName' },
    { label: i18next.t('modules.pages.inventoryReport.batchNo'), key: 'batchNo' },
    { label: i18next.t('modules.pages.inventoryReport.quantity'), key: 'quantity', type: 'count' },
    { label: i18next.t('modules.pages.inventoryReport.qtyUnit'), key: 'quantityUnit' },
    { label: i18next.t('modules.pages.inventoryReport.stockWeight'), key: 'weightTon', type: 'weight' },
    { label: i18next.t('modules.pages.inventoryReport.pieceWeight'), key: 'pieceWeightTon', type: 'weight' },
    { label: i18next.t('modules.pages.inventoryReport.unit'), key: 'unit' },
  ],
  data: [],
  buildOverview: (rows) => [
    { label: i18next.t('modules.pages.inventoryReport.stockRecordCount'), value: formatInteger(rows.length) },
    {
      label: i18next.t('modules.pages.inventoryReport.stockWeight'),
      value: formatWeight(sumBy(rows, 'weightTon')),
    },
  ],
}
