import i18next from 'i18next'
import {
  buildValueOptions,
  getCustomerOptions,
  getCustomerProjectOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  CUSTOMER_NAME_LABEL,
  OUTBOUND_NO_FILTER_LABEL,
} from './filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  cloneLineItems,
  compactPurchaseItemColumns,
  statusMap,
} from './shared'

export const salesOutboundsPageConfig: ModulePageConfig = {
  key: 'sales-outbound',
  title: i18next.t('modules.pages.salesOutbound.title'),
  kicker: 'Sales',
  description: i18next.t('modules.pages.salesOutbound.description'),
  primaryNoKey: 'outboundNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: OUTBOUND_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.salesOutbound.placeholderOutboundNo'),
      clientSearchKeys: ['outboundNo'],
    },
    {
      key: 'productKeyword',
      label: i18next.t('modules.pages.salesOutbound.filterProductKeyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.salesOutbound.placeholderProductKeyword'),
      clientSearchLineItemKeys: [
        'materialCode',
        'materialName',
        'material',
        'spec',
      ],
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: buildValueOptions('草稿', '已审核'),
    },
    { key: 'outboundDate', label: i18next.t('modules.pages.salesOutbound.filterOutboundDate'), type: 'dateRange' },
    {
      key: 'customerName',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: getCustomerOptions,
      row: 2,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.salesOutbound.filterProjectName'),
      type: 'select',
      options: getCustomerProjectOptions,
      row: 2,
    },
  ],
  columns: [
    { title: i18next.t('modules.pages.salesOutbound.colOutboundNo'), dataIndex: 'outboundNo', width: 160 },
    { title: i18next.t('modules.pages.salesOutbound.colCustomerName'), dataIndex: 'customerName', width: 140 },
    { title: i18next.t('modules.pages.salesOutbound.colProjectName'), dataIndex: 'projectName', width: 180 },
    {
      title: i18next.t('modules.pages.salesOutbound.colOutboundDate'),
      dataIndex: 'outboundDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.columns.totalWeight'),
      dataIndex: 'totalWeight',
      width: 116,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.columns.totalAmount'),
      dataIndex: 'totalAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.columns.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    { title: i18next.t('modules.columns.remark'), dataIndex: 'remark', width: 180 },
  ],
  defaultHiddenColumnKeys: ['projectName', 'remark'],
  detailFields: [
    { label: i18next.t('modules.pages.salesOutbound.colOutboundNo'), key: 'outboundNo', row: 1 },
    { label: i18next.t('modules.pages.salesOutbound.colSalesOrderNo'), key: 'salesOrderNo', row: 1 },
    { label: i18next.t('modules.pages.salesOutbound.colCustomerName'), key: 'customerName', row: 1 },
    { label: i18next.t('modules.pages.salesOutbound.colProjectName'), key: 'projectName', row: 1 },
    { label: i18next.t('modules.pages.salesOutbound.colOutboundDate'), key: 'outboundDate', type: 'date', row: 2 },
    { label: i18next.t('modules.columns.totalWeight'), key: 'totalWeight', type: 'weight', row: 2 },
    { label: i18next.t('modules.columns.totalAmount'), key: 'totalAmount', type: 'amount', row: 2 },
    { label: i18next.t('modules.columns.status'), key: 'status', type: 'status', row: 2 },
    { label: i18next.t('modules.columns.remark'), key: 'remark', row: 3 },
  ],
  formFields: [
    {
      key: 'outboundNo',
      label: i18next.t('modules.pages.salesOutbound.colOutboundNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'salesOrderNo',
      label: i18next.t('modules.pages.salesOutbound.colSalesOrderNo'),
      type: 'input',
      disabled: true,
      placeholder: i18next.t('modules.pages.salesOutbound.placeholderParentImport'),
      row: 1,
    },
    {
      key: 'customerName',
      label: i18next.t('modules.pages.salesOutbound.colCustomerName'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      row: 1,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.salesOutbound.colProjectName'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'outboundDate',
      label: i18next.t('modules.pages.salesOutbound.colOutboundDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    { key: 'remark', label: i18next.t('modules.columns.remark'), type: 'input', row: 2 },
  ],
  parentImport: {
    parentModuleKey: 'sales-order',
    label: i18next.t('modules.pages.salesOutbound.parentImportLabel'),
    parentFieldKey: 'salesOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.salesOutbound.parentImportButton'),
    enforceUniqueRelation: true,
    mapParentToDraft: (parentRecord) => ({
      customerName: parentRecord.customerName || '',
      projectName: parentRecord.projectName || '',
    }),
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items)
          ? parentRecord.items.map((item) => ({
              ...item,
              sourceNo: parentRecord.orderNo || '',
              sourceSalesOrderItemId: item.id,
            }))
          : [],
        'sales-outbound-item',
      ),
  },
  itemColumns: compactPurchaseItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
