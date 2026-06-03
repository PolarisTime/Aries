import i18next from 'i18next'
import {
  buildValueOptions,
  getCustomerOptions,
  getCustomerProjectOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  CUSTOMER_NAME_LABEL,
  ORDER_NO_FILTER_LABEL,
} from './filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  cloneLineItems,
  compactPurchaseItemColumns,
  statusMap,
} from './shared'

export const salesOrdersPageConfig: ModulePageConfig = {
  key: 'sales-order',
  title: i18next.t('modules.pages.salesOrder.title'),
  kicker: 'Sales',
  description: i18next.t('modules.pages.salesOrder.description'),
  primaryNoKey: 'orderNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.salesOrder.placeholderOrderNo'),
      clientSearchKeys: ['orderNo'],
    },
    {
      key: 'productKeyword',
      label: i18next.t('modules.pages.salesOrder.filterProductKeyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.salesOrder.placeholderProductKeyword',
      ),
      clientSearchLineItemKeys: [
        'materialCode',
        'materialName',
        'material',
        'spec',
      ],
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: buildValueOptions('草稿', '已审核', '完成销售'),
    },
    {
      key: 'deliveryDate',
      label: i18next.t('modules.pages.salesOrder.filterDeliveryDate'),
      type: 'dateRange',
    },
    {
      key: 'customerName',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: getCustomerOptions,
      row: 2,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.salesOrder.filterProjectName'),
      type: 'select',
      options: getCustomerProjectOptions,
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.salesOrder.colOrderNo'),
      dataIndex: 'orderNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colProjectName'),
      dataIndex: 'projectName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colCustomerName'),
      dataIndex: 'customerName',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colSalesName'),
      dataIndex: 'salesName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colDeliveryDate'),
      dataIndex: 'deliveryDate',
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
  defaultHiddenColumnKeys: ['projectName', 'salesName', 'remark'],
  detailFields: [
    {
      label: i18next.t('modules.pages.salesOrder.colCustomerName'),
      key: 'customerName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colOrderNo'),
      key: 'orderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
      key: 'purchaseOrderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colSalesName'),
      key: 'salesName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colProjectName'),
      key: 'projectName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colDeliveryDate'),
      key: 'deliveryDate',
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
      row: 3,
    },
    {
      label: i18next.t('modules.columns.remark'),
      key: 'remark',
      row: 3,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'orderNo',
      label: i18next.t('modules.pages.salesOrder.colOrderNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'purchaseOrderNo',
      label: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
      type: 'input',
      disabled: true,
      placeholder: i18next.t(
        'modules.pages.salesOrder.placeholderPurchaseOrderNo',
      ),
      row: 1,
    },
    {
      key: 'salesName',
      label: i18next.t('modules.pages.salesOrder.colSalesName'),
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'customerName',
      label: i18next.t('modules.pages.salesOrder.colCustomerName'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      row: 2,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.salesOrder.colProjectName'),
      type: 'select',
      required: true,
      options: getCustomerProjectOptions,
      row: 2,
    },
    {
      key: 'deliveryDate',
      label: i18next.t('modules.pages.salesOrder.colDeliveryDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'input',
      row: 3,
      colSpan: 12,
    },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: i18next.t('modules.pages.salesOrder.parentImportLabel'),
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.salesOrder.parentImportButton'),
    remainingQuantityKey: 'salesRemainingQuantity',
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items)
          ? parentRecord.items.map((item) => {
              const rawRemainingQuantity = Number(
                item.salesRemainingQuantity ??
                  item.remainingQuantity ??
                  item.quantity ??
                  0,
              )
              const rawTotalQuantity = Number(item.quantity || 0)
              const rawTotalWeightTon = Number(item.weightTon || 0)
              const rawRemainingWeightTon = Number(
                item.salesRemainingWeightTon ?? 0,
              )
              const rawPieceWeightTon =
                rawTotalQuantity > 0 && rawTotalWeightTon > 0
                  ? Number((rawTotalWeightTon / rawTotalQuantity).toFixed(3))
                  : Number(item.pieceWeightTon || 0)
              const rawUnitPrice = Number(item.unitPrice || 0)
              const remainingQuantity = Number.isFinite(rawRemainingQuantity)
                ? rawRemainingQuantity
                : 0
              const pieceWeightTon = Number.isFinite(rawPieceWeightTon)
                ? rawPieceWeightTon
                : 0
              const unitPrice = Number.isFinite(rawUnitPrice) ? rawUnitPrice : 0
              const remainingWeightTon =
                rawRemainingWeightTon > 0
                  ? Number(rawRemainingWeightTon.toFixed(3))
                  : rawTotalQuantity > 0 &&
                      rawTotalWeightTon > 0 &&
                      remainingQuantity === rawTotalQuantity
                    ? Number(rawTotalWeightTon.toFixed(3))
                    : Number((remainingQuantity * pieceWeightTon).toFixed(3))
              return {
                ...item,
                sourcePurchaseOrderItemId: item.id,
                pieceWeightTon,
                remainingQuantity,
                remainingWeightTon,
                remainingAmount: Number(
                  (remainingWeightTon * unitPrice).toFixed(2),
                ),
                _sourceTotalQuantity: item.quantity,
                _sourceTotalWeightTon: item.weightTon,
                _sourcePieceWeightTon: item.pieceWeightTon,
              }
            })
          : [],
        'sales-order-item',
      ),
  },
  itemColumns: compactPurchaseItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
