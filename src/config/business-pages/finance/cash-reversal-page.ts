import { getSettlementCompanyOptions } from '@/constants/module-options'
import type {
  ModulePageConfig,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asNumber, asString } from '@/utils/type-narrowing'
import { BILL_STATUS_LABEL } from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import { buildFinanceOverview, statusMap } from '../shared/shared'

const PAYMENT_SOURCE = '付款单'
const RECEIPT_SOURCE = '收款单'

function isPaymentSource(record?: ModuleRecordInput) {
  return record?.sourceType !== RECEIPT_SOURCE
}

function resolveSourceType(parentRecord: ModuleRecord) {
  return asString(parentRecord.paymentNo).trim()
    ? PAYMENT_SOURCE
    : RECEIPT_SOURCE
}

function resolveSourceDocumentNo(parentRecord: ModuleRecord) {
  return (
    asString(parentRecord.paymentNo).trim() ||
    asString(parentRecord.receiptNo).trim()
  )
}

function validateSourceRecord(
  currentRecord: ModuleRecord,
  parentRecord: ModuleRecord,
) {
  const expectedSourceType = isPaymentSource(currentRecord)
    ? PAYMENT_SOURCE
    : RECEIPT_SOURCE
  if (resolveSourceType(parentRecord) !== expectedSourceType) {
    return '来源类型已变化，请关闭选择窗口后重新选择原资金单据'
  }
  if (asString(parentRecord.status).trim() !== '已审核') {
    return '只能选择已审核的资金单据'
  }
  const counterpartyType = asString(
    parentRecord.counterpartyType || parentRecord.businessType,
  ).trim()
  if (
    counterpartyType !== '供应商' ||
    !parentRecord.counterpartyId ||
    !parentRecord.settlementCompanyId
  ) {
    return '只能选择供应商及结算主体信息完整的资金单据'
  }
  return null
}

function mapSourceToDraft(parentRecord: ModuleRecord) {
  const sourceType = resolveSourceType(parentRecord)
  return {
    sourceType,
    sourceDocumentNo: resolveSourceDocumentNo(parentRecord),
    originalPaymentId:
      sourceType === PAYMENT_SOURCE ? asString(parentRecord.id) : '',
    originalReceiptId:
      sourceType === RECEIPT_SOURCE ? asString(parentRecord.id) : '',
    counterpartyType: '供应商',
    counterpartyId: parentRecord.counterpartyId,
    counterpartyCode: asString(parentRecord.counterpartyCode).trim(),
    counterpartyName: asString(parentRecord.counterpartyName).trim(),
    settlementCompanyId: parentRecord.settlementCompanyId,
    settlementCompanyName: asString(parentRecord.settlementCompanyName).trim(),
    amount: asNumber(parentRecord.amount),
  }
}

export const cashReversalsPageConfig: ModulePageConfig = {
  key: 'cash-reversal',
  title: '资金冲销单',
  kicker: 'Finance',
  description: '冲销已审核供应商付款或收款',
  primaryNoKey: 'reversalNo',
  actions: [
    {
      key: 'create_cash_reversal',
      label: '新增资金冲销单',
      type: 'primary',
    },
  ],
  filters: [
    { key: 'keyword', label: '冲销单号/供应商', type: 'input' },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: [
        { label: '草稿', value: '草稿' },
        { label: '已审核', value: '已审核' },
      ],
    },
    { key: 'reversalDate', label: '冲销日期', type: 'dateRange' },
  ],
  columns: [
    { title: '冲销单号', dataIndex: 'reversalNo', width: 180 },
    {
      title: '原单类型',
      dataIndex: 'sourceType',
      width: 100,
      render: (value, record) =>
        asString(value).trim() ||
        (record.originalPaymentId ? PAYMENT_SOURCE : RECEIPT_SOURCE),
    },
    {
      title: '原单ID',
      dataIndex: 'originalPaymentId',
      width: 190,
      render: (value, record) =>
        asString(value || record.originalReceiptId).trim() || '--',
    },
    { title: '供应商编码', dataIndex: 'counterpartyCode', width: 130 },
    { title: '供应商', dataIndex: 'counterpartyName', width: 180 },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 170,
    },
    {
      title: '冲销日期',
      dataIndex: 'reversalDate',
      width: 120,
      type: 'date',
    },
    {
      title: '冲销金额',
      dataIndex: 'amount',
      width: 120,
      type: 'amount',
      align: 'right',
    },
    { title: '冲销原因', dataIndex: 'reason', width: 220 },
    {
      title: BILL_STATUS_LABEL,
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    { title: '经办人', dataIndex: 'operatorName', width: 120 },
    { title: '备注', dataIndex: 'remark', width: 180 },
  ],
  defaultHiddenColumnKeys: ['counterpartyCode', 'operatorName', 'remark'],
  detailFields: [
    { label: '冲销单号', key: 'reversalNo', row: 1 },
    { label: '原付款单ID', key: 'originalPaymentId', row: 1 },
    { label: '原收款单ID', key: 'originalReceiptId', row: 1 },
    { label: '供应商编码', key: 'counterpartyCode', row: 2 },
    { label: '供应商', key: 'counterpartyName', row: 2 },
    { label: SETTLEMENT_COMPANY_LABEL, key: 'settlementCompanyName', row: 2 },
    { label: '冲销日期', key: 'reversalDate', type: 'date', row: 3 },
    { label: '冲销金额', key: 'amount', type: 'amount', row: 3 },
    { label: BILL_STATUS_LABEL, key: 'status', type: 'status', row: 3 },
    { label: '经办人', key: 'operatorName', row: 3 },
    { label: '冲销原因', key: 'reason', row: 4, fullRow: true },
    { label: '备注', key: 'remark', row: 5, fullRow: true },
  ],
  formFields: [
    {
      key: 'reversalNo',
      label: '冲销单号',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'sourceType',
      label: '原单类型',
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: PAYMENT_SOURCE,
      options: [
        { label: PAYMENT_SOURCE, value: PAYMENT_SOURCE },
        { label: RECEIPT_SOURCE, value: RECEIPT_SOURCE },
      ],
      row: 1,
    },
    {
      key: 'sourceDocumentNo',
      label: '原资金单据',
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'counterpartyName',
      label: '供应商',
      type: 'input',
      required: true,
      disabled: true,
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
      key: 'reversalDate',
      label: '冲销日期',
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'amount',
      label: '冲销金额',
      type: 'number',
      required: true,
      min: 0.01,
      precision: 2,
      defaultValue: 0,
      row: 3,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      required: true,
      disabled: true,
      defaultValue: '草稿',
      options: [
        { label: '草稿', value: '草稿' },
        { label: '已审核', value: '已审核' },
      ],
      row: 3,
    },
    {
      key: 'operatorName',
      label: '经办人',
      type: 'input',
      required: true,
      row: 3,
    },
    {
      key: 'reason',
      label: '冲销原因',
      type: 'textarea',
      required: true,
      row: 4,
      fullRow: true,
    },
    {
      key: 'remark',
      label: '备注',
      type: 'textarea',
      row: 5,
      fullRow: true,
    },
  ],
  parentImport: {
    parentModuleKey: 'payment',
    parentDisplayFieldKey: 'paymentNo',
    parentFieldKey: 'sourceDocumentNo',
    label: '原资金单据',
    buttonText: '选择原资金单据',
    candidateQueryType: 'cash-reversal-source',
    resolveParentSelector: (record) =>
      isPaymentSource(record)
        ? {
            parentModuleKey: 'payment',
            parentDisplayFieldKey: 'paymentNo',
          }
        : {
            parentModuleKey: 'receipt',
            parentDisplayFieldKey: 'receiptNo',
          },
    validateBeforeOpen: (record) =>
      record.sourceType ? null : '请先选择原单类型',
    buildParentFilters: (record) =>
      isPaymentSource(record)
        ? { status: '已审核', businessType: '供应商' }
        : { status: '已审核', counterpartyType: '供应商' },
    validateParentImport: ({ currentRecord, parentRecord }) =>
      validateSourceRecord(currentRecord, parentRecord),
    mapParentToDraft: mapSourceToDraft,
  },
  saveFields: {
    scalar: [
      'reversalNo',
      'originalPaymentId',
      'originalReceiptId',
      'reversalDate',
      'amount',
      'reason',
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
