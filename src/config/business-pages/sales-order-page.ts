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
  title: '销售订单',
  kicker: 'Sales',
  description:
    '销售订单围绕客户、项目和商品明细展开，页面默认展示完整业务字段，保持录入和查看口径一致。',
  primaryNoKey: 'orderNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: '输入销售订单号',
      clientSearchKeys: ['orderNo'],
    },
    {
      key: 'productKeyword',
      label: '商品信息',
      type: 'input',
      placeholder: '输入商品编码、名称或规格',
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
    { key: 'deliveryDate', label: '送货日期', type: 'dateRange' },
    {
      key: 'customerName',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: getCustomerOptions,
      row: 2,
    },
    {
      key: 'projectName',
      label: '项目名称',
      type: 'select',
      options: getCustomerProjectOptions,
      row: 2,
    },
  ],
  columns: [
    { title: '关联采购订单', dataIndex: 'purchaseOrderNo', width: 180 },
    { title: '订单编号', dataIndex: 'orderNo', width: 160 },
    { title: '项目名称', dataIndex: 'projectName', width: 180 },
    { title: '客户名称', dataIndex: 'customerName', width: 140 },
    { title: '销售员', dataIndex: 'salesName', width: 110 },
    {
      title: '送货日期',
      dataIndex: 'deliveryDate',
      width: 120,
      type: 'date',
    },
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
  detailFields: [
    { label: '客户名称', key: 'customerName', row: 1 },
    { label: '订单编号', key: 'orderNo', row: 1 },
    { label: '关联采购订单', key: 'purchaseOrderNo', row: 1 },
    { label: '销售员', key: 'salesName', row: 1 },
    { label: '项目名称', key: 'projectName', row: 2 },
    { label: '送货日期', key: 'deliveryDate', type: 'date', row: 2 },
    { label: '总重量（吨）', key: 'totalWeight', type: 'weight', row: 2 },
    { label: '总金额', key: 'totalAmount', type: 'amount', row: 2 },
    { label: '状态', key: 'status', type: 'status', row: 3 },
    { label: '备注', key: 'remark', row: 3, fullRow: true },
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
      key: 'purchaseOrderNo',
      label: '关联采购订单',
      type: 'input',
      disabled: true,
      placeholder: '通过采购订单导入，可追加多个单号',
      row: 1,
    },
    {
      key: 'salesName',
      label: '销售员',
      type: 'input',
      required: true,
      disabled: true,
      row: 1,
    },
    {
      key: 'customerName',
      label: '客户名称',
      type: 'select',
      required: true,
      options: getCustomerOptions,
      row: 2,
    },
    {
      key: 'projectName',
      label: '项目名称',
      type: 'select',
      required: true,
      options: getCustomerProjectOptions,
      row: 2,
    },
    {
      key: 'deliveryDate',
      label: '送货日期',
      type: 'date',
      required: true,
      row: 2,
    },
    { key: 'remark', label: '备注', type: 'input', row: 3, colSpan: 12 },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: '上级采购订单',
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: '导入采购订单明细',
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
