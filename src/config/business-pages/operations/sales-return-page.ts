import i18next from 'i18next'
import { buildDocumentStatusOptions } from '@/constants/module-options'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
  getSettlementCompanyOptions,
} from '@/module-system/core/module-option-resolvers'
import type {
  ModuleItemColumnConfig,
  ModulePageConfig,
} from '@/types/module-page'
import { BILL_STATUS_LABEL, CUSTOMER_NAME_LABEL } from '../shared/filter-labels'
import { actionSet, statusMap } from '../shared/shared'
import { resolveModuleItemColumnConfig } from '../shared/shared-item-column-utils'
import { buildSalesReturnOverview } from './sales-return-rules'

// 销售退货明细：复用交易基础列；来源出库/订单/物流单只读快照不进入可编辑列。
const salesReturnItemColumnConfig: ModuleItemColumnConfig = {
  include: [
    'materialCode',
    'brand',
    'category',
    'material',
    'spec',
    'length',
    'unit',
    'warehouseName',
    'batchNo',
    'quantity',
    'quantityUnit',
    'pieceWeightTon',
    'weightTon',
    'unitPrice',
    'amount',
  ],
  requiredFieldKeys: [
    'materialCode',
    'brand',
    'category',
    'material',
    'spec',
    'unit',
    'warehouseName',
    'quantity',
    'pieceWeightTon',
    'weightTon',
    'unitPrice',
    'amount',
  ],
  projections: {
    saveResult: [
      'brand',
      'material',
      'spec',
      'length',
      'quantity',
      'weightTon',
      'unitPrice',
      'amount',
    ],
  },
}
const salesReturnItemColumnOutputs = resolveModuleItemColumnConfig(
  salesReturnItemColumnConfig,
)

export const salesReturnsPageConfig: ModulePageConfig = {
  key: 'sales-return',
  title: i18next.t('modules.pages.salesReturn.title'),
  kicker: 'Sales',
  description: i18next.t('modules.pages.salesReturn.description'),
  primaryNoKey: 'returnNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.salesReturn.filterReturnNo'),
      type: 'input',
      placeholder: i18next.t('modules.pages.salesReturn.placeholderReturnNo'),
    },
    {
      key: 'customerId',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: getCustomerOptions,
      resetKeysOnChange: ['projectId'],
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'segmented',
      options: buildDocumentStatusOptions('草稿', '已审核'),
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.salesReturn.filterProjectName'),
      type: 'select',
      options: getCustomerProjectOptions,
    },
    {
      key: 'returnDate',
      label: i18next.t('modules.pages.salesReturn.filterReturnDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.salesReturn.colReturnNo'),
      dataIndex: 'returnNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.salesReturn.colSalesOrderNo'),
      dataIndex: 'salesOrderNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.salesReturn.colCustomerName'),
      dataIndex: 'customerName',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.salesReturn.colProjectName'),
      dataIndex: 'projectName',
      width: 180,
    },
    {
      title: i18next.t('modules.columns.settlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.salesReturn.colReturnDate'),
      dataIndex: 'returnDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.columns.totalWeight'),
      dataIndex: 'totalWeight',
      width: 116,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.columns.totalAmount'),
      dataIndex: 'totalAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.columns.status'),
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
  defaultHiddenColumnKeys: ['remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.salesReturn.colReturnNo'),
      key: 'returnNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesReturn.colSalesOrderNo'),
      key: 'salesOrderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesReturn.colCustomerName'),
      key: 'customerName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesReturn.colProjectName'),
      key: 'projectName',
      row: 1,
    },
    {
      label: i18next.t('modules.columns.settlementCompany'),
      key: 'settlementCompanyName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.salesReturn.colReturnDate'),
      key: 'returnDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.columns.totalWeight'),
      key: 'totalWeight',
      type: 'weight',
      row: 2,
    },
    {
      label: i18next.t('modules.columns.totalAmount'),
      key: 'totalAmount',
      type: 'amount',
      row: 2,
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
      row: 2,
    },
    { label: i18next.t('modules.columns.remark'), key: 'remark', row: 3 },
  ],
  formFields: [
    {
      key: 'returnNo',
      label: i18next.t('modules.pages.salesReturn.colReturnNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'salesOrderNo',
      label: i18next.t('modules.pages.salesReturn.colSalesOrderNo'),
      type: 'input',
      disabled: true,
      placeholder: i18next.t(
        'modules.pages.salesReturn.placeholderSalesOrderNo',
      ),
      row: 1,
    },
    {
      key: 'returnDate',
      label: i18next.t('modules.pages.salesReturn.colReturnDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'customerId',
      label: i18next.t('modules.pages.salesReturn.colCustomerName'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      row: 1,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.salesReturn.colProjectName'),
      type: 'select',
      required: true,
      options: getCustomerProjectOptions,
      row: 2,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.columns.settlementCompany'),
      type: 'select',
      options: getSettlementCompanyOptions,
      disabled: true,
      row: 2,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'input',
      row: 3,
      fullRow: true,
    },
  ],
  ...salesReturnItemColumnOutputs,
  data: [],
  buildOverview: buildSalesReturnOverview,
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
