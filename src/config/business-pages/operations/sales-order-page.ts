import { Tooltip } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { DocumentReferenceStatusIcons } from '@/components/DocumentReferenceStatusIcons'
import { buildDocumentStatusOptions } from '@/constants/module-options'
import {
  DISPLAY_WEIGHT_PRECISION,
  INTERNAL_WEIGHT_PRECISION,
} from '@/constants/precision'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
  getSettlementCompanyOptions,
} from '@/module-system/core/module-option-resolvers'
import type {
  ModuleItemColumnConfig,
  ModulePageConfig,
} from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  CUSTOMER_NAME_LABEL,
  ORDER_NO_FILTER_LABEL,
} from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import {
  actionSet,
  buildAmountWeightOverview,
  cloneLineItems,
  statusMap,
} from '../shared/shared'
import { resolveModuleItemColumnConfig } from '../shared/shared-item-column-utils'

// 销售订单明细列：仓库放在品牌前，商品编码与批号不进入默认页面白名单（永久不可见）。
const salesOrderItemColumnConfig: ModuleItemColumnConfig = {
  include: [
    'warehouseName',
    'brand',
    'category',
    'material',
    'spec',
    'length',
    'unit',
    'quantity',
    'quantityUnit',
    'pieceWeightTon',
    'weightTon',
    'unitPrice',
    'amount',
  ],
  requiredFieldKeys: [
    'warehouseName',
    'brand',
    'category',
    'material',
    'spec',
    'unit',
    'quantity',
    'pieceWeightTon',
    'weightTon',
    'unitPrice',
    'amount',
  ],
  // 商品编码列不再占用表格空间；材质列承载物料选择，选中后仍会同步填充
  // materialId/materialCode 及其它物料快照字段，满足后端请求契约。
  overrides: {
    material: {
      editor: { control: 'material' },
    },
  },
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
const salesOrderItemColumnOutputs = resolveModuleItemColumnConfig(
  salesOrderItemColumnConfig,
)

export const salesOrdersPageConfig: ModulePageConfig = {
  key: 'sales-order',
  title: i18next.t('modules.pages.salesOrder.title'),
  kicker: 'Sales',
  description: i18next.t('modules.pages.salesOrder.description'),
  primaryNoKey: 'orderNo',
  defaultFilters: { pendingOnly: 'true' },
  actions: actionSet,
  quickFilters: [
    {
      key: 'pending',
      label: i18next.t('modules.pages.salesOrder.pendingOnly'),
      values: { pendingOnly: 'true' },
    },
    {
      key: 'all',
      label: i18next.t('modules.pages.salesOrder.filterAll'),
      values: { pendingOnly: undefined },
    },
  ],
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.salesOrder.placeholderOrderNo'),
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
      type: 'select',
      resetKeysOnChange: ['pendingOnly'],
      options: buildDocumentStatusOptions(
        '草稿',
        '已审核',
        '交付核定',
        '完成销售',
      ),
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'productKeyword',
      label: i18next.t('modules.pages.salesOrder.filterProductKeyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.salesOrder.placeholderProductKeyword',
      ),
      row: 2,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.salesOrder.filterProjectName'),
      type: 'select',
      options: getCustomerProjectOptions,
      row: 2,
    },
    {
      key: 'deliveryDate',
      label: i18next.t('modules.pages.salesOrder.filterDeliveryDate'),
      type: 'dateRange',
      defaultDateRange: {
        monthsBefore: 3,
        monthsAfter: 1,
      },
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.salesOrder.colOrderNo'),
      dataIndex: 'orderNo',
      width: 190,
      render: (value, record) =>
        React.createElement(
          'span',
          { className: 'document-reference-trigger' },
          React.createElement(
            'span',
            { className: 'document-reference-link' },
            String(value ?? ''),
          ),
          React.createElement(DocumentReferenceStatusIcons, {
            statuses: [
              {
                key: 'freight-bill',
                label: i18next.t(
                  'modules.pages.salesOrder.referencedByFreightBill',
                ),
                referenced: Boolean(record.referencedByFreightBill),
              },
              {
                key: 'sales-outbound',
                label: i18next.t(
                  'modules.pages.salesOrder.referencedBySalesOutbound',
                ),
                referenced: Boolean(record.referencedBySalesOutbound),
              },
            ],
          }),
        ),
    },
    {
      title: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
      dataIndex: 'purchaseOrderNo',
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
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
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
      width: 140,
      align: 'right',
      type: 'weight',
      render: (value, record) => {
        const fmt = (v: unknown) => {
          const n = Number(v)
          return Number.isFinite(n)
            ? n.toFixed(DISPLAY_WEIGHT_PRECISION).replace(/\.?0+$/, '')
            : '-'
        }
        const hasOverwritten = (record.items || []).some(
          (item: Record<string, unknown>) =>
            item.originalWeightTon != null &&
            Number(item.originalWeightTon) !== Number(item.weightTon),
        )
        if (!hasOverwritten) return fmt(value)
        const original = (record.items as Record<string, unknown>[]).reduce(
          (sum, item) => sum + Number(item.originalWeightTon || 0),
          0,
        )
        return React.createElement(
          Tooltip,
          {
            title: `原始计划 ${fmt(original)} 吨`,
          },
          `${fmt(value)} ⚠️`,
        )
      },
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
  defaultHiddenColumnKeys: ['salesName', 'remark'],
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
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
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
      key: 'customerId',
      label: i18next.t('modules.pages.salesOrder.colCustomerName'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      row: 1,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.salesOrder.colProjectName'),
      type: 'select',
      required: true,
      options: getCustomerProjectOptions,
      row: 1,
    },
    {
      key: 'deliveryDate',
      label: i18next.t('modules.pages.salesOrder.colDeliveryDate'),
      type: 'date',
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
      row: 2,
    },
    {
      key: 'salesName',
      label: i18next.t('modules.pages.salesOrder.colSalesName'),
      type: 'input',
      required: true,
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
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: i18next.t('modules.pages.salesOrder.parentImportLabel'),
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.salesOrder.parentImportButton'),
    allowMultipleSelection: true,
    remainingQuantityKey: 'remainingQuantity',
    candidateQueryType: 'sales-order-purchase-source',
    useCandidateSnapshot: true,
    buildParentFilters: (currentRecord) => ({
      currentSalesOrderId: currentRecord.id,
    }),
    hiddenSelectorColumnKeys: ['status'],
    mapParentToDraft: (parentRecord) => ({
      purchaseOrderNo:
        parentRecord.purchaseOrderNo || parentRecord.orderNo || '',
      purchaseInboundNo: [
        ...new Set(
          (Array.isArray(parentRecord.items) ? parentRecord.items : []).flatMap(
            (item) => {
              const value =
                typeof item.inboundNo === 'string' ? item.inboundNo.trim() : ''
              return value ? [value] : []
            },
          ),
        ),
      ].join(', '),
    }),
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items)
          ? parentRecord.items.map((item) => {
              const rawRemainingQuantity = Number(
                item.remainingQuantity ??
                  item.salesRemainingQuantity ??
                  item.quantity ??
                  0,
              )
              const rawTotalQuantity = Number(item.quantity || 0)
              const rawTotalWeightTon = Number(item.weightTon || 0)
              const rawRemainingWeightTon = Number(
                item.salesRemainingWeightTon ?? 0,
              )
              const rawPieceWeightTon = Number(item.pieceWeightTon || 0)
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
                  ? Number(
                      rawRemainingWeightTon.toFixed(INTERNAL_WEIGHT_PRECISION),
                    )
                  : rawTotalQuantity > 0 &&
                      rawTotalWeightTon > 0 &&
                      remainingQuantity === rawTotalQuantity
                    ? Number(
                        rawTotalWeightTon.toFixed(INTERNAL_WEIGHT_PRECISION),
                      )
                    : Number(
                        (remainingQuantity * pieceWeightTon).toFixed(
                          INTERNAL_WEIGHT_PRECISION,
                        ),
                      )
              return {
                ...item,
                sourceInboundItemId: item.sourceInboundItemId ?? item.id,
                sourcePurchaseOrderItemId: undefined,
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
  ...salesOrderItemColumnOutputs,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
