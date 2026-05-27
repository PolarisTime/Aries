import type { ModulePageConfig } from '@/types/module-page'
import { formatAmount, formatInteger, statusMap, sumBy } from './shared'
import i18next from 'i18next'

export const projectArPageConfigs: Record<string, ModulePageConfig> = {
  'project-ar': {
    key: 'project-ar',
    title: i18next.t('modules.pages.projectAr.projectReceivable'),
    kicker: 'Finance',
    description: i18next.t('modules.pages.projectAr.projectArDesc'),
    readOnly: true,
    actions: [{ key: 'export_project_ar', label: i18next.t('modules.pages.projectAr.export'), type: 'primary' }],
    filters: [
      {
        key: 'keyword',
        label: i18next.t('modules.pages.projectAr.search'),
        type: 'input',
        placeholder: i18next.t('modules.pages.projectAr.projectArPlaceholder'),
      },
    ],
    columns: [
      { title: i18next.t('modules.pages.projectAr.customerCode'), dataIndex: 'customerCode', width: 120 },
      { title: i18next.t('modules.pages.projectAr.customerName'), dataIndex: 'customerName', width: 140 },
      { title: i18next.t('modules.pages.projectAr.projectName'), dataIndex: 'projectName', width: 180 },
      { title: i18next.t('modules.pages.projectAr.projectAbbr'), dataIndex: 'projectNameAbbr', width: 120 },
      { title: i18next.t('modules.pages.projectAr.projectManager'), dataIndex: 'projectManager', width: 110 },
      {
        title: i18next.t('modules.pages.projectAr.completedSales'),
        dataIndex: 'completedSalesAmount',
        width: 140,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.projectAr.receivedAmount'),
        dataIndex: 'receivedAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.projectAr.unreceivedAmount'),
        dataIndex: 'unreceivedAmount',
        width: 120,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.projectAr.prepaymentBalance'),
        dataIndex: 'prepaymentBalance',
        width: 130,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.projectAr.netUnreceived'),
        dataIndex: 'netUnreceivedAmount',
        width: 130,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.projectAr.unreconciledDocCount'),
        dataIndex: 'unreconciledDocumentCount',
        width: 120,
        align: 'right',
        type: 'count',
      },
      {
        title: i18next.t('modules.pages.projectAr.reconciledDocCount'),
        dataIndex: 'reconciledDocumentCount',
        width: 120,
        align: 'right',
        type: 'count',
      },
      {
        title: i18next.t('modules.pages.projectAr.latestBusinessDate'),
        dataIndex: 'latestBusinessDate',
        width: 130,
        type: 'date',
      },
    ],
    detailFields: [
      { label: i18next.t('modules.pages.projectAr.customerCode'), key: 'customerCode' },
      { label: i18next.t('modules.pages.projectAr.customerName'), key: 'customerName' },
      { label: i18next.t('modules.pages.projectAr.projectName'), key: 'projectName' },
      { label: i18next.t('modules.pages.projectAr.projectAbbr'), key: 'projectNameAbbr' },
      { label: i18next.t('modules.pages.projectAr.projectManager'), key: 'projectManager' },
      { label: i18next.t('modules.pages.projectAr.completedSales'), key: 'completedSalesAmount', type: 'amount' },
      { label: i18next.t('modules.pages.projectAr.receivedAmount'), key: 'receivedAmount', type: 'amount' },
      { label: i18next.t('modules.pages.projectAr.unreceivedAmount'), key: 'unreceivedAmount', type: 'amount' },
      { label: i18next.t('modules.pages.projectAr.prepaymentBalance'), key: 'prepaymentBalance', type: 'amount' },
      { label: i18next.t('modules.pages.projectAr.netUnreceived'), key: 'netUnreceivedAmount', type: 'amount' },
      {
        label: i18next.t('modules.pages.projectAr.unreconciledDocCount'),
        key: 'unreconciledDocumentCount',
        type: 'count',
      },
      { label: i18next.t('modules.pages.projectAr.reconciledDocCount'), key: 'reconciledDocumentCount', type: 'count' },
      { label: i18next.t('modules.pages.projectAr.latestBusinessDate'), key: 'latestBusinessDate', type: 'date' },
    ],
    data: [],
    buildOverview: (rows) => [
      { label: i18next.t('modules.pages.projectAr.projectCount'), value: formatInteger(rows.length) },
      {
        label: i18next.t('modules.pages.projectAr.totalCompletedSales'),
        value: formatAmount(sumBy(rows, 'completedSalesAmount')),
      },
      {
        label: i18next.t('modules.pages.projectAr.totalNetUnreceived'),
        value: formatAmount(sumBy(rows, 'netUnreceivedAmount')),
      },
    ],
    statusMap,
  },
}
