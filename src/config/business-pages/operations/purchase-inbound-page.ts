import i18next from 'i18next'
import {
  buildDocumentStatusOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
  isPurchaseWeighRequiredCategory,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import {
  BILL_STATUS_LABEL,
  INBOUND_NO_FILTER_LABEL,
  SUPPLIER_NAME_LABEL,
} from '../shared/filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  compactPurchaseInboundItemColumns,
  statusMap,
} from '../shared/shared'

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
      placeholder: i18next.t(
        'modules.pages.purchaseInbound.placeholderInboundNo',
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
      label: '结算主体',
      type: 'select',
      options: getSettlementCompanyOptions,
      row: 2,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: buildDocumentStatusOptions('草稿', '已审核', '完成入库'),
    },
    {
      key: 'inboundDate',
      label: i18next.t('modules.pages.purchaseInbound.filterInboundDate'),
      type: 'dateRange',
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.purchaseInbound.colInboundNo'),
      dataIndex: 'inboundNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.purchaseInbound.colPurchaseOrderNo'),
      dataIndex: 'purchaseOrderNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.purchaseInbound.colSupplier'),
      dataIndex: 'supplierName',
      width: 140,
    },
    {
      title: '结算主体',
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.purchaseInbound.colInboundDate'),
      dataIndex: 'inboundDate',
      width: 120,
      type: 'date',
    },
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
    {
      title: i18next.t('modules.columns.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: [
    'settlementCompanyName',
    'totalWeightAdjustmentTon',
    'remark',
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.purchaseInbound.colInboundNo'),
      key: 'inboundNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseInbound.colPurchaseOrderNo'),
      key: 'purchaseOrderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseInbound.colSupplier'),
      key: 'supplierName',
      row: 1,
    },
    {
      label: '结算主体',
      key: 'settlementCompanyName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseInbound.colInboundDate'),
      key: 'inboundDate',
      type: 'date',
      row: 1,
    },
    {
      label: i18next.t('modules.columns.totalWeight'),
      key: 'totalWeight',
      type: 'weight',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.purchaseInbound.colTotalWeighWeight'),
      key: 'totalWeighWeightTon',
      type: 'weight',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.purchaseInbound.colWeightAdjustment'),
      key: 'totalWeightAdjustmentTon',
      type: 'weight',
      row: 3,
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
      placeholder: i18next.t(
        'modules.pages.purchaseInbound.placeholderParentImport',
      ),
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
      key: 'supplierId',
      label: i18next.t('modules.pages.purchaseInbound.colSupplier'),
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 2,
    },
    {
      key: 'settlementCompanyId',
      label: '结算主体',
      type: 'select',
      options: getSettlementCompanyOptions,
      disabled: true,
      row: 2,
    },
    {
      key: 'warehouseName',
      label: '仓库',
      type: 'input',
      disabled: true,
      row: 2,
    },
    {
      key: 'settlementMode',
      label: '结算方式',
      type: 'input',
      disabled: true,
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
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'input',
      row: 3,
      colSpan: 6,
    },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: i18next.t('modules.pages.purchaseInbound.parentImportLabel'),
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.purchaseInbound.parentImportButton'),
    candidateQueryType: 'purchase-order-import',
    allowMultipleSelection: false,
    remainingQuantityKey: 'remainingQuantity',
    buildParentFilters: (currentRecord) => ({
      supplierId: currentRecord.supplierId,
      currentRecordId: currentRecord.id,
    }),
    hiddenSelectorColumnKeys: ['status'],
    mapParentToDraft: (parentRecord) => {
      const sourceItems = Array.isArray(parentRecord.items)
        ? parentRecord.items
        : []
      const firstItem = sourceItems[0]
      return {
        purchaseOrderNo: parentRecord.orderNo || '',
        supplierId: parentRecord.supplierId,
        supplierCode: parentRecord.supplierCode || '',
        supplierName: parentRecord.supplierName || '',
        settlementCompanyId: parentRecord.settlementCompanyId,
        settlementCompanyName: parentRecord.settlementCompanyName || '',
        warehouseId: firstItem?.warehouseId,
        warehouseName: firstItem?.warehouseName || '',
        settlementMode: isPurchaseWeighRequiredCategory(firstItem?.category)
          ? '过磅'
          : '理算',
      }
    },
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items)
          ? parentRecord.items.map((item) => {
              const quantity = Number(
                item.remainingQuantity ?? item.quantity ?? 0,
              )
              const pieceWeightTon = Number(item.pieceWeightTon || 0)
              const unitPrice = Number(item.unitPrice || 0)
              const weightTon = Number((quantity * pieceWeightTon).toFixed(8))
              return {
                ...item,
                sourceNo: parentRecord.orderNo || '',
                sourcePurchaseOrderItemId: item.id,
                settlementMode: isPurchaseWeighRequiredCategory(item.category)
                  ? '过磅'
                  : '理算',
                quantity,
                weightTon,
                weighWeightTon: undefined,
                weightAdjustmentTon: 0,
                weightAdjustmentAmount: 0,
                amount: Number((weightTon * unitPrice).toFixed(2)),
              }
            })
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
