import {
  buildValueOptions,
  getSupplierOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  ORDER_NO_FILTER_LABEL,
  SUPPLIER_NAME_LABEL,
} from './filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  compactPurchaseItemColumns,
  statusMap,
} from './shared'

export const purchaseOrdersPageConfig: ModulePageConfig = {
  key: 'purchase-order',
  title: '采购订单',
  kicker: 'Purchase',
  description:
    '采购订单按文档字段展示，先交付标准列表、筛选、概览和明细，页面数据通过 RESTful API 返回。',
  primaryNoKey: 'orderNo',
  hidePageHeader: true,
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: '输入采购订单号',
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
      options: buildValueOptions('草稿', '已审核', '完成采购'),
    },
    { key: 'orderDate', label: '订单日期', type: 'dateRange' },
  ],
  columns: [
    { title: '订单编号', dataIndex: 'orderNo', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 140 },
    { title: '采购员', dataIndex: 'buyerName', width: 110 },
    { title: '订单日期', dataIndex: 'orderDate', width: 120, type: 'date' },
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
    { title: '备注', dataIndex: 'remark', width: 120 },
  ],
  detailFields: [
    { label: '供应商', key: 'supplierName', row: 1 },
    { label: '订单编号', key: 'orderNo', row: 1 },
    { label: '订单日期', key: 'orderDate', type: 'date', row: 1 },
    { label: '采购员', key: 'buyerName', row: 2 },
    { label: '总重量（吨）', key: 'totalWeight', type: 'weight', row: 2 },
    { label: '总金额', key: 'totalAmount', type: 'amount', row: 2 },
    { label: '状态', key: 'status', type: 'status', row: 2 },
    { label: '备注', key: 'remark', row: 3 },
  ],
  formFields: [
    {
      key: 'orderNo',
      label: '订单编号',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'orderDate',
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
  itemColumns: compactPurchaseItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
