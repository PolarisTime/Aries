import i18next from 'i18next'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
  getSettlementCompanyOptions,
  statementStatusOptions,
} from '@/constants/module-options'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { BILL_STATUS_LABEL, CUSTOMER_NAME_LABEL } from '../shared/filter-labels'
import {
  SETTLEMENT_COMPANY_LABEL,
  validateSameSettlementCompany,
} from '../shared/settlement-company'
import {
  buildStatementOverview,
  compactBatchCustomerStatementItemColumns,
  statusMap,
} from '../shared/shared'

function entityIdOf(value: unknown, field: string) {
  return parseOptionalEntityId(value, field)
}

export const customerStatementPageConfig: ModulePageConfig = {
  key: 'customer-statement',
  title: i18next.t('modules.pages.customerStatement.customerStatement'),
  kicker: 'Statements',
  description: i18next.t(
    'modules.pages.customerStatement.customerStatementDesc',
  ),
  primaryNoKey: 'statementNo',
  actions: [
    {
      key: 'generate_statement',
      label: i18next.t('modules.pages.customerStatement.generateStatement'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'customerId',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: getCustomerOptions,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.customerStatement.project'),
      type: 'select',
      options: getCustomerProjectOptions,
    },
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
      options: statementStatusOptions,
    },
    {
      key: 'endDate',
      label: i18next.t('modules.pages.customerStatement.period'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.customerStatement.statementNo'),
      dataIndex: 'statementNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.customerStatement.customerCode'),
      dataIndex: 'customerCode',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.customerStatement.customer'),
      dataIndex: 'customerName',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.customerStatement.project'),
      dataIndex: 'projectName',
      width: 180,
    },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.customerStatement.startDate'),
      dataIndex: 'startDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.customerStatement.endDate'),
      dataIndex: 'endDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.customerStatement.salesAmount'),
      dataIndex: 'salesAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.customerStatement.receiptAmount'),
      dataIndex: 'receiptAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.customerStatement.closingBalance'),
      dataIndex: 'closingAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.customerStatement.status'),
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
  defaultHiddenColumnKeys: ['customerCode', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.customerStatement.statementNo'),
      key: 'statementNo',
    },
    {
      label: i18next.t('modules.pages.customerStatement.customer'),
      key: 'customerName',
    },
    {
      label: i18next.t('modules.pages.customerStatement.customerCode'),
      key: 'customerCode',
    },
    {
      label: i18next.t('modules.pages.customerStatement.project'),
      key: 'projectName',
    },
    {
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
    },
    {
      label: i18next.t('modules.pages.customerStatement.startDate'),
      key: 'startDate',
      type: 'date',
    },
    {
      label: i18next.t('modules.pages.customerStatement.endDate'),
      key: 'endDate',
      type: 'date',
    },
    {
      label: i18next.t('modules.pages.customerStatement.salesAmount'),
      key: 'salesAmount',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.customerStatement.receiptAmount'),
      key: 'receiptAmount',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.customerStatement.closingBalance'),
      key: 'closingAmount',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.customerStatement.status'),
      key: 'status',
      type: 'status',
    },
    {
      label: i18next.t('modules.pages.customerStatement.remark'),
      key: 'remark',
    },
  ],
  formFields: [
    {
      key: 'statementNo',
      label: i18next.t('modules.pages.customerStatement.statementNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'customerId',
      label: i18next.t('modules.pages.customerStatement.customer'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      row: 1,
    },
    {
      key: 'customerCode',
      label: i18next.t('modules.pages.customerStatement.customerCode'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.customerStatement.project'),
      type: 'select',
      required: true,
      options: getCustomerProjectOptions,
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
      label: i18next.t('modules.pages.customerStatement.startDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'endDate',
      label: i18next.t('modules.pages.customerStatement.endDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'salesAmount',
      label: i18next.t('modules.pages.customerStatement.salesAmount'),
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
      label: i18next.t('modules.pages.customerStatement.closingBalance'),
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
      label: i18next.t('modules.pages.customerStatement.status'),
      type: 'select',
      defaultValue: '待确认',
      options: statementStatusOptions,
      row: 2,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.customerStatement.remark'),
      type: 'textarea',
      row: 3,
      fullRow: true,
    },
  ],
  saveFields: {
    scalar: [
      'statementNo',
      'sourceOrderNos',
      'customerId',
      'customerCode',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'settlementCompanyName',
      'startDate',
      'endDate',
      'salesAmount',
      'receiptAmount',
      'closingAmount',
      'status',
      'remark',
    ],
    lineItem: [
      'sourceNo',
      'sourceSalesOrderItemId',
      'customerId',
      'projectId',
      'materialId',
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
      'unitPrice',
      'amount',
      'warehouseId',
    ],
  },
  parentImport: {
    parentModuleKey: 'sales-order',
    label: '销售订单',
    parentFieldKey: 'sourceOrderNos',
    parentDisplayFieldKey: 'orderNo',
    candidateStatementModuleKey: 'customer-statement',
    buttonText: '选择销售订单生成明细',
    enforceUniqueRelation: true,
    allowMultipleSelection: true,
    buildParentFilters: (currentRecord) => ({
      customerId: entityIdOf(currentRecord.customerId, 'customerId'),
      projectId: entityIdOf(currentRecord.projectId, 'projectId'),
      currentRecordId: entityIdOf(currentRecord.id, 'currentRecordId'),
      settlementCompanyId: currentRecord.settlementCompanyId,
      status: '完成销售',
    }),
    validateBeforeOpen: (currentRecord) =>
      entityIdOf(currentRecord.customerId, 'customerId')
        ? null
        : '请先选择客户，再选择销售订单',
    mapParentToDraft: (parentRecord) => ({
      customerId: entityIdOf(parentRecord.customerId, 'customerId'),
      customerCode: asString(parentRecord.customerCode).trim(),
      customerName: parentRecord.customerName || '',
      projectId: entityIdOf(parentRecord.projectId, 'projectId'),
      projectName: parentRecord.projectName || '',
      settlementCompanyId: parentRecord.settlementCompanyId,
      settlementCompanyName: parentRecord.settlementCompanyName || '',
      startDate: parentRecord.deliveryDate || '',
      endDate: parentRecord.deliveryDate || '',
      receiptAmount: 0,
      status: '待确认',
    }),
    validateParentImport: ({ currentRecord, currentItems, parentRecord }) => {
      if (asString(parentRecord.status).trim() !== '完成销售') {
        return '只能选择完成销售的销售订单生成客户对账单'
      }
      const currentCustomerId = entityIdOf(
        currentRecord.customerId,
        'currentRecord.customerId',
      )
      const parentCustomerId = entityIdOf(
        parentRecord.customerId,
        'parentRecord.customerId',
      )
      if (!currentCustomerId || currentCustomerId !== parentCustomerId) {
        return '只能选择同一客户的销售订单生成客户对账单'
      }
      const existingProjectIds = Array.from(
        new Set(
          [
            currentRecord.projectId,
            ...currentItems.map((item) => item.projectId),
          ].flatMap((value) => {
            const projectId = entityIdOf(value, 'projectId')
            return projectId ? [projectId] : []
          }),
        ),
      )
      const nextProjectId = entityIdOf(
        parentRecord.projectId,
        'parentRecord.projectId',
      )
      if (
        existingProjectIds.length &&
        (!nextProjectId || !existingProjectIds.includes(nextProjectId))
      ) {
        return '只能选择同一项目的销售订单生成客户对账单'
      }
      const settlementCompanyError = validateSameSettlementCompany(
        currentRecord,
        parentRecord,
        '只能选择同一结算主体的销售订单生成客户对账单',
      )
      if (settlementCompanyError) {
        return settlementCompanyError
      }
      return null
    },
    transformItems: (parentRecord) => {
      const sourceNo = asString(parentRecord.orderNo).trim()
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
          id: `${sourceNo || 'sales-order'}-${String(item.id || index)}`,
          sourceNo,
          sourceSalesOrderItemId: item.id,
          customerId:
            entityIdOf(item.customerId, 'items[].customerId') ||
            parentCustomerId,
          projectId:
            entityIdOf(item.projectId, 'items[].projectId') || parentProjectId,
          warehouseId: entityIdOf(item.warehouseId, 'items[].warehouseId'),
          _parentBillTime: parentRecord.deliveryDate || '',
        }),
      )
    },
  },
  itemColumns: compactBatchCustomerStatementItemColumns,
  data: [],
  buildOverview: (rows) =>
    buildStatementOverview(
      rows,
      'salesAmount',
      'receiptAmount',
      'closingAmount',
    ),
  statusMap,
  rowHighlightStatuses: ['待确认'],
}
