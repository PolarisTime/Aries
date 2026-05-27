import i18next from 'i18next'
import {
  buildValueOptions,
  getSupplierOptions,
  isPurchaseWeighRequiredCategory,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  INBOUND_NO_FILTER_LABEL,
  SUPPLIER_NAME_LABEL,
} from './filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  cloneLineItems,
  compactPurchaseInboundItemColumns,
  statusMap,
} from './shared'

export const purchaseInboundsPageConfig: ModulePageConfig = {
  key: 'purchase-inbound',
  title: i18next.t('modules.pages.purchaseInbound.title'),
  kicker: 'Purchase',
  description: i18next.t('modules.pages.purchaseInbound.description'),
  primaryNoKey: 'inboundNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: INBOUND_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.purchaseInbound.placeholderInboundNo'),
    },
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
      options: buildValueOptions('草稿', '已审核', '完成入库'),
    },
    { key: 'inboundDate', label: i18next.t('modules.pages.purchaseInbound.filterInboundDate'), type: 'dateRange' },
  ],
  columns: [
    { title: i18next.t('modules.pages.purchaseInbound.colInboundNo'), dataIndex: 'inboundNo', width: 160 },
    { title: i18next.t('modules.pages.purchaseInbound.colPurchaseOrderNo'), dataIndex: 'purchaseOrderNo', width: 160 },
    { title: i18next.t('modules.pages.purchaseInbound.colSupplier'), dataIndex: 'supplierName', width: 140 },
    { title: i18next.t('modules.pages.purchaseInbound.colInboundDate'), dataIndex: 'inboundDate', width: 120, type: 'date' },
    {
      title: i18next.t('modules.columns.totalWeight'),
      dataIndex: 'totalWeight',
      width: 100,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.purchaseInbound.colTotalWeighWeight'),
      dataIndex: 'totalWeighWeightTon',
      width: 110,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.purchaseInbound.colWeightAdjustment'),
      dataIndex: 'totalWeightAdjustmentTon',
      width: 90,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.columns.totalAmount'),
      dataIndex: 'totalAmount',
      width: 100,
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
    { title: i18next.t('modules.columns.remark'), dataIndex: 'remark', width: 180 },
  ],
  defaultHiddenColumnKeys: ['remark'],
  detailFields: [
    { label: i18next.t('modules.pages.purchaseInbound.colInboundNo'), key: 'inboundNo', row: 1 },
    { label: i18next.t('modules.pages.purchaseInbound.colPurchaseOrderNo'), key: 'purchaseOrderNo', row: 1 },
    { label: i18next.t('modules.pages.purchaseInbound.colSupplier'), key: 'supplierName', row: 1 },
    { label: i18next.t('modules.pages.purchaseInbound.colInboundDate'), key: 'inboundDate', type: 'date', row: 1 },
    { label: i18next.t('modules.columns.totalWeight'), key: 'totalWeight', type: 'weight', row: 2 },
    { label: i18next.t('modules.pages.purchaseInbound.colTotalWeighWeight'), key: 'totalWeighWeightTon', type: 'weight', row: 3 },
    { label: i18next.t('modules.pages.purchaseInbound.colWeightAdjustment'), key: 'totalWeightAdjustmentTon', type: 'weight', row: 3 },
    { label: i18next.t('modules.columns.totalAmount'), key: 'totalAmount', type: 'amount', row: 2 },
    { label: i18next.t('modules.columns.status'), key: 'status', type: 'status', row: 2 },
    { label: i18next.t('modules.columns.remark'), key: 'remark', row: 2 },
  ],
  formFields: [
    {
      key: 'orderNo',
      label: i18next.t('modules.pages.purchaseInbound.formOrderNo'),
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'purchaseOrderNo',
      label: i18next.t('modules.pages.purchaseInbound.colPurchaseOrderNo'),
      type: 'input',
      disabled: true,
      placeholder: i18next.t('modules.pages.purchaseInbound.placeholderParentImport'),
      row: 1,
    },
    {
      key: 'inboundDate',
      label: i18next.t('modules.pages.purchaseInbound.formInboundDate'),
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'buyerName',
      label: i18next.t('modules.pages.purchaseInbound.formBuyer'),
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'supplierName',
      label: i18next.t('modules.pages.purchaseInbound.colSupplier'),
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 2,
    },
    {
      key: 'totalWeight',
      label: i18next.t('modules.pages.purchaseInbound.formTotalWeight'),
      type: 'input',
      disabled: true,
      row: 2,
    },
    {
      key: 'totalAmount',
      label: i18next.t('modules.pages.purchaseInbound.formTotalAmount'),
      type: 'input',
      disabled: true,
      row: 2,
    },
    { key: 'remark', label: i18next.t('modules.columns.remark'), type: 'input', row: 2, colSpan: 6 },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: i18next.t('modules.pages.purchaseInbound.parentImportLabel'),
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.purchaseInbound.parentImportButton'),
    mapParentToDraft: (parentRecord) => ({
      purchaseOrderNo: parentRecord.orderNo || '',
      supplierName: parentRecord.supplierName || '',
    }),
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items)
          ? parentRecord.items
              .filter((item) => Number(item.remainingQuantity ?? item.quantity) > 0)
              .map((item) => ({
                ...item,
                quantity: Number(item.remainingQuantity ?? item.quantity),
                sourcePurchaseOrderItemId: item.id,
                _sourcePieceWeightTon: item.pieceWeightTon,
                settlementMode: isPurchaseWeighRequiredCategory(item.category)
                  ? '过磅'
                  : '理算',
              }))
          : [],
        'purchase-inbound-item',
      ),
  },
  itemColumns: compactPurchaseInboundItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
