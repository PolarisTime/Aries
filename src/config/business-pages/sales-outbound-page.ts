import {
  buildValueOptions,
  getCustomerOptions,
  getCustomerProjectOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  BILL_STATUS_LABEL,
  CUSTOMER_NAME_LABEL,
  OUTBOUND_NO_FILTER_LABEL,
} from './filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  cloneLineItems,
  compactPurchaseItemColumns,
  statusMap,
} from './shared'

export const salesOutboundsPageConfig: ModulePageConfig = {
  key: 'sales-outbound',
  title: '销售出库',
  kicker: 'Sales',
  description:
    '销售出库页承担发货和库存扣减，单据审核后会驱动关联销售订单进入完成销售，物流单和客户对账继续沿此单据下游流转。',
  primaryNoKey: 'outboundNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: OUTBOUND_NO_FILTER_LABEL,
      type: 'input',
      placeholder: '输入销售出库单号',
      clientSearchKeys: ['outboundNo'],
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
      options: buildValueOptions('草稿', '已审核'),
    },
    { key: 'outboundDate', label: '出库日期', type: 'dateRange' },
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
    { title: '出库单号', dataIndex: 'outboundNo', width: 160 },
    { title: '关联订单', dataIndex: 'salesOrderNo', width: 160 },
    { title: '客户名称', dataIndex: 'customerName', width: 140 },
    { title: '项目名称', dataIndex: 'projectName', width: 180 },
    {
      title: '出库日期',
      dataIndex: 'outboundDate',
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
  defaultHiddenColumnKeys: ['projectName', 'remark'],
  detailFields: [
    { label: '出库单号', key: 'outboundNo', row: 1 },
    { label: '关联订单', key: 'salesOrderNo', row: 1 },
    { label: '客户名称', key: 'customerName', row: 1 },
    { label: '项目名称', key: 'projectName', row: 1 },
    { label: '出库日期', key: 'outboundDate', type: 'date', row: 2 },
    { label: '总重量（吨）', key: 'totalWeight', type: 'weight', row: 2 },
    { label: '总金额', key: 'totalAmount', type: 'amount', row: 2 },
    { label: '状态', key: 'status', type: 'status', row: 2 },
    { label: '备注', key: 'remark', row: 3 },
  ],
  formFields: [
    {
      key: 'outboundNo',
      label: '出库单号',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'salesOrderNo',
      label: '关联订单',
      type: 'input',
      disabled: true,
      placeholder: '通过上级单据导入',
      row: 1,
    },
    {
      key: 'customerName',
      label: '客户名称',
      type: 'select',
      required: true,
      options: getCustomerOptions,
      row: 1,
    },
    {
      key: 'projectName',
      label: '项目名称',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'outboundDate',
      label: '出库日期',
      type: 'date',
      required: true,
      row: 2,
    },
    { key: 'remark', label: '备注', type: 'input', row: 2 },
  ],
  parentImport: {
    parentModuleKey: 'sales-order',
    label: '上级销售订单',
    parentFieldKey: 'salesOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: '导入销售订单明细',
    enforceUniqueRelation: true,
    mapParentToDraft: (parentRecord) => ({
      customerName: parentRecord.customerName || '',
      projectName: parentRecord.projectName || '',
    }),
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items)
          ? parentRecord.items.map((item) => ({
              ...item,
              sourceNo: parentRecord.orderNo || '',
              sourceSalesOrderItemId: item.id,
            }))
          : [],
        'sales-outbound-item',
      ),
  },
  itemColumns: compactPurchaseItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
