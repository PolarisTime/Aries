import i18next from 'i18next'
import {
  getSettlementCompanyOptions,
  getSupplierOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { BILL_STATUS_LABEL, SUPPLIER_NAME_LABEL } from '../shared/filter-labels'
import { buildFinanceOverview, statusMap } from '../shared/shared'

const receiptMethodOptions = [
  {
    label: i18next.t('modules.pages.supplierRefundReceipt.bankTransfer'),
    value: '银行转账',
  },
  {
    label: i18next.t('modules.pages.supplierRefundReceipt.bankAcceptance'),
    value: '银行承兑',
  },
  {
    label: i18next.t('modules.pages.supplierRefundReceipt.cash'),
    value: '现金',
  },
]

const receiptStatusOptions = [
  {
    label: i18next.t('modules.pages.supplierRefundReceipt.draft'),
    value: '草稿',
  },
  {
    label: i18next.t('modules.pages.supplierRefundReceipt.received'),
    value: '已收款',
  },
]

export const supplierRefundReceiptsPageConfig: ModulePageConfig = {
  key: 'supplier-refund-receipt',
  title: i18next.t('modules.pages.supplierRefundReceipt.title'),
  kicker: 'Finance',
  description: i18next.t('modules.pages.supplierRefundReceipt.description'),
  primaryNoKey: 'refundReceiptNo',
  actions: [
    {
      key: 'create_supplier_refund_receipt',
      label: i18next.t('modules.pages.supplierRefundReceipt.create'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.supplierRefundReceipt.refundReceiptNo'),
      type: 'input',
    },
    {
      key: 'supplierId',
      label: SUPPLIER_NAME_LABEL,
      type: 'select',
      options: getSupplierOptions,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.supplierRefundReceipt.settlementCompany'),
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: receiptStatusOptions,
    },
    {
      key: 'receiptDate',
      label: i18next.t('modules.pages.supplierRefundReceipt.receiptDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.refundReceiptNo'),
      dataIndex: 'refundReceiptNo',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.purchaseRefundId'),
      dataIndex: 'purchaseRefundId',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.supplierCode'),
      dataIndex: 'supplierCode',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.supplierName'),
      dataIndex: 'supplierName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.settlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.receiptDate'),
      dataIndex: 'receiptDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.receiptMethod'),
      dataIndex: 'receiptMethod',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.amount'),
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.supplierRefundReceipt.status'),
      dataIndex: 'status',
      width: 110,
      align: 'center',
      type: 'status',
    },
  ],
  defaultHiddenColumnKeys: ['supplierCode', 'purchaseRefundId'],
  detailFields: [
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.refundReceiptNo'),
      key: 'refundReceiptNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.purchaseRefundId'),
      key: 'purchaseRefundId',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.supplierCode'),
      key: 'supplierCode',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.supplierName'),
      key: 'supplierName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.settlementCompany'),
      key: 'settlementCompanyName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.receiptDate'),
      key: 'receiptDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.receiptMethod'),
      key: 'receiptMethod',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.amount'),
      key: 'amount',
      type: 'amount',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.status'),
      key: 'status',
      type: 'status',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.operator'),
      key: 'operatorName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.supplierRefundReceipt.remark'),
      key: 'remark',
      row: 4,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'refundReceiptNo',
      label: i18next.t('modules.pages.supplierRefundReceipt.refundReceiptNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'purchaseRefundId',
      label: i18next.t('modules.pages.supplierRefundReceipt.purchaseRefundId'),
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'supplierCode',
      label: i18next.t('modules.pages.supplierRefundReceipt.supplierCode'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'supplierName',
      label: i18next.t('modules.pages.supplierRefundReceipt.supplierName'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'settlementCompanyName',
      label: i18next.t('modules.pages.supplierRefundReceipt.settlementCompany'),
      type: 'input',
      disabled: true,
      row: 2,
    },
    {
      key: 'receiptDate',
      label: i18next.t('modules.pages.supplierRefundReceipt.receiptDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'receiptMethod',
      label: i18next.t('modules.pages.supplierRefundReceipt.receiptMethod'),
      type: 'select',
      required: true,
      options: receiptMethodOptions,
      row: 2,
    },
    {
      key: 'amount',
      label: i18next.t('modules.pages.supplierRefundReceipt.amount'),
      type: 'number',
      required: true,
      min: 0.01,
      precision: 2,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.supplierRefundReceipt.status'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '草稿',
      options: receiptStatusOptions,
      row: 3,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.supplierRefundReceipt.operator'),
      type: 'input',
      required: true,
      row: 3,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.supplierRefundReceipt.remark'),
      type: 'textarea',
      fullRow: true,
      row: 4,
    },
  ],
  parentImport: {
    parentModuleKey: 'purchase-refund',
    label: i18next.t(
      'modules.pages.supplierRefundReceipt.parentPurchaseRefund',
    ),
    parentFieldKey: 'purchaseRefundId',
    parentDisplayFieldKey: 'refundNo',
    buttonText: i18next.t(
      'modules.pages.supplierRefundReceipt.selectPurchaseRefund',
    ),
    buildParentFilters: () => ({ status: '已审核' }),
    mapParentToDraft: (parentRecord) => ({
      purchaseRefundId: parentRecord.id,
      supplierId: parentRecord.supplierId,
      supplierCode: parentRecord.supplierCode || '',
      supplierName: parentRecord.supplierName || '',
      settlementCompanyId: parentRecord.settlementCompanyId,
      settlementCompanyName: parentRecord.settlementCompanyName || '',
    }),
  },
  saveFields: {
    scalar: [
      'refundReceiptNo',
      'purchaseRefundId',
      'supplierId',
      'receiptDate',
      'receiptMethod',
      'amount',
      'status',
      'operatorName',
      'remark',
    ],
  },
  data: [],
  buildOverview: (rows) => buildFinanceOverview(rows, 'amount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
