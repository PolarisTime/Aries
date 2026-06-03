import i18next from 'i18next'
import type { ModulePageConfig } from '@/types/module-page'
import { formatInteger, formatWeight, sumBy } from './shared'

export const ioReportPageConfig: ModulePageConfig = {
  key: 'io-report',
  title: i18next.t('modules.pages.ioReport.ioReport'),
  kicker: 'Reports',
  description: i18next.t('modules.pages.ioReport.ioReportDesc'),
  readOnly: true,
  actions: [
    {
      key: 'export',
      label: i18next.t('modules.pages.ioReport.export'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.ioReport.sourceNo'),
      type: 'input',
      placeholder: i18next.t('modules.pages.ioReport.sourceNoPlaceholder'),
    },
    {
      key: 'businessType',
      label: i18next.t('modules.pages.ioReport.businessType'),
      type: 'select',
      options: [
        {
          label: i18next.t('modules.pages.ioReport.purchaseInbound'),
          value: '采购入库',
        },
        {
          label: i18next.t('modules.pages.ioReport.salesOutbound'),
          value: '销售出库',
        },
      ],
    },
    {
      key: 'businessDate',
      label: i18next.t('modules.pages.ioReport.businessDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.ioReport.businessDate'),
      dataIndex: 'businessDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.ioReport.businessType'),
      dataIndex: 'businessType',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.ioReport.sourceNo'),
      dataIndex: 'sourceNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.ioReport.materialCode'),
      dataIndex: 'materialCode',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.ioReport.spec'),
      dataIndex: 'spec',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.ioReport.warehouse'),
      dataIndex: 'warehouseName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.ioReport.batchNo'),
      dataIndex: 'batchNo',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.ioReport.inboundQty'),
      dataIndex: 'inQuantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.ioReport.outboundQty'),
      dataIndex: 'outQuantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.ioReport.qtyUnit'),
      dataIndex: 'quantityUnit',
      width: 90,
    },
    {
      title: i18next.t('modules.pages.ioReport.inboundWeight'),
      dataIndex: 'inWeightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.ioReport.outboundWeight'),
      dataIndex: 'outWeightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.ioReport.businessDate'),
      key: 'businessDate',
      type: 'date',
    },
    {
      label: i18next.t('modules.pages.ioReport.businessType'),
      key: 'businessType',
    },
    { label: i18next.t('modules.pages.ioReport.sourceNo'), key: 'sourceNo' },
    {
      label: i18next.t('modules.pages.ioReport.materialCode'),
      key: 'materialCode',
    },
    { label: i18next.t('modules.pages.ioReport.spec'), key: 'spec' },
    {
      label: i18next.t('modules.pages.ioReport.warehouse'),
      key: 'warehouseName',
    },
    { label: i18next.t('modules.pages.ioReport.batchNo'), key: 'batchNo' },
    {
      label: i18next.t('modules.pages.ioReport.inboundQty'),
      key: 'inQuantity',
      type: 'count',
    },
    {
      label: i18next.t('modules.pages.ioReport.outboundQty'),
      key: 'outQuantity',
      type: 'count',
    },
    { label: i18next.t('modules.pages.ioReport.qtyUnit'), key: 'quantityUnit' },
    {
      label: i18next.t('modules.pages.ioReport.inboundWeight'),
      key: 'inWeightTon',
      type: 'weight',
    },
    {
      label: i18next.t('modules.pages.ioReport.outboundWeight'),
      key: 'outWeightTon',
      type: 'weight',
    },
    { label: i18next.t('modules.pages.ioReport.remark'), key: 'remark' },
  ],
  data: [],
  buildOverview: (rows) => [
    {
      label: i18next.t('modules.pages.ioReport.transactionCount'),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t('modules.pages.ioReport.inboundWeight'),
      value: formatWeight(sumBy(rows, 'inWeightTon')),
    },
    {
      label: i18next.t('modules.pages.ioReport.outboundWeight'),
      value: formatWeight(sumBy(rows, 'outWeightTon')),
    },
  ],
}
