import i18next from 'i18next'
import { getCarrierEntityOptions } from '@/api/carrier-options'
import { getSettlementCompanyOptions } from '@/constants/module-options'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { AUDIT_STATUS_LABEL, CARRIER_NAME_LABEL } from '../shared/filter-labels'
import {
  SETTLEMENT_COMPANY_LABEL,
  validateSameSettlementCompany,
} from '../shared/settlement-company'
import {
  buildStatementOverview,
  freightItemColumns,
  statusMap,
} from '../shared/shared'

function entityIdOf(value: unknown, field: string) {
  return parseOptionalEntityId(value, field)
}

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
      key: 'carrierId',
      label: CARRIER_NAME_LABEL,
      type: 'select',
      options: getCarrierEntityOptions,
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
          label: '草稿',
          value: '草稿',
        },
        {
          label: i18next.t('modules.pages.freightStatement.audited'),
          value: '已审核',
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
      key: 'carrierId',
      label: i18next.t('modules.pages.freightStatement.carrier'),
      type: 'select',
      required: true,
      options: getCarrierEntityOptions,
      masterOptionRequirements: { carriers: true },
      disabled: true,
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
      disabled: true,
      row: 1,
    },
    {
      key: 'startDate',
      label: i18next.t('modules.pages.freightStatement.startDate'),
      type: 'date',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'endDate',
      label: i18next.t('modules.pages.freightStatement.endDate'),
      type: 'date',
      required: true,
      disabled: true,
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
      disabled: true,
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
      disabled: true,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.freightStatement.auditStatus'),
      type: 'select',
      defaultValue: '草稿',
      disabled: true,
      options: [
        {
          label: '草稿',
          value: '草稿',
        },
        {
          label: i18next.t('modules.pages.freightStatement.audited'),
          value: '已审核',
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
      'carrierId',
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
      'attachment',
      'remark',
    ],
    lineItem: [
      'sourceNo',
      'sourceFreightBillId',
      'sourceFreightBillItemId',
      'settlementCompanyId',
      'settlementCompanyName',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'materialId',
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
      'warehouseId',
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
    buildParentFilters: (currentRecord) => ({
      carrierId: entityIdOf(currentRecord.carrierId, 'carrierId'),
      currentRecordId: entityIdOf(currentRecord.id, 'currentRecordId'),
      settlementCompanyId: currentRecord.settlementCompanyId,
    }),
    mapParentToDraft: (parentRecord) => ({
      carrierId: entityIdOf(parentRecord.carrierId, 'carrierId'),
      carrierCode: asString(parentRecord.carrierCode).trim(),
      carrierName: parentRecord.carrierName || '',
      settlementCompanyId: parentRecord.settlementCompanyId,
      settlementCompanyName: parentRecord.settlementCompanyName || '',
      startDate: parentRecord.billTime || '',
      endDate: parentRecord.billTime || '',
      paidAmount: 0,
      status: '草稿',
    }),
    validateParentImport: ({ currentRecord, parentRecord }) => {
      const currentCarrierId = entityIdOf(
        currentRecord.carrierId,
        'currentRecord.carrierId',
      )
      const parentCarrierId = entityIdOf(
        parentRecord.carrierId,
        'parentRecord.carrierId',
      )
      if (currentCarrierId && currentCarrierId !== parentCarrierId) {
        return '只能选择同一物流商的物流单生成物流对账单'
      }
      const settlementCompanyError = currentRecord.settlementCompanyId
        ? validateSameSettlementCompany(
            currentRecord,
            parentRecord,
            '只能选择同一结算主体的物流单生成物流对账单',
          )
        : null
      if (settlementCompanyError) {
        return settlementCompanyError
      }
      return null
    },
    transformItems: (parentRecord) => {
      const sourceNo = asString(parentRecord.billNo).trim()
      const parentCustomerId = entityIdOf(
        parentRecord.customerId,
        'parentRecord.customerId',
      )
      const parentProjectId = entityIdOf(
        parentRecord.projectId,
        'parentRecord.projectId',
      )
      return (Array.isArray(parentRecord.items) ? parentRecord.items : []).map(
        (item, index) => ({
          ...item,
          id: `${sourceNo || 'freight-bill'}-${String(item.id || index)}`,
          sourceNo,
          sourceFreightBillId: parentRecord.id,
          sourceFreightBillItemId: item.id,
          customerId:
            entityIdOf(item.customerId, 'items[].customerId') ||
            parentCustomerId,
          projectId:
            entityIdOf(item.projectId, 'items[].projectId') || parentProjectId,
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
  rowHighlightStatuses: ['草稿'],
}
