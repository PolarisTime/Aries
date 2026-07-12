import i18next from 'i18next'
import {
  getWarehouseOptions,
  materialCategoryOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { formatInteger, formatWeight, sumBy } from '../shared/shared'

export const inventoryReportPageConfig: ModulePageConfig = {
  key: 'inventory-report',
  title: i18next.t('modules.pages.inventoryReport.inventoryReport'),
  kicker: 'Reports',
  description: i18next.t('modules.pages.inventoryReport.inventoryReportDesc'),
  readOnly: true,
  detailActionLabel: i18next.t('modules.pages.inventoryReport.flow'),
  detailItemTitle: i18next.t('modules.pages.inventoryReport.flowDetail'),
  actions: [
    {
      key: 'export',
      label: i18next.t('modules.pages.inventoryReport.export'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.inventoryReport.keyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.inventoryReport.materialPlaceholder',
      ),
    },
    {
      key: 'warehouseId',
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
    {
      key: 'includeOutbound',
      label: i18next.t('modules.pages.inventoryReport.stockScope'),
      type: 'select',
      row: 2,
      options: [
        {
          label: i18next.t('modules.pages.inventoryReport.currentStockOnly'),
          value: 'false',
        },
        {
          label: i18next.t('modules.pages.inventoryReport.includeOutbound'),
          value: 'true',
        },
      ],
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.inventoryReport.materialCode'),
      dataIndex: 'materialCode',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.brand'),
      dataIndex: 'brand',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.material'),
      dataIndex: 'material',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.category'),
      dataIndex: 'category',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.spec'),
      dataIndex: 'spec',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.length'),
      dataIndex: 'length',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.onHandQuantity'),
      dataIndex: 'onHandQuantity',
      width: 112,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.reservedQuantity'),
      dataIndex: 'reservedQuantity',
      width: 112,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.availableQuantity'),
      dataIndex: 'availableQuantity',
      width: 112,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.qtyUnit'),
      dataIndex: 'quantityUnit',
      width: 90,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.onHandWeight'),
      dataIndex: 'onHandWeightTon',
      width: 132,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.reservedWeight'),
      dataIndex: 'reservedWeightTon',
      width: 132,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.availableWeight'),
      dataIndex: 'availableWeightTon',
      width: 132,
      align: 'right',
      type: 'weight',
    },
  ],
  defaultHiddenColumnKeys: ['brand', 'category', 'length', 'quantityUnit'],
  detailFields: [],
  detailItemColumns: [
    {
      title: i18next.t('modules.pages.inventoryReport.materialCode'),
      dataIndex: 'materialCode',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.brand'),
      dataIndex: 'brand',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.material'),
      dataIndex: 'material',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.category'),
      dataIndex: 'category',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.spec'),
      dataIndex: 'spec',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.length'),
      dataIndex: 'length',
      width: 90,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.warehouse'),
      dataIndex: 'warehouseName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.batchNo'),
      dataIndex: 'batchNo',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.outboundNo'),
      dataIndex: 'outboundNo',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.outboundDate'),
      dataIndex: 'outboundDate',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.quantity'),
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.qtyUnit'),
      dataIndex: 'quantityUnit',
      width: 90,
    },
    {
      title: i18next.t('modules.pages.inventoryReport.stockWeight'),
      dataIndex: 'weightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.pieceWeight'),
      dataIndex: 'pieceWeightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.inventoryReport.unit'),
      dataIndex: 'unit',
      width: 90,
    },
  ],
  data: [],
  buildOverview: (rows) => [
    {
      label: i18next.t('modules.pages.inventoryReport.stockRecordCount'),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t('modules.pages.inventoryReport.onHandWeight'),
      value: formatWeight(sumBy(rows, 'onHandWeightTon')),
    },
    {
      label: i18next.t('modules.pages.inventoryReport.reservedWeight'),
      value: formatWeight(sumBy(rows, 'reservedWeightTon')),
    },
    {
      label: i18next.t('modules.pages.inventoryReport.availableWeight'),
      value: formatWeight(sumBy(rows, 'availableWeightTon')),
    },
  ],
}
