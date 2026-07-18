import i18next from 'i18next'
import { getCarrierEntityOptions } from '@/api/carrier-options'
import { getSupplierEntityOptions } from '@/api/supplier-options'
import { getSettlementCompanyOptions } from '@/constants/module-options'
import type { ModulePageConfig, ModuleRecordInput } from '@/types/module-page'
import { BILL_STATUS_LABEL } from '../shared/filter-labels'
import { buildFinanceOverview, statusMap } from '../shared/shared'

function getCounterpartyOptions(form?: ModuleRecordInput) {
  return form?.counterpartyType === '物流商'
    ? getCarrierEntityOptions()
    : getSupplierEntityOptions()
}

export const paymentsPageConfig: ModulePageConfig = {
  key: 'payment',
  title: i18next.t('modules.pages.payment.payment'),
  kicker: 'Finance',
  description: i18next.t('modules.pages.payment.paymentDesc'),
  primaryNoKey: 'paymentNo',
  actions: [
    {
      key: 'create_payment',
      label: i18next.t('modules.pages.payment.createPayment'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'businessType',
      label: i18next.t('modules.pages.payment.businessType'),
      type: 'select',
      options: [
        { label: i18next.t('modules.pages.payment.supplier'), value: '供应商' },
        { label: i18next.t('modules.pages.payment.carrier'), value: '物流商' },
      ],
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: [
        { label: i18next.t('modules.pages.payment.draft'), value: '草稿' },
        { label: '已审核', value: '已审核' },
      ],
    },
    {
      key: 'paymentDate',
      label: i18next.t('modules.pages.payment.paymentDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.payment.paymentNo'),
      dataIndex: 'paymentNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.payment.businessType'),
      dataIndex: 'counterpartyType',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.payment.counterpartyCode'),
      dataIndex: 'counterpartyCode',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.payment.counterparty'),
      dataIndex: 'counterpartyName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.payment.settlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.payment.paymentDate'),
      dataIndex: 'paymentDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.payment.payType'),
      dataIndex: 'payType',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.payment.amount'),
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.payment.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.payment.operator'),
      dataIndex: 'operatorName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.payment.remark'),
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
      label: i18next.t('modules.pages.payment.paymentNo'),
      key: 'paymentNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.businessType'),
      key: 'counterpartyType',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.counterparty'),
      key: 'counterpartyName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.counterpartyCode'),
      key: 'counterpartyCode',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.settlementCompany'),
      key: 'settlementCompanyName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.paymentDate'),
      key: 'paymentDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.payType'),
      key: 'payType',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.amount'),
      key: 'amount',
      type: 'amount',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.status'),
      key: 'status',
      type: 'status',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.operator'),
      key: 'operatorName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.payment.remark'),
      key: 'remark',
      row: 4,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'paymentNo',
      label: i18next.t('modules.pages.payment.paymentNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'counterpartyType',
      label: i18next.t('modules.pages.payment.businessType'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '供应商',
      options: [
        { label: i18next.t('modules.pages.payment.supplier'), value: '供应商' },
        { label: i18next.t('modules.pages.payment.carrier'), value: '物流商' },
      ],
      row: 1,
    },
    {
      key: 'counterpartyId',
      label: i18next.t('modules.pages.payment.counterparty'),
      type: 'select',
      required: true,
      options: getCounterpartyOptions,
      masterOptionRequirements: { suppliers: true, carriers: true },
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.payment.settlementCompany'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      masterOptionRequirements: { settlementCompanies: true },
      row: 1,
    },
    {
      key: 'paymentDate',
      label: i18next.t('modules.pages.payment.paymentDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'payType',
      label: i18next.t('modules.pages.payment.payType'),
      type: 'select',
      required: true,
      options: [
        {
          label: i18next.t('modules.pages.payment.bankTransfer'),
          value: '银行转账',
        },
        {
          label: i18next.t('modules.pages.payment.bankAcceptance'),
          value: '银行承兑',
        },
        { label: i18next.t('modules.pages.payment.cash'), value: '现金' },
      ],
      row: 2,
    },
    {
      key: 'amount',
      label: i18next.t('modules.pages.payment.amount'),
      type: 'number',
      required: true,
      min: 0.01,
      precision: 2,
      defaultValue: 0,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.payment.status'),
      type: 'select',
      disabled: true,
      defaultValue: '草稿',
      options: [
        { label: i18next.t('modules.pages.payment.draft'), value: '草稿' },
        { label: '已审核', value: '已审核' },
      ],
      row: 2,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.payment.operator'),
      type: 'input',
      required: true,
      row: 3,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.payment.remark'),
      type: 'textarea',
      row: 4,
      fullRow: true,
    },
  ],
  saveFields: {
    scalar: [
      'paymentNo',
      'counterpartyType',
      'counterpartyId',
      'paymentPurpose',
      'counterpartyCode',
      'counterpartyName',
      'settlementCompanyId',
      'settlementCompanyName',
      'paymentDate',
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
