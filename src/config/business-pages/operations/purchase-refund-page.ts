import i18next from 'i18next'
import { getPurchaseRefundPreview } from '@/api/purchase-order-candidates'
import {
  buildValueOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
} from '@/constants/module-options'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import { BILL_STATUS_LABEL, SUPPLIER_NAME_LABEL } from '../shared/filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  compactPurchaseItemColumns,
  statusMap,
} from '../shared/shared'

function toRefundPreviewItem(
  item: ModuleLineItem,
  index: number,
): ModuleLineItem {
  const sourceItemId = String(item.sourcePurchaseOrderItemId || index + 1)
  return {
    ...item,
    id: `purchase-refund-item-${sourceItemId}`,
    maxImportQuantity: item.quantity,
    _maxImportWeightTon: item.weightTon,
    _maxImportAmount: item.amount,
  }
}

export const purchaseRefundsPageConfig: ModulePageConfig = {
  key: 'purchase-refund',
  title: i18next.t('modules.pages.purchaseRefund.title'),
  kicker: 'Purchase',
  description: i18next.t('modules.pages.purchaseRefund.description'),
  primaryNoKey: 'refundNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.purchaseRefund.refundNo'),
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.purchaseRefund.placeholderRefundNo',
      ),
    },
    {
      key: 'supplierId',
      label: SUPPLIER_NAME_LABEL,
      type: 'select',
      options: getSupplierOptions,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.purchaseRefund.settlementCompany'),
      type: 'select',
      options: getSettlementCompanyOptions,
      row: 2,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: buildValueOptions('草稿', '已审核'),
    },
    {
      key: 'refundDate',
      label: i18next.t('modules.pages.purchaseRefund.refundDate'),
      type: 'dateRange',
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.purchaseRefund.refundNo'),
      dataIndex: 'refundNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.purchaseRefund.purchaseOrderNo'),
      dataIndex: 'purchaseOrderNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.purchaseRefund.supplier'),
      dataIndex: 'supplierName',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.purchaseRefund.settlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.purchaseRefund.refundDate'),
      dataIndex: 'refundDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.purchaseRefund.totalQuantity'),
      dataIndex: 'totalQuantity',
      width: 110,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.columns.totalWeight'),
      dataIndex: 'totalWeight',
      width: 110,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.columns.totalAmount'),
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.columns.status'),
      dataIndex: 'status',
      width: 100,
      align: 'center',
      type: 'status',
    },
    {
      title: i18next.t('modules.pages.purchaseRefund.operator'),
      dataIndex: 'operatorName',
      width: 120,
    },
    {
      title: i18next.t('modules.columns.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: ['settlementCompanyName', 'operatorName', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.purchaseRefund.refundNo'),
      key: 'refundNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseRefund.purchaseOrderNo'),
      key: 'purchaseOrderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseRefund.supplierCode'),
      key: 'supplierCode',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseRefund.supplier'),
      key: 'supplierName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseRefund.settlementCompany'),
      key: 'settlementCompanyName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.purchaseRefund.refundDate'),
      key: 'refundDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.purchaseRefund.totalQuantity'),
      key: 'totalQuantity',
      type: 'count',
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
      row: 3,
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.purchaseRefund.operator'),
      key: 'operatorName',
      row: 3,
    },
    { label: i18next.t('modules.columns.remark'), key: 'remark', row: 3 },
  ],
  formFields: [
    {
      key: 'refundNo',
      label: i18next.t('modules.pages.purchaseRefund.refundNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'purchaseOrderNo',
      label: i18next.t('modules.pages.purchaseRefund.purchaseOrderNo'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'supplierName',
      label: i18next.t('modules.pages.purchaseRefund.supplier'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'settlementCompanyName',
      label: i18next.t('modules.pages.purchaseRefund.settlementCompany'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'refundDate',
      label: i18next.t('modules.pages.purchaseRefund.refundDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'totalQuantity',
      label: i18next.t('modules.pages.purchaseRefund.totalQuantity'),
      type: 'number',
      disabled: true,
      row: 2,
    },
    {
      key: 'totalWeight',
      label: i18next.t('modules.columns.totalWeight'),
      type: 'number',
      precision: 8,
      disabled: true,
      row: 2,
    },
    {
      key: 'totalAmount',
      label: i18next.t('modules.columns.totalAmount'),
      type: 'number',
      precision: 2,
      disabled: true,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.columns.status'),
      type: 'select',
      options: buildValueOptions('草稿', '已审核'),
      defaultValue: '草稿',
      row: 3,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.purchaseRefund.operator'),
      type: 'input',
      required: true,
      row: 3,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'textarea',
      fullRow: true,
      row: 4,
    },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: i18next.t('modules.pages.purchaseRefund.parentPurchaseOrder'),
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'purchaseOrderNo',
    buttonText: i18next.t('modules.pages.purchaseRefund.importPurchaseOrder'),
    candidateQueryType: 'purchase-refund-source',
    enforceUniqueRelation: true,
    buildParentFilters: (currentRecord) => ({
      supplierId: currentRecord.supplierId,
    }),
    hiddenSelectorColumnKeys: ['buyerName', 'status'],
    resolveParentRecord: (parentRecord) =>
      getPurchaseRefundPreview(String(parentRecord.id)),
    mapParentToDraft: (parentRecord) => ({
      sourcePurchaseOrderId:
        parentRecord.sourcePurchaseOrderId || parentRecord.id,
      purchaseOrderNo: parentRecord.purchaseOrderNo || '',
      supplierId: parentRecord.supplierId,
      supplierCode: parentRecord.supplierCode || '',
      supplierName: parentRecord.supplierName || '',
      settlementCompanyId: parentRecord.settlementCompanyId,
      settlementCompanyName: parentRecord.settlementCompanyName || '',
      totalQuantity: parentRecord.totalQuantity || 0,
      totalWeight: parentRecord.totalWeight || 0,
      totalAmount: parentRecord.totalAmount || 0,
    }),
    transformItems: (parentRecord) =>
      Array.isArray(parentRecord.items)
        ? parentRecord.items.map(toRefundPreviewItem)
        : [],
  },
  itemColumns: compactPurchaseItemColumns,
  saveFields: {
    scalar: [
      'refundNo',
      'sourcePurchaseOrderId',
      'refundDate',
      'status',
      'operatorName',
      'remark',
    ],
  },
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
