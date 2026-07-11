import i18next from 'i18next'
import {
  getCarrierOptions,
  getSettlementCompanyOptions,
} from '@/constants/module-options'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  AUDIT_STATUS_LABEL,
  CARRIER_NAME_LABEL,
  SIGN_STATUS_LABEL,
} from '../shared/filter-labels'
import {
  SETTLEMENT_COMPANY_LABEL,
  validateSameSettlementCompany,
} from '../shared/settlement-company'
import {
  buildStatementOverview,
  freightItemColumns,
  statusMap,
} from '../shared/shared'

export const freightStatementPageConfig: ModulePageConfig = {
  key: 'freight-statement',
  title: i18next.t('modules.pages.freightStatement.freightStatement'),
  kicker: 'Statements',
  description: i18next.t('modules.pages.freightStatement.freightStatementDesc'),
  primaryNoKey: 'statementNo',
  actions: [
    {
      key: 'generate_freight_statement',
      label: i18next.t(
        'modules.pages.freightStatement.generateFreightStatement',
      ),
      type: 'primary',
    },
    {
      key: 'view_freight_summary',
      label: i18next.t('modules.pages.freightStatement.viewFreightSummary'),
      type: 'default',
    },
  ],
  filters: [
    {
      key: 'carrierName',
      label: CARRIER_NAME_LABEL,
      type: 'select',
      options: getCarrierOptions,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'status',
      label: AUDIT_STATUS_LABEL,
      type: 'select',
      options: [
        {
          label: i18next.t('modules.pages.freightStatement.pendingAudit'),
          value: '待审核',
        },
        {
          label: i18next.t('modules.pages.freightStatement.audited'),
          value: '已审核',
        },
      ],
    },
    {
      key: 'signStatus',
      label: SIGN_STATUS_LABEL,
      type: 'select',
      options: [
        {
          label: i18next.t('modules.pages.freightStatement.unsigned'),
          value: '未签署',
        },
        {
          label: i18next.t('modules.pages.freightStatement.signed'),
          value: '已签署',
        },
      ],
    },
    {
      key: 'endDate',
      label: i18next.t('modules.pages.freightStatement.period'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.freightStatement.statementNo'),
      dataIndex: 'statementNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.freightStatement.carrierCode'),
      dataIndex: 'carrierCode',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.freightStatement.carrier'),
      dataIndex: 'carrierName',
      width: 150,
    },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.freightStatement.startDate'),
      dataIndex: 'startDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.freightStatement.endDate'),
      dataIndex: 'endDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.freightStatement.totalWeight'),
      dataIndex: 'totalWeight',
      width: 116,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.freightStatement.totalFreight'),
      dataIndex: 'totalFreight',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.freightStatement.paidAmount'),
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.freightStatement.unpaidAmount'),
      dataIndex: 'unpaidAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.freightStatement.auditStatus'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.freightStatement.signStatus'),
      dataIndex: 'signStatus',
      width: 110,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.columns.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: ['carrierCode', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.freightStatement.statementNo'),
      key: 'statementNo',
    },
    {
      label: i18next.t('modules.pages.freightStatement.carrier'),
      key: 'carrierName',
    },
    {
      label: i18next.t('modules.pages.freightStatement.carrierCode'),
      key: 'carrierCode',
    },
    {
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
    },
    {
      label: i18next.t('modules.pages.freightStatement.startDate'),
      key: 'startDate',
      type: 'date',
    },
    {
      label: i18next.t('modules.pages.freightStatement.endDate'),
      key: 'endDate',
      type: 'date',
    },
    {
      label: i18next.t('modules.pages.freightStatement.totalWeight'),
      key: 'totalWeight',
      type: 'weight',
    },
    {
      label: i18next.t('modules.pages.freightStatement.totalFreight'),
      key: 'totalFreight',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.freightStatement.paidAmount'),
      key: 'paidAmount',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.freightStatement.auditStatus'),
      key: 'status',
      type: 'status',
    },
    {
      label: i18next.t('modules.pages.freightStatement.signStatus'),
      key: 'signStatus',
      type: 'status',
    },
    {
      label: i18next.t('modules.pages.freightStatement.attachment'),
      key: 'attachment',
    },
    {
      label: i18next.t('modules.pages.freightStatement.remark'),
      key: 'remark',
    },
  ],
  formFields: [
    {
      key: 'statementNo',
      label: i18next.t('modules.pages.freightStatement.statementNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'carrierName',
      label: i18next.t('modules.pages.freightStatement.carrier'),
      type: 'select',
      required: true,
      options: getCarrierOptions,
      row: 1,
    },
    {
      key: 'carrierCode',
      label: i18next.t('modules.pages.freightStatement.carrierCode'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
      row: 1,
    },
    {
      key: 'startDate',
      label: i18next.t('modules.pages.freightStatement.startDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'endDate',
      label: i18next.t('modules.pages.freightStatement.endDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'totalWeight',
      label: i18next.t('modules.pages.freightStatement.totalWeight'),
      type: 'number',
      required: true,
      min: 0,
      precision: INTERNAL_WEIGHT_PRECISION,
      defaultValue: 0,
      row: 2,
    },
    {
      key: 'totalFreight',
      label: i18next.t('modules.pages.freightStatement.totalFreight'),
      type: 'number',
      required: true,
      min: 0,
      precision: 2,
      defaultValue: 0,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.freightStatement.auditStatus'),
      type: 'select',
      defaultValue: '待审核',
      options: [
        {
          label: i18next.t('modules.pages.freightStatement.pendingAudit'),
          value: '待审核',
        },
        {
          label: i18next.t('modules.pages.freightStatement.audited'),
          value: '已审核',
        },
      ],
      row: 2,
    },
    {
      key: 'signStatus',
      label: i18next.t('modules.pages.freightStatement.signStatus'),
      type: 'select',
      defaultValue: '未签署',
      options: [
        {
          label: i18next.t('modules.pages.freightStatement.unsigned'),
          value: '未签署',
        },
        {
          label: i18next.t('modules.pages.freightStatement.signed'),
          value: '已签署',
        },
      ],
      row: 2,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.freightStatement.remark'),
      type: 'textarea',
      row: 3,
      fullRow: true,
    },
  ],
  saveFields: {
    scalar: [
      'statementNo',
      'sourceBillNos',
      'carrierCode',
      'carrierName',
      'settlementCompanyId',
      'settlementCompanyName',
      'startDate',
      'endDate',
      'totalWeight',
      'totalFreight',
      'paidAmount',
      'unpaidAmount',
      'status',
      'signStatus',
      'attachment',
      'remark',
    ],
    lineItem: [
      'sourceNo',
      'sourceSalesOutboundItemId',
      'settlementCompanyId',
      'settlementCompanyName',
      'customerName',
      'projectName',
      'materialCode',
      'materialName',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'piecesPerBundle',
      'batchNo',
      'weightTon',
      'warehouseName',
    ],
  },
  parentImport: {
    parentModuleKey: 'freight-bill',
    label: '物流单',
    parentFieldKey: 'sourceBillNos',
    parentDisplayFieldKey: 'billNo',
    candidateStatementModuleKey: 'freight-statement',
    buttonText: '选择物流单生成明细',
    enforceUniqueRelation: true,
    allowMultipleSelection: true,
    buildParentFilters: (currentRecord) => {
      const carrierCode = asString(currentRecord.carrierCode).trim()
      const carrierIdentityFilter = carrierCode
        ? { carrierCode }
        : { carrierName: asString(currentRecord.carrierName).trim() }
      return {
        ...carrierIdentityFilter,
        settlementCompanyId: currentRecord.settlementCompanyId,
        status: '已审核',
      }
    },
    validateBeforeOpen: (currentRecord) =>
      asString(currentRecord.carrierName).trim()
        ? null
        : '请先选择物流商，再选择物流单',
    mapParentToDraft: (parentRecord) => ({
      carrierCode: asString(parentRecord.carrierCode).trim(),
      carrierName: parentRecord.carrierName || '',
      settlementCompanyId: parentRecord.settlementCompanyId,
      settlementCompanyName: parentRecord.settlementCompanyName || '',
      startDate: parentRecord.billTime || '',
      endDate: parentRecord.billTime || '',
      paidAmount: 0,
      status: '待审核',
      signStatus: '未签署',
    }),
    validateParentImport: ({ currentRecord, parentRecord }) => {
      if (asString(parentRecord.status).trim() !== '已审核') {
        return '只能选择已审核的物流单生成物流对账单'
      }
      const currentCarrierCode = asString(currentRecord.carrierCode).trim()
      const parentCarrierCode = asString(parentRecord.carrierCode).trim()
      const isSameCarrier =
        currentCarrierCode && parentCarrierCode
          ? currentCarrierCode === parentCarrierCode
          : asString(currentRecord.carrierName).trim() ===
            asString(parentRecord.carrierName).trim()
      if (!isSameCarrier) {
        return '只能选择同一物流商的物流单生成物流对账单'
      }
      const settlementCompanyError = validateSameSettlementCompany(
        currentRecord,
        parentRecord,
        '只能选择同一结算主体的物流单生成物流对账单',
      )
      if (settlementCompanyError) {
        return settlementCompanyError
      }
      return null
    },
    transformItems: (parentRecord) => {
      const sourceNo = asString(parentRecord.billNo).trim()
      return (Array.isArray(parentRecord.items) ? parentRecord.items : []).map(
        (item, index) => ({
          ...item,
          id: `${sourceNo || 'freight-bill'}-${String(item.id || index)}`,
          sourceNo,
          _parentBillTime: parentRecord.billTime || '',
          _parentTotalFreight: Number(parentRecord.totalFreight || 0),
        }),
      )
    },
  },
  itemColumns: freightItemColumns,
  data: [],
  buildOverview: (rows) =>
    buildStatementOverview(rows, 'totalFreight', 'paidAmount', 'unpaidAmount'),
  statusMap,
  rowHighlightStatuses: ['待审核', '未签署'],
}
