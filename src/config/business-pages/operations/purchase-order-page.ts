import i18next from 'i18next'
import {
  buildValueOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  ORDER_NO_FILTER_LABEL,
  SUPPLIER_NAME_LABEL,
} from '../shared/filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  compactPurchaseItemColumns,
  statusMap,
} from '../shared/shared'

export const purchaseOrdersPageConfig: ModulePageConfig = {
  key: 'purchase-order',
  title: i18next.t('modules.pages.purchaseOrder.title'),
  kicker: 'Purchase',
  description: i18next.t('modules.pages.purchaseOrder.description'),
  primaryNoKey: 'orderNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.purchaseOrder.placeholderOrderNo'),
    },
    {
      key: 'supplierId',
      label: SUPPLIER_NAME_LABEL,
      type: 'select',
      options: getSupplierOptions,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      type: 'select',
      options: getSettlementCompanyOptions,
      row: 2,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: buildValueOptions('草稿', '已审核', '完成采购'),
    },
    {
      key: 'orderDate',
      label: i18next.t('modules.pages.purchaseOrder.filterOrderDate'),
      type: 'dateRange',
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.purchaseOrder.colOrderNo'),
      dataIndex: 'orderNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colSupplier'),
      dataIndex: 'supplierName',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colBuyer'),
      dataIndex: 'buyerName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colOrderDate'),
      dataIndex: 'orderDate',
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
    {
      title: i18next.t('modules.columns.remark'),
      dataIndex: 'remark',
      width: 120,
    },
  ],
  defaultHiddenColumnKeys: ['buyerName', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.purchaseOrder.colSupplier'),
      key: 'supplierName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      key: 'settlementCompanyName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colOrderNo'),
      key: 'orderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colOrderDate'),
      key: 'orderDate',
      type: 'date',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colBuyer'),
      key: 'buyerName',
      row: 2,
    },
    {
      label: i18next.t('modules.columns.totalWeight'),
      key: 'totalWeight',
      type: 'weight',
      row: 2,
    },
    {
      label: i18next.t('modules.columns.totalAmount'),
      key: 'totalAmount',
      type: 'amount',
      row: 2,
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
      row: 2,
    },
    { label: i18next.t('modules.columns.remark'), key: 'remark', row: 3 },
  ],
  formFields: [
    {
      key: 'orderNo',
      label: i18next.t('modules.pages.purchaseOrder.colOrderNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'orderDate',
      label: i18next.t('modules.pages.purchaseOrder.colOrderDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'buyerName',
      label: i18next.t('modules.pages.purchaseOrder.colBuyer'),
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'supplierId',
      label: i18next.t('modules.pages.purchaseOrder.colSupplier'),
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 2,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      row: 2,
    },
    {
      key: 'totalWeight',
      label: i18next.t('modules.pages.purchaseOrder.formTotalWeight'),
      type: 'input',
      disabled: true,
      row: 2,
    },
    {
      key: 'totalAmount',
      label: i18next.t('modules.pages.purchaseOrder.formTotalAmount'),
      type: 'input',
      disabled: true,
      row: 2,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'input',
      row: 2,
      colSpan: 6,
    },
  ],
  itemColumns: compactPurchaseItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
