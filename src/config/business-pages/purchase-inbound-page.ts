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
  title: '采购入库',
  kicker: 'Purchase',
  description:
    '采购入库页面承接采购订单，明细行展示码头、批号、结算方式、重量（吨）和金额，适合作为后续库存和供应商对账入口。',
  primaryNoKey: 'inboundNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: INBOUND_NO_FILTER_LABEL,
      type: 'input',
      placeholder: '输入采购入库单号',
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
    { key: 'inboundDate', label: '入库日期', type: 'dateRange' },
  ],
  columns: [
    { title: '入库单号', dataIndex: 'inboundNo', width: 160 },
    { title: '关联订单', dataIndex: 'purchaseOrderNo', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 140 },
    { title: '入库日期', dataIndex: 'inboundDate', width: 120, type: 'date' },
    {
      title: '总重量（吨）',
      dataIndex: 'totalWeight',
      width: 116,
      align: 'right',
      type: 'weight',
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    { title: '备注', dataIndex: 'remark', width: 180 },
  ],
  defaultHiddenColumnKeys: ['remark'],
  detailFields: [
    { label: '入库单号', key: 'inboundNo', row: 1 },
    { label: '关联订单', key: 'purchaseOrderNo', row: 1 },
    { label: '供应商', key: 'supplierName', row: 1 },
    { label: '入库日期', key: 'inboundDate', type: 'date', row: 1 },
    { label: '总重量（吨）', key: 'totalWeight', type: 'weight', row: 2 },
    { label: '总金额', key: 'totalAmount', type: 'amount', row: 2 },
    { label: '状态', key: 'status', type: 'status', row: 2 },
    { label: '备注', key: 'remark', row: 2 },
  ],
  formFields: [
    {
      key: 'orderNo',
      label: '订单编号',
      type: 'input',
      disabled: true,
      row: 1,
    },
    {
      key: 'purchaseOrderNo',
      label: '关联采购订单',
      type: 'input',
      disabled: true,
      placeholder: '通过上级单据导入',
      row: 1,
    },
    {
      key: 'inboundDate',
      label: '订单日期',
      type: 'date',
      required: true,
      row: 1,
    },
    {
      key: 'buyerName',
      label: '采购员',
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'supplierName',
      label: '供应商',
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 2,
    },
    {
      key: 'totalWeight',
      label: '合计重量',
      type: 'input',
      disabled: true,
      row: 2,
    },
    {
      key: 'totalAmount',
      label: '合计金额',
      type: 'input',
      disabled: true,
      row: 2,
    },
    { key: 'remark', label: '备注', type: 'input', row: 2, colSpan: 6 },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: '上级采购订单',
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: '导入采购订单明细',
    mapParentToDraft: (parentRecord) => ({
      orderNo: parentRecord.orderNo || '',
      buyerName: parentRecord.buyerName || '',
      supplierName: parentRecord.supplierName || '',
    }),
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items)
          ? parentRecord.items.map((item) => ({
              ...item,
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
