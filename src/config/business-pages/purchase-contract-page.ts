import { asString } from '@/utils/type-narrowing'
import { getSupplierOptions } from '@/constants/module-options'
import dayjs from 'dayjs'
import type { ModulePageConfig } from '@/types/module-page'
import { contractStatusOptions } from './contract-shared'
import {
  BILL_STATUS_LABEL,
  CONTRACT_NO_FILTER_LABEL,
  SUPPLIER_NAME_LABEL,
} from './filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  cloneLineItems,
  compactOrderItemColumns,
  statusMap,
} from './shared'

export const purchaseContractsPageConfig: ModulePageConfig = {
  key: 'purchase-contract',
  title: '采购合同',
  kicker: 'Contracts',
  description:
    '采购合同按供应商、签约日期、执行周期和商品明细统一管理，沿用通用单据页风格并支持后续直接接入真实合同接口。',
  primaryNoKey: 'contractNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: CONTRACT_NO_FILTER_LABEL,
      type: 'input',
      placeholder: '输入采购合同号',
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
      options: contractStatusOptions,
    },
    { key: 'signDate', label: '签订日期', type: 'dateRange' },
  ],
  columns: [
    { title: '合同编号', dataIndex: 'contractNo', width: 170 },
    { title: '关联采购订单', dataIndex: 'sourcePurchaseOrderNos', width: 180 },
    { title: '供应商', dataIndex: 'supplierName', width: 150 },
    { title: '签订日期', dataIndex: 'signDate', width: 120, type: 'date' },
    { title: '生效日期', dataIndex: 'effectiveDate', width: 120, type: 'date' },
    { title: '截止日期', dataIndex: 'expireDate', width: 120, type: 'date' },
    { title: '采购员', dataIndex: 'buyerName', width: 110 },
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
    { label: '合同编号', key: 'contractNo', row: 1 },
    { label: '关联采购订单', key: 'sourcePurchaseOrderNos', row: 1 },
    { label: '供应商', key: 'supplierName', row: 1 },
    { label: '签订日期', key: 'signDate', type: 'date', row: 2 },
    { label: '生效日期', key: 'effectiveDate', type: 'date', row: 2 },
    { label: '截止日期', key: 'expireDate', type: 'date', row: 2 },
    { label: '采购员', key: 'buyerName', row: 3 },
    { label: '状态', key: 'status', type: 'status', row: 3 },
    { label: '总重量（吨）', key: 'totalWeight', type: 'weight', row: 3 },
    { label: '总金额', key: 'totalAmount', type: 'amount', row: 3 },
    { label: '备注', key: 'remark', row: 4, fullRow: true },
  ],
  formFields: [
    {
      key: 'contractNo',
      label: '合同编号',
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'sourcePurchaseOrderNos',
      label: '关联采购订单',
      type: 'input',
      disabled: true,
      placeholder: '通过上级单据导入',
      row: 1,
    },
    {
      key: 'supplierName',
      label: '供应商',
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 1,
    },
    {
      key: 'signDate',
      label: '签订日期',
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'effectiveDate',
      label: '生效日期',
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'expireDate',
      label: '截止日期',
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'buyerName',
      label: '采购员',
      type: 'input',
      required: true,
      disabled: true,
      row: 3,
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '草稿',
      options: contractStatusOptions,
      row: 3,
    },
    { key: 'remark', label: '备注', type: 'textarea', row: 3, fullRow: true },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: '采购订单',
    parentFieldKey: 'sourcePurchaseOrderNos',
    parentDisplayFieldKey: 'orderNo',
    allowMultipleSelection: false,
    buttonText: '导入采购订单明细',
    mapParentToDraft: (parentRecord) => {
      const signDate = parentRecord.orderDate || undefined
      return {
        supplierName: parentRecord.supplierName || '',
        buyerName: parentRecord.buyerName || '',
        signDate,
        effectiveDate: signDate,
        expireDate: signDate ? dayjs(asString(signDate)).add(1, 'year') : undefined,
        status: '已归档',
      }
    },
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items) ? parentRecord.items : [],
        'purchase-contract-item',
      ),
  },
  itemColumns: compactOrderItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
