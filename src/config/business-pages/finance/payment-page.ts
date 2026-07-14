import i18next from 'i18next'
import { getCarrierEntityOptions } from '@/api/carrier-options'
import { getSupplierEntityOptions } from '@/api/supplier-options'
import { getSettlementCompanyOptions } from '@/constants/module-options'
import type { ModulePageConfig, ModuleRecordInput } from '@/types/module-page'
import { asNumber } from '@/utils/type-narrowing'
import { BILL_STATUS_LABEL } from '../shared/filter-labels'
import { buildFinanceOverview, statusMap } from '../shared/shared'

const STATEMENT_SETTLEMENT = 'STATEMENT_SETTLEMENT'
const PURCHASE_PREPAYMENT = 'PURCHASE_PREPAYMENT'
const SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT'
const PAYMENT_PURPOSE_OPTIONS = [
  {
    label: i18next.t('modules.pages.payment.statementSettlement'),
    value: STATEMENT_SETTLEMENT,
  },
  {
    label: i18next.t('modules.pages.payment.purchasePrepayment'),
    value: PURCHASE_PREPAYMENT,
  },
  {
    label: '供应商总额付款',
    value: SUPPLIER_PAYMENT,
  },
]

function renderPaymentPurpose(value: unknown) {
  const normalizedValue = String(value ?? '').trim()
  return (
    PAYMENT_PURPOSE_OPTIONS.find((option) => option.value === normalizedValue)
      ?.label ||
    normalizedValue ||
    '--'
  )
}

function isPurchasePrepayment(form?: ModuleRecordInput) {
  return form?.paymentPurpose === PURCHASE_PREPAYMENT
}

function isStatementSettlement(form?: ModuleRecordInput) {
  return !form?.paymentPurpose || form.paymentPurpose === STATEMENT_SETTLEMENT
}

function isSupplierPayment(form?: ModuleRecordInput) {
  return form?.paymentPurpose === SUPPLIER_PAYMENT
}

function usesDirectCounterparty(form?: ModuleRecordInput) {
  return isStatementSettlement(form) || isSupplierPayment(form)
}

function locksCounterpartyType(form?: ModuleRecordInput) {
  return (
    isStatementSettlement(form) ||
    isPurchasePrepayment(form) ||
    isSupplierPayment(form)
  )
}

function isFreightStatementSettlement(form?: ModuleRecordInput) {
  return isStatementSettlement(form) && form?.counterpartyType === '物流商'
}

function getCounterpartyOptions(form?: ModuleRecordInput) {
  return isStatementSettlement(form)
    ? getCarrierEntityOptions()
    : getSupplierEntityOptions()
}

function resolvePurchasePrepaymentAmount(parentRecord: ModuleRecordInput) {
  const items = Array.isArray(parentRecord.items) ? parentRecord.items : []
  if (!items.length) {
    return asNumber(parentRecord.totalAmount)
  }

  const totalCents = items.reduce((sum, item) => {
    const lineAmount =
      asNumber(item.quantity) *
      asNumber(item.pieceWeightTon) *
      asNumber(item.unitPrice)
    return sum + Math.round((lineAmount + Number.EPSILON) * 100)
  }, 0)
  return totalCents / 100
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
      title: i18next.t('modules.pages.payment.paymentPurpose'),
      dataIndex: 'paymentPurpose',
      width: 150,
      render: renderPaymentPurpose,
    },
    {
      title: i18next.t('modules.pages.payment.counterpartyCode'),
      dataIndex: 'counterpartyCode',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.payment.counterparty'),
      dataIndex: 'counterpartyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.payment.purchaseOrderNo'),
      dataIndex: 'purchaseOrderNo',
      width: 170,
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
      width: 110,
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
    'payType',
    'purchaseOrderNo',
    'settlementCompanyName',
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
      label: i18next.t('modules.pages.payment.paymentPurpose'),
      key: 'paymentPurpose',
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
      label: i18next.t('modules.pages.payment.relatedStatement'),
      key: 'sourceFreightStatementId',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.purchaseOrderNo'),
      key: 'purchaseOrderNo',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.supplierCode'),
      key: 'supplierCode',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.supplierName'),
      key: 'supplierName',
      row: 2,
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
      options: [
        { label: i18next.t('modules.pages.payment.supplier'), value: '供应商' },
        { label: i18next.t('modules.pages.payment.carrier'), value: '物流商' },
      ],
      disabledWhen: locksCounterpartyType,
      defaultValue: '物流商',
      row: 1,
    },
    {
      key: 'paymentPurpose',
      label: i18next.t('modules.pages.payment.paymentPurpose'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: STATEMENT_SETTLEMENT,
      options: PAYMENT_PURPOSE_OPTIONS,
      row: 1,
    },
    {
      key: 'counterpartyId',
      label: i18next.t('modules.pages.payment.counterparty'),
      type: 'select',
      required: true,
      options: getCounterpartyOptions,
      masterOptionRequirements: {
        suppliers: true,
        carriers: true,
      },
      visibleWhen: usesDirectCounterparty,
      preserve: false,
      row: 1,
    },
    {
      key: 'counterpartyName',
      label: i18next.t('modules.pages.payment.counterparty'),
      type: 'input',
      required: true,
      disabled: true,
      visibleWhen: usesDirectCounterparty,
      preserve: false,
      row: 1,
    },
    {
      key: 'counterpartyCode',
      label: i18next.t('modules.pages.payment.counterpartyCode'),
      type: 'input',
      disabled: true,
      visibleWhen: usesDirectCounterparty,
      preserve: false,
      row: 1,
    },
    {
      key: 'sourceFreightStatementId',
      label: i18next.t('modules.pages.payment.relatedStatement'),
      type: 'select',
      required: true,
      visibleWhen: isFreightStatementSettlement,
      preserve: false,
      row: 1,
    },
    {
      key: 'sourcePurchaseOrderId',
      label: i18next.t('modules.pages.payment.sourcePurchaseOrderId'),
      type: 'input',
      required: true,
      disabled: true,
      visibleWhen: isPurchasePrepayment,
      preserve: false,
      row: 2,
    },
    {
      key: 'purchaseOrderNo',
      label: i18next.t('modules.pages.payment.purchaseOrderNo'),
      type: 'input',
      required: true,
      disabled: true,
      visibleWhen: isPurchasePrepayment,
      preserve: false,
      row: 2,
    },
    {
      key: 'supplierCode',
      label: i18next.t('modules.pages.payment.supplierCode'),
      type: 'input',
      disabled: true,
      visibleWhen: isPurchasePrepayment,
      preserve: false,
      row: 2,
    },
    {
      key: 'supplierName',
      label: i18next.t('modules.pages.payment.supplierName'),
      type: 'input',
      disabled: true,
      visibleWhen: isPurchasePrepayment,
      preserve: false,
      row: 2,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.payment.settlementCompanyId'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      masterOptionRequirements: { settlementCompanies: true },
      disabledWhen: isPurchasePrepayment,
      visibleWhen: (form) =>
        isPurchasePrepayment(form) || isSupplierPayment(form),
      preserve: false,
      row: 3,
    },
    {
      key: 'settlementCompanyName',
      label: i18next.t('modules.pages.payment.settlementCompany'),
      type: 'input',
      disabled: true,
      visibleWhen: (form) =>
        isPurchasePrepayment(form) || isSupplierPayment(form),
      preserve: false,
      row: 3,
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
  parentImport: {
    parentModuleKey: 'purchase-order',
    candidateQueryType: 'purchase-prepayment',
    label: i18next.t('modules.pages.payment.parentPurchaseOrder'),
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.payment.selectPurchaseOrder'),
    visibleWhen: isPurchasePrepayment,
    hiddenSelectorColumnKeys: ['buyerName'],
    buildParentFilters: (currentRecord) => ({
      supplierId: currentRecord.counterpartyId,
    }),
    mapParentToDraft: (parentRecord) => ({
      counterpartyType: '供应商',
      counterpartyId: parentRecord.supplierId,
      counterpartyCode: parentRecord.supplierCode || '',
      counterpartyName: parentRecord.supplierName || '',
      sourcePurchaseOrderId: parentRecord.id,
      purchaseOrderNo: parentRecord.orderNo || '',
      supplierCode: parentRecord.supplierCode || '',
      supplierName: parentRecord.supplierName || '',
      settlementCompanyId: parentRecord.settlementCompanyId,
      settlementCompanyName: parentRecord.settlementCompanyName || '',
      amount: resolvePurchasePrepaymentAmount(parentRecord),
    }),
  },
  saveFields: {
    scalar: [
      'paymentNo',
      'counterpartyType',
      'counterpartyId',
      'paymentPurpose',
      'counterpartyCode',
      'counterpartyName',
      'sourcePurchaseOrderId',
      'purchaseOrderNo',
      'supplierCode',
      'supplierName',
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
