import i18next from 'i18next'
import { customerOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { BILL_STATUS_LABEL, CUSTOMER_NAME_LABEL } from '../shared/filter-labels'
import { buildFinanceOverview, statusMap } from '../shared/shared'

export const receiptsPageConfig: ModulePageConfig = {
  key: 'receipt',
  title: i18next.t('modules.pages.receipt.receipt'),
  kicker: 'Finance',
  description: i18next.t('modules.pages.receipt.receiptDesc'),
  primaryNoKey: 'receiptNo',
  actions: [
    {
      key: 'create_receipt',
      label: i18next.t('modules.pages.receipt.createReceipt'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'customerName',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: customerOptions,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: [
        { label: i18next.t('modules.pages.receipt.draft'), value: '草稿' },
        { label: i18next.t('modules.pages.receipt.received'), value: '已收款' },
      ],
    },
    {
      key: 'receiptDate',
      label: i18next.t('modules.pages.receipt.receiptDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.receipt.receiptNo'),
      dataIndex: 'receiptNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.receipt.customerCode'),
      dataIndex: 'customerCode',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.receipt.customer'),
      dataIndex: 'customerName',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.receipt.project'),
      dataIndex: 'projectName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.receipt.receiptDate'),
      dataIndex: 'receiptDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.receipt.receiptMethod'),
      dataIndex: 'payType',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.receipt.amount'),
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.receipt.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
  ],
  defaultHiddenColumnKeys: ['projectName', 'payType'],
  detailFields: [
    {
      label: i18next.t('modules.pages.receipt.receiptNo'),
      key: 'receiptNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.receipt.customer'),
      key: 'customerName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.receipt.customerCode'),
      key: 'customerCode',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.receipt.project'),
      key: 'projectName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.receipt.relatedStatement'),
      key: 'sourceStatementId',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.receipt.receiptDate'),
      key: 'receiptDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.receipt.receiptMethod'),
      key: 'payType',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.receipt.amount'),
      key: 'amount',
      type: 'amount',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.receipt.status'),
      key: 'status',
      type: 'status',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.receipt.operator'),
      key: 'operatorName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.receipt.remark'),
      key: 'remark',
      row: 4,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'receiptNo',
      label: i18next.t('modules.pages.receipt.receiptNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'customerName',
      label: i18next.t('modules.pages.receipt.customer'),
      type: 'select',
      required: true,
      options: customerOptions,
      row: 1,
    },
    {
      key: 'customerCode',
      label: i18next.t('modules.pages.receipt.customerCode'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.receipt.project'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'sourceStatementId',
      label: i18next.t('modules.pages.receipt.relatedStatement'),
      type: 'select',
      required: true,
      row: 1,
    },
    {
      key: 'receiptDate',
      label: i18next.t('modules.pages.receipt.receiptDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'payType',
      label: i18next.t('modules.pages.receipt.receiptMethod'),
      type: 'select',
      required: true,
      options: [
        {
          label: i18next.t('modules.pages.receipt.bankTransfer'),
          value: '银行转账',
        },
        {
          label: i18next.t('modules.pages.receipt.bankAcceptance'),
          value: '银行承兑',
        },
        {
          label: i18next.t('modules.pages.receipt.acceptanceBill'),
          value: '承兑汇票',
        },
        { label: i18next.t('modules.pages.receipt.cash'), value: '现金' },
      ],
      row: 2,
    },
    {
      key: 'amount',
      label: i18next.t('modules.pages.receipt.amount'),
      type: 'number',
      required: true,
      min: 0,
      precision: 2,
      defaultValue: 0,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.receipt.status'),
      type: 'select',
      defaultValue: '草稿',
      options: [
        { label: i18next.t('modules.pages.receipt.draft'), value: '草稿' },
        { label: i18next.t('modules.pages.receipt.received'), value: '已收款' },
      ],
      row: 2,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.receipt.operator'),
      type: 'input',
      required: true,
      row: 3,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.receipt.remark'),
      type: 'textarea',
      row: 4,
      fullRow: true,
    },
  ],
  saveFields: {
    scalar: [
      'receiptNo',
      'customerCode',
      'customerName',
      'projectName',
      'sourceStatementId',
      'receiptDate',
      'payType',
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
