import dayjs from 'dayjs'
import i18next from 'i18next'
import {
  createPurchaseInboundImportBatch,
  previewPurchaseInboundSplit,
} from '@/api/document-flow-commands'
import {
  buildValueOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
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
      options: buildValueOptions('草稿', '已审核', '完成入库'),
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
    candidateUsage: 'purchase-inbound',
    allowMultipleSelection: false,
    buildParentFilters: (currentRecord) => ({
      supplierId: currentRecord.supplierId,
      currentRecordId: currentRecord.id,
    }),
    hiddenSelectorColumnKeys: ['status'],
    executeParentImport: async ({ currentRecord, parentRecord }) => {
      const sourcePurchaseOrderId = asString(parentRecord.id).trim()
      if (!sourcePurchaseOrderId) {
        throw new Error('采购订单缺少稳定ID，无法导入')
      }
      const previewResult = await previewPurchaseInboundSplit(
        sourcePurchaseOrderId,
      )
      const preview = previewResult.data
      if (!preview?.importAllowed) {
        throw new Error(
          preview?.blockingReason || '采购订单当前不能导入采购入库',
        )
      }
      const groupSummary = preview.groups
        .map(
          (group) =>
            `${group.warehouseName} / ${group.settlementMode}：${group.items.length} 行、${group.totalQuantity} 件`,
        )
        .join('；')
      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: `确认生成 ${preview.expectedDraftCount} 张采购入库草稿`,
          content: groupSummary,
          okText: '生成草稿',
          cancelText: '取消',
          maskClosable: false,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        })
      })
      if (!confirmed) {
        return { cancelled: true }
      }
      const inboundDateValue = currentRecord.inboundDate
      const inboundDate = dayjs.isDayjs(inboundDateValue)
        ? inboundDateValue.format('YYYY-MM-DD')
        : dayjs(asString(inboundDateValue)).isValid()
          ? dayjs(asString(inboundDateValue)).format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD')
      const batchResult = await createPurchaseInboundImportBatch(
        sourcePurchaseOrderId,
        {
          inboundDate,
          remark: asString(currentRecord.remark).trim() || undefined,
        },
      )
      const batch = batchResult.data
      if (!batch) {
        throw new Error('采购入库拆分草稿创建成功但未返回批次结果')
      }
      return {
        message: `批次 ${batch.batchNo} 已生成 ${batch.inbounds.length} 张采购入库草稿`,
      }
    },
  },
  itemColumns: compactPurchaseInboundItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
