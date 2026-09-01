import i18next from 'i18next'
import { buildDocumentStatusOptions } from '@/constants/module-options'
import {
  getSettlementCompanyOptions,
  getSupplierOptions,
} from '@/module-system/core/module-option-resolvers'
import type {
  ModuleItemColumnConfig,
  ModulePageConfig,
} from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  ORDER_NO_FILTER_LABEL,
  SUPPLIER_NAME_LABEL,
} from '../shared/filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  statusMap,
} from '../shared/shared'
import {
  resolveItemColumnProjection,
  resolveItemColumns,
} from '../shared/shared-item-column-utils'

// 采购订单明细列：批号版结构 + 实际重量列（位于重量吨之后、单价之前）。
const purchaseOrderItemColumnConfig: ModuleItemColumnConfig = {
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
    'actualWeightTon',
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

export const purchaseOrdersPageConfig: ModulePageConfig = {
  key: 'purchase-order',
  title: i18next.t('modules.pages.purchaseOrder.title'),
  kicker: 'Purchase',
  description: i18next.t('modules.pages.purchaseOrder.description'),
  primaryNoKey: 'orderNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.purchaseOrder.placeholderOrderNo'),
    },
    {
      key: 'supplierId',
      label: SUPPLIER_NAME_LABEL,
      type: 'select',
      options: getSupplierOptions,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: buildDocumentStatusOptions('草稿', '已审核', '完成采购'),
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'orderDate',
      label: i18next.t('modules.pages.purchaseOrder.filterOrderDate'),
      type: 'dateRange',
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.purchaseOrder.colOrderNo'),
      dataIndex: 'orderNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colSupplier'),
      dataIndex: 'supplierName',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colBuyer'),
      dataIndex: 'buyerName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.purchaseOrder.colOrderDate'),
      dataIndex: 'orderDate',
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
      width: 120,
    },
  ],
  defaultHiddenColumnKeys: ['buyerName', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.purchaseOrder.colSupplier'),
      key: 'supplierName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      key: 'settlementCompanyName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colOrderNo'),
      key: 'orderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colOrderDate'),
      key: 'orderDate',
      type: 'date',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseOrder.colBuyer'),
      key: 'buyerName',
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
      key: 'orderNo',
      label: i18next.t('modules.pages.purchaseOrder.colOrderNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'supplierId',
      label: i18next.t('modules.pages.purchaseOrder.colSupplier'),
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 1,
    },
    {
      key: 'orderDate',
      label: i18next.t('modules.pages.purchaseOrder.colOrderDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'buyerName',
      label: i18next.t('modules.pages.purchaseOrder.colBuyer'),
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.purchaseOrder.colSettlementCompany'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      row: 2,
    },
    {
      key: 'totalWeight',
      label: i18next.t('modules.pages.purchaseOrder.formTotalWeight'),
      type: 'input',
      disabled: true,
      row: 2,
    },
    {
      key: 'totalAmount',
      label: i18next.t('modules.pages.purchaseOrder.formTotalAmount'),
      type: 'input',
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
  itemColumnConfig: purchaseOrderItemColumnConfig,
  itemColumns: resolveItemColumns(purchaseOrderItemColumnConfig),
  saveResultItemColumns: resolveItemColumnProjection(
    purchaseOrderItemColumnConfig,
    purchaseOrderItemColumnConfig.projections?.saveResult,
  ),
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
