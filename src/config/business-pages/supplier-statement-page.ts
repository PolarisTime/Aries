import {
  getSupplierOptions,
  statementStatusOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { BILL_STATUS_LABEL, SUPPLIER_NAME_LABEL } from './filter-labels'
import {
  buildStatementOverview,
  compactBatchSupplierStatementItemColumns,
  statusMap,
} from './shared'
import i18next from 'i18next'
import { asString } from '@/utils/type-narrowing'

export const supplierStatementPageConfig: ModulePageConfig = {
  key: 'supplier-statement',
  title: i18next.t('modules.pages.supplierStatement.supplierStatement'),
  kicker: 'Statements',
  description:
    i18next.t('modules.pages.supplierStatement.supplierStatementDesc'),
  primaryNoKey: 'statementNo',
  actions: [
    { key: 'generate_statement', label: i18next.t('modules.pages.supplierStatement.generateStatement'), type: 'primary' },
  ],
  filters: [
    {
      key: 'supplierName',
      label: SUPPLIER_NAME_LABEL,
      type: 'select',
      options: getSupplierOptions,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: statementStatusOptions,
    },
    { key: 'endDate', label: i18next.t('modules.pages.supplierStatement.period'), type: 'dateRange' },
  ],
  columns: [
    { title: i18next.t('modules.pages.supplierStatement.statementNo'), dataIndex: 'statementNo', width: 170 },
    { title: i18next.t('modules.pages.supplierStatement.supplier'), dataIndex: 'supplierName', width: 140 },
    { title: i18next.t('modules.pages.supplierStatement.startDate'), dataIndex: 'startDate', width: 120, type: 'date' },
    { title: i18next.t('modules.pages.supplierStatement.endDate'), dataIndex: 'endDate', width: 120, type: 'date' },
    {
      title: i18next.t('modules.pages.supplierStatement.purchaseAmount'),
      dataIndex: 'purchaseAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.supplierStatement.paymentAmount'),
      dataIndex: 'paymentAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.supplierStatement.closingBalance'),
      dataIndex: 'closingAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.supplierStatement.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
  ],
  defaultHiddenColumnKeys: ['paymentAmount'],
  detailFields: [
    { label: i18next.t('modules.pages.supplierStatement.statementNo'), key: 'statementNo' },
    { label: i18next.t('modules.pages.supplierStatement.supplier'), key: 'supplierName' },
    { label: i18next.t('modules.pages.supplierStatement.startDate'), key: 'startDate', type: 'date' },
    { label: i18next.t('modules.pages.supplierStatement.endDate'), key: 'endDate', type: 'date' },
    { label: i18next.t('modules.pages.supplierStatement.purchaseAmount'), key: 'purchaseAmount', type: 'amount' },
    { label: i18next.t('modules.pages.supplierStatement.paymentAmount'), key: 'paymentAmount', type: 'amount' },
    { label: i18next.t('modules.pages.supplierStatement.closingBalance'), key: 'closingAmount', type: 'amount' },
    { label: i18next.t('modules.pages.supplierStatement.status'), key: 'status', type: 'status' },
    { label: i18next.t('modules.pages.supplierStatement.remark'), key: 'remark' },
  ],
  formFields: [
    {
      key: 'statementNo',
      label: i18next.t('modules.pages.supplierStatement.statementNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'supplierName',
      label: i18next.t('modules.pages.supplierStatement.supplier'),
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 1,
    },
    {
      key: 'startDate',
      label: i18next.t('modules.pages.supplierStatement.startDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    { key: 'endDate', label: i18next.t('modules.pages.supplierStatement.endDate'), type: 'date', required: true, row: 1 },
    {
      key: 'purchaseAmount',
      label: i18next.t('modules.pages.supplierStatement.purchaseAmount'),
      type: 'number',
      required: true,
      min: 0,
      precision: 2,
      defaultValue: 0,
      disabled: true,
      row: 2,
    },
    {
      key: 'closingAmount',
      label: i18next.t('modules.pages.supplierStatement.closingBalance'),
      type: 'number',
      required: true,
      min: 0,
      precision: 2,
      defaultValue: 0,
      disabled: true,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.supplierStatement.status'),
      type: 'select',
      defaultValue: '待确认',
      options: statementStatusOptions,
      row: 2,
    },
    { key: 'remark', label: i18next.t('modules.pages.supplierStatement.remark'), type: 'textarea', row: 3, fullRow: true },
  ],
  saveFields: {
    scalar: [
      'statementNo',
      'sourceInboundNos',
      'supplierName',
      'startDate',
      'endDate',
      'purchaseAmount',
      'paymentAmount',
      'closingAmount',
      'status',
      'remark',
    ],
    lineItem: [
      'sourceNo',
      'materialCode',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'batchNo',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'piecesPerBundle',
      'weightTon',
      'weighWeightTon',
      'weightAdjustmentTon',
      'weightAdjustmentAmount',
      'unitPrice',
      'amount',
    ],
  },
  parentImport: {
    parentModuleKey: 'purchase-inbound',
    label: '采购入库单',
    parentFieldKey: 'sourceInboundNos',
    parentDisplayFieldKey: 'inboundNo',
    candidateStatementModuleKey: 'supplier-statement',
    buttonText: '选择采购入库单生成明细',
    enforceUniqueRelation: true,
    allowMultipleSelection: true,
    buildParentFilters: (currentRecord) => ({
      supplierName: asString(currentRecord.supplierName).trim(),
      status: '完成采购',
    }),
    validateBeforeOpen: (currentRecord) =>
      asString(currentRecord.supplierName).trim()
        ? null
        : '请先选择供应商，再选择采购入库单',
    mapParentToDraft: (parentRecord) => ({
      supplierName: parentRecord.supplierName || '',
      startDate: parentRecord.inboundDate || '',
      endDate: parentRecord.inboundDate || '',
      paymentAmount: 0,
      status: '待确认',
    }),
    validateParentImport: ({ currentRecord, parentRecord }) => {
      if (asString(parentRecord.status).trim() !== '完成采购') {
        return '只能选择完成采购的采购入库单生成供应商对账单'
      }
      if (
        asString(currentRecord.supplierName).trim() !==
        asString(parentRecord.supplierName).trim()
      ) {
        return '只能选择同一供应商的采购入库单生成供应商对账单'
      }
      return null
    },
    transformItems: (parentRecord) => {
      const sourceNo = asString(parentRecord.inboundNo).trim()
      return (Array.isArray(parentRecord.items) ? parentRecord.items : []).map(
        (item, index) => ({
          ...item,
          id: `${sourceNo || 'purchase-inbound'}-${String(item.id || index)}`,
          sourceNo,
          sourceInboundItemId: item.id,
          _parentBillTime: parentRecord.inboundDate || '',
        }),
      )
    },
  },
  itemColumns: compactBatchSupplierStatementItemColumns,
  data: [],
  buildOverview: (rows) =>
    buildStatementOverview(
      rows,
      'purchaseAmount',
      'paymentAmount',
      'closingAmount',
    ),
  statusMap,
  rowHighlightStatuses: ['待确认'],
}
