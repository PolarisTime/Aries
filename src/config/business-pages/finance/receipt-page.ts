import i18next from 'i18next'
import { getSupplierEntityOptions } from '@/api/supplier-options'
import {
  getCustomerOptions,
  getSettlementCompanyOptions,
  withDeletedDocumentStatus,
} from '@/constants/module-options'
import type { ModulePageConfig, ModuleRecordInput } from '@/types/module-page'
import { BILL_STATUS_LABEL } from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import { buildFinanceOverview, statusMap } from '../shared/shared'

function getCounterpartyOptions(form?: ModuleRecordInput) {
  return form?.counterpartyType === '供应商'
    ? getSupplierEntityOptions()
    : getCustomerOptions()
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
    { key: 'keyword', label: '单号/往来方', type: 'input' },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: withDeletedDocumentStatus([
        { label: i18next.t('modules.pages.receipt.draft'), value: '草稿' },
        { label: '已审核', value: '已审核' },
      ]),
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
    { title: '往来类型', dataIndex: 'counterpartyType', width: 100 },
    { title: '往来方编码', dataIndex: 'counterpartyCode', width: 130 },
    { title: '往来方', dataIndex: 'counterpartyName', width: 180 },
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
      width: 120,
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
  defaultHiddenColumnKeys: [
    'counterpartyCode',
    'payType',
    'operatorName',
    'remark',
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.receipt.receiptNo'),
      key: 'receiptNo',
      row: 1,
    },
    { label: '往来类型', key: 'counterpartyType', row: 1 },
    { label: '往来方', key: 'counterpartyName', row: 1 },
    { label: '往来方编码', key: 'counterpartyCode', row: 1 },
    { label: SETTLEMENT_COMPANY_LABEL, key: 'settlementCompanyName', row: 2 },
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
      key: 'counterpartyType',
      label: '往来类型',
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '客户',
      options: [
        { label: '客户', value: '客户' },
        { label: '供应商', value: '供应商' },
      ],
      row: 1,
    },
    {
      key: 'counterpartyId',
      label: '往来方',
      type: 'select',
      required: true,
      options: getCounterpartyOptions,
      masterOptionRequirements: { customers: true, suppliers: true },
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      masterOptionRequirements: { settlementCompanies: true },
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
      min: 0.01,
      precision: 2,
      defaultValue: 0,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.receipt.status'),
      type: 'select',
      disabled: true,
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
