import type { ModuleFilterDefinition } from '@/types/module-page'

export interface ModuleSaveFieldSchema {
  scalar?: string[]
  lineItem?: string[]
  computed?: string[]
}

export interface ModulePageSchema {
  filters?: ModuleFilterDefinition[]
  saveFields?: ModuleSaveFieldSchema
}

const productKeywordFilter: ModuleFilterDefinition = {
  key: 'productKeyword',
  label: '商品信息',
  type: 'input',
  clientSearchLineItemKeys: [
    'materialCode',
    'materialName',
    'material',
    'spec',
  ],
}

export const modulePageSchemaMap: Record<string, ModulePageSchema> = {
  'purchase-order': {
    filters: [
      {
        key: 'keyword',
        label: '订单编号',
        type: 'input',
      },
      {
        key: 'supplierName',
        label: '供应商名称',
        type: 'select',
      },
      {
        key: 'status',
        label: '单据状态',
        type: 'select',
      },
      { key: 'orderDate', label: '订单日期', type: 'dateRange' },
    ],
  },
  'purchase-inbound': {
    filters: [
      {
        key: 'keyword',
        label: '入库单号',
        type: 'input',
      },
      {
        key: 'supplierName',
        label: '供应商名称',
        type: 'select',
      },
      {
        key: 'status',
        label: '单据状态',
        type: 'select',
      },
      { key: 'inboundDate', label: '入库日期', type: 'dateRange' },
    ],
  },
  'sales-order': {
    filters: [
      {
        key: 'keyword',
        label: '订单编号',
        type: 'input',
        clientSearchKeys: ['orderNo'],
      },
      productKeywordFilter,
      { key: 'status', label: '单据状态', type: 'select' },
      { key: 'deliveryDate', label: '送货日期', type: 'dateRange' },
      { key: 'customerName', label: '客户名称', type: 'select' },
      { key: 'projectName', label: '项目名称', type: 'select' },
    ],
  },
  'sales-outbound': {
    filters: [
      {
        key: 'keyword',
        label: '出库单号',
        type: 'input',
        clientSearchKeys: ['outboundNo'],
      },
      productKeywordFilter,
      { key: 'status', label: '单据状态', type: 'select' },
      { key: 'outboundDate', label: '出库日期', type: 'dateRange' },
      { key: 'customerName', label: '客户名称', type: 'select' },
      { key: 'projectName', label: '项目名称', type: 'select' },
    ],
    saveFields: {
      scalar: [
        'outboundNo',
        'salesOrderNo',
        'customerName',
        'projectName',
        'warehouseName',
        'outboundDate',
        'status',
        'remark',
      ],
      lineItem: [
        'sourceNo',
        'sourceSalesOrderItemId',
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'warehouseName',
        'batchNo',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'unitPrice',
        'amount',
      ],
    },
  },
  receipt: {
    saveFields: {
      scalar: [
        'receiptNo',
        'customerName',
        'projectName',
        'sourceStatementId',
        'receiptDate',
        'payType',
        'amount',
        'status',
        'operatorName',
        'remark',
      ],
    },
  },
  payment: {
    saveFields: {
      scalar: [
        'paymentNo',
        'businessType',
        'counterpartyName',
        'sourceStatementId',
        'paymentDate',
        'payType',
        'amount',
        'status',
        'operatorName',
        'remark',
      ],
    },
  },
  'supplier-statement': {
    saveFields: {
      scalar: [
        'statementNo',
        'sourceInboundNos',
        'supplierName',
        'startDate',
        'endDate',
        'purchaseAmount',
        'paymentAmount',
        'closingAmount',
        'status',
        'remark',
      ],
      lineItem: [
        'sourceNo',
        'sourceInboundItemId',
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'batchNo',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'weighWeightTon',
        'weightAdjustmentTon',
        'weightAdjustmentAmount',
        'unitPrice',
        'amount',
      ],
    },
  },
  'customer-statement': {
    saveFields: {
      scalar: [
        'statementNo',
        'sourceOrderNos',
        'customerName',
        'projectName',
        'startDate',
        'endDate',
        'salesAmount',
        'receiptAmount',
        'closingAmount',
        'status',
        'remark',
      ],
      lineItem: [
        'sourceNo',
        'sourceSalesOrderItemId',
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'batchNo',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'unitPrice',
        'amount',
      ],
    },
  },
  'purchase-contract': {
    saveFields: {
      scalar: [
        'contractNo',
        'supplierName',
        'sourcePurchaseOrderNos',
        'signDate',
        'effectiveDate',
        'expireDate',
        'buyerName',
        'status',
        'remark',
      ],
      lineItem: [
        'materialCode',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'unit',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'weightTon',
        'unitPrice',
        'amount',
      ],
    },
  },
  'freight-statement': {
    saveFields: {
      scalar: [
        'statementNo',
        'sourceBillNos',
        'carrierName',
        'startDate',
        'endDate',
        'totalWeight',
        'totalFreight',
        'paidAmount',
        'unpaidAmount',
        'status',
        'signStatus',
        'attachment',
        'remark',
      ],
      lineItem: [
        'sourceNo',
        'customerName',
        'projectName',
        'materialCode',
        'materialName',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'batchNo',
        'weightTon',
        'warehouseName',
      ],
    },
  },
  'invoice-receipt': {
    saveFields: {
      scalar: [
        'receiveNo',
        'invoiceNo',
        'sourcePurchaseOrderNos',
        'supplierName',
        'invoiceTitle',
        'invoiceDate',
        'invoiceType',
        'amount',
        'taxRate',
        'taxAmount',
        'status',
        'operatorName',
        'remark',
      ],
    },
  },
  'invoice-issue': {
    saveFields: {
      scalar: [
        'issueNo',
        'invoiceNo',
        'sourceSalesOrderNos',
        'customerName',
        'projectName',
        'invoiceDate',
        'invoiceType',
        'targetAmount',
        'amount',
        'taxRate',
        'taxAmount',
        'status',
        'operatorName',
        'remark',
      ],
    },
  },
}

export function getModulePageSchema(moduleKey: string) {
  return modulePageSchemaMap[moduleKey]
}
