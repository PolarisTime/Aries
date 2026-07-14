import i18next from 'i18next'
import { getSupplierEntityOptions } from '@/api/supplier-options'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
  getSettlementCompanyOptions,
} from '@/constants/module-options'
import type { ModulePageConfig, ModuleRecordInput } from '@/types/module-page'
import { BILL_STATUS_LABEL } from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import { buildFinanceOverview, statusMap } from '../shared/shared'

const CUSTOMER_STATEMENT_SETTLEMENT = 'CUSTOMER_STATEMENT_SETTLEMENT'
const SUPPLIER_PREPAYMENT_REFUND = 'SUPPLIER_PREPAYMENT_REFUND'
const SUPPLIER_OTHER_RECEIPT = 'SUPPLIER_OTHER_RECEIPT'

const RECEIPT_PURPOSE_OPTIONS = [
  { label: '客户结算收款', value: CUSTOMER_STATEMENT_SETTLEMENT },
  { label: '供应商预付款退款', value: SUPPLIER_PREPAYMENT_REFUND },
  { label: '供应商其他收款', value: SUPPLIER_OTHER_RECEIPT },
]

function isSupplierReceipt(form?: ModuleRecordInput) {
  return (
    form?.receiptPurpose === SUPPLIER_PREPAYMENT_REFUND ||
    form?.receiptPurpose === SUPPLIER_OTHER_RECEIPT
  )
}

function isCustomerReceipt(form?: ModuleRecordInput) {
  return !isSupplierReceipt(form)
}

function renderReceiptPurpose(value: unknown) {
  const purpose = String(value ?? '').trim()
  return (
    RECEIPT_PURPOSE_OPTIONS.find((option) => option.value === purpose)?.label ||
    purpose ||
    '--'
  )
}

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
      key: 'keyword',
      label: '单号/往来单位',
      type: 'input',
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: [
        { label: i18next.t('modules.pages.receipt.draft'), value: '草稿' },
        { label: '已审核', value: '已审核' },
      ],
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
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
      title: '往来类型',
      dataIndex: 'counterpartyType',
      width: 100,
    },
    {
      title: '收款用途',
      dataIndex: 'receiptPurpose',
      width: 160,
      render: renderReceiptPurpose,
    },
    {
      title: '往来单位编码',
      dataIndex: 'counterpartyCode',
      width: 130,
    },
    {
      title: '往来单位',
      dataIndex: 'counterpartyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.receipt.project'),
      dataIndex: 'projectName',
      width: 180,
    },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
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
    {
      title: i18next.t('modules.pages.receipt.operator'),
      dataIndex: 'operatorName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.receipt.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: ['projectName', 'payType', 'operatorName', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.receipt.receiptNo'),
      key: 'receiptNo',
      row: 1,
    },
    {
      label: '往来类型',
      key: 'counterpartyType',
      row: 1,
    },
    {
      label: '收款用途',
      key: 'receiptPurpose',
      row: 1,
    },
    {
      label: '往来单位',
      key: 'counterpartyName',
      row: 1,
    },
    {
      label: '往来单位编码',
      key: 'counterpartyCode',
      row: 1,
    },
    {
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
      row: 2,
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
      key: 'receiptPurpose',
      label: '收款用途',
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: CUSTOMER_STATEMENT_SETTLEMENT,
      options: RECEIPT_PURPOSE_OPTIONS,
      row: 1,
    },
    {
      key: 'counterpartyType',
      label: '往来类型',
      type: 'select',
      required: true,
      disabled: true,
      defaultValue: '客户',
      options: [
        { label: '客户', value: '客户' },
        { label: '供应商', value: '供应商' },
      ],
      row: 1,
    },
    {
      key: 'counterpartyId',
      label: '供应商',
      type: 'select',
      required: true,
      options: getSupplierEntityOptions,
      masterOptionRequirements: { suppliers: true },
      visibleWhen: isSupplierReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'counterpartyCode',
      label: '供应商编码',
      type: 'input',
      disabled: true,
      visibleWhen: isSupplierReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'counterpartyName',
      label: '供应商名称',
      type: 'input',
      required: true,
      disabled: true,
      visibleWhen: isSupplierReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'customerId',
      label: i18next.t('modules.pages.receipt.customer'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      visibleWhen: isCustomerReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'customerCode',
      label: i18next.t('modules.pages.receipt.customerCode'),
      type: 'input',
      disabled: true,
      visibleWhen: isCustomerReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'customerName',
      label: i18next.t('modules.pages.receipt.customer'),
      type: 'input',
      required: true,
      disabled: true,
      visibleWhen: isCustomerReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.receipt.project'),
      type: 'select',
      required: true,
      options: getCustomerProjectOptions,
      visibleWhen: isCustomerReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.receipt.project'),
      type: 'input',
      required: true,
      disabled: true,
      visibleWhen: isCustomerReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'sourceCustomerStatementId',
      label: i18next.t('modules.pages.receipt.relatedStatement'),
      type: 'select',
      required: false,
      visibleWhen: isCustomerReceipt,
      preserve: false,
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      masterOptionRequirements: { settlementCompanies: true },
      row: 2,
    },
    {
      key: 'settlementCompanyName',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'input',
      required: true,
      disabled: true,
      row: 2,
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
      min: 0.01,
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
        { label: '已审核', value: '已审核' },
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
      'counterpartyType',
      'counterpartyId',
      'counterpartyCode',
      'counterpartyName',
      'receiptPurpose',
      'customerId',
      'customerCode',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'settlementCompanyName',
      'sourceCustomerStatementId',
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
