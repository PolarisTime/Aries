import i18next from 'i18next'
import {
  buildValueOptions,
  customerOptions,
  getSettlementCompanyOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { BILL_STATUS_LABEL, CUSTOMER_NAME_LABEL } from '../shared/filter-labels'
import {
  SETTLEMENT_COMPANY_LABEL,
  validateSameSettlementCompany,
} from '../shared/settlement-company'
import {
  buildFinanceOverview,
  compactInvoiceIssueItemColumns,
  statusMap,
} from '../shared/shared'

export const invoiceIssuePageConfig: ModulePageConfig = {
  key: 'invoice-issue',
  title: i18next.t('modules.pages.invoiceIssue.invoiceIssue'),
  kicker: 'Finance',
  description: i18next.t('modules.pages.invoiceIssue.invoiceIssueDesc'),
  primaryNoKey: 'issueNo',
  actions: [
    {
      key: 'create_invoice_issue',
      label: i18next.t('modules.pages.invoiceIssue.createInvoiceIssue'),
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
      options: buildValueOptions('草稿', '已开票'),
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'invoiceDate',
      label: i18next.t('modules.pages.invoiceIssue.invoiceDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.invoiceIssue.issueNo'),
      dataIndex: 'issueNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.relatedSalesOrder'),
      dataIndex: 'sourceSalesOrderNos',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.invoiceNo'),
      dataIndex: 'invoiceNo',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.customer'),
      dataIndex: 'customerName',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.project'),
      dataIndex: 'projectName',
      width: 180,
    },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.invoiceDate'),
      dataIndex: 'invoiceDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.invoiceType'),
      dataIndex: 'invoiceType',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.amount'),
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.taxAmount'),
      dataIndex: 'taxAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.operator'),
      dataIndex: 'operatorName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.invoiceIssue.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: [
    'sourceSalesOrderNos',
    'projectName',
    'taxAmount',
    'operatorName',
    'remark',
  ],
  detailFields: [
    { label: i18next.t('modules.pages.invoiceIssue.issueNo'), key: 'issueNo' },
    {
      label: i18next.t('modules.pages.invoiceIssue.relatedSalesOrder'),
      key: 'sourceSalesOrderNos',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.invoiceNo'),
      key: 'invoiceNo',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.customer'),
      key: 'customerName',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.project'),
      key: 'projectName',
    },
    {
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.invoiceDate'),
      key: 'invoiceDate',
      type: 'date',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.invoiceType'),
      key: 'invoiceType',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.amount'),
      key: 'amount',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.taxAmount'),
      key: 'taxAmount',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.status'),
      key: 'status',
      type: 'status',
    },
    {
      label: i18next.t('modules.pages.invoiceIssue.operator'),
      key: 'operatorName',
    },
    { label: i18next.t('modules.pages.invoiceIssue.remark'), key: 'remark' },
  ],
  formFields: [
    {
      key: 'issueNo',
      label: i18next.t('modules.pages.invoiceIssue.issueNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'sourceSalesOrderNos',
      label: i18next.t('modules.pages.invoiceIssue.relatedSalesOrder'),
      type: 'input',
      disabled: true,
      placeholder: i18next.t(
        'modules.pages.invoiceIssue.importFromSalesOrders',
      ),
      row: 1,
    },
    {
      key: 'invoiceNo',
      label: i18next.t('modules.pages.invoiceIssue.invoiceNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'customerName',
      label: i18next.t('modules.pages.invoiceIssue.customer'),
      type: 'select',
      required: true,
      options: customerOptions,
      row: 1,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.invoiceIssue.project'),
      type: 'input',
      required: true,
      row: 2,
    },
    {
      key: 'invoiceDate',
      label: i18next.t('modules.pages.invoiceIssue.invoiceDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'invoiceType',
      label: i18next.t('modules.pages.invoiceIssue.invoiceType'),
      type: 'select',
      required: true,
      options: buildValueOptions('增值税专票', '增值税普票'),
      row: 2,
    },
    {
      key: 'targetAmount',
      label: i18next.t('modules.pages.invoiceIssue.targetAmount'),
      type: 'number',
      min: 0,
      precision: 2,
      defaultValue: 0,
      row: 2,
    },
    {
      key: 'amount',
      label: i18next.t('modules.pages.invoiceIssue.amount'),
      type: 'number',
      required: true,
      min: 0,
      precision: 2,
      defaultValue: 0,
      disabled: true,
      row: 3,
    },
    {
      key: 'taxRate',
      label: i18next.t('modules.pages.invoiceIssue.taxRate'),
      type: 'number',
      min: 0,
      precision: 4,
      defaultValue: 0,
      disabled: true,
      row: 3,
    },
    {
      key: 'taxAmount',
      label: i18next.t('modules.pages.invoiceIssue.taxAmount'),
      type: 'number',
      required: true,
      min: 0,
      precision: 2,
      defaultValue: 0,
      disabled: true,
      row: 3,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.invoiceIssue.status'),
      type: 'select',
      defaultValue: '草稿',
      options: buildValueOptions('草稿', '已开票'),
      row: 3,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.invoiceIssue.operator'),
      type: 'input',
      required: true,
      row: 4,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.invoiceIssue.remark'),
      type: 'textarea',
      row: 5,
      fullRow: true,
    },
  ],
  parentImport: {
    parentModuleKey: 'sales-order',
    label: i18next.t('modules.pages.invoiceIssue.parentSalesOrder'),
    parentFieldKey: 'sourceSalesOrderNos',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.invoiceIssue.importSalesOrderItems'),
    mapParentToDraft: (parentRecord) => ({
      customerName: parentRecord.customerName || '',
      projectName: parentRecord.projectName || '',
      settlementCompanyId: parentRecord.settlementCompanyId,
      settlementCompanyName: parentRecord.settlementCompanyName || '',
    }),
    validateParentImport: ({ currentRecord, parentRecord }) => {
      if (
        asString(currentRecord.customerName).trim() &&
        asString(currentRecord.customerName).trim() !==
          asString(parentRecord.customerName).trim()
      ) {
        return '只能选择同一客户的销售订单生成开票单'
      }
      if (
        asString(currentRecord.projectName).trim() &&
        asString(currentRecord.projectName).trim() !==
          asString(parentRecord.projectName).trim()
      ) {
        return '只能选择同一项目的销售订单生成开票单'
      }
      const settlementCompanyError = validateSameSettlementCompany(
        currentRecord,
        parentRecord,
        '只能选择同一结算主体的销售订单生成开票单',
      )
      if (settlementCompanyError) {
        return settlementCompanyError
      }
      return null
    },
    transformItems: (parentRecord) =>
      Array.isArray(parentRecord.items)
        ? parentRecord.items.map((item, index) => ({
            ...item,
            id: `invoice-issue-item-${parentRecord.id}-${index + 1}`,
            sourceNo: parentRecord.orderNo || '',
            sourceSalesOrderItemId: item.id,
            _maxImportWeightTon: item.weightTon,
            _maxImportAmount: item.amount,
            maxImportQuantity: item.quantity,
          }))
        : [],
  },
  itemColumns: compactInvoiceIssueItemColumns,
  saveFields: {
    scalar: [
      'issueNo',
      'invoiceNo',
      'sourceSalesOrderNos',
      'customerName',
      'projectName',
      'settlementCompanyId',
      'settlementCompanyName',
      'invoiceDate',
      'invoiceType',
      'amount',
      'taxAmount',
      'status',
      'operatorName',
      'remark',
    ],
    lineItem: [
      'sourceNo',
      'sourceSalesOrderItemId',
      'materialId',
      'materialCode',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'warehouseId',
      'warehouseName',
      'batchNo',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'piecesPerBundle',
      'weightTon',
      'unitPrice',
      'amount',
    ],
  },
  data: [],
  buildOverview: (rows) => buildFinanceOverview(rows, 'amount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
