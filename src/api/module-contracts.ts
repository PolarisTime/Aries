export type QueryValue = string | number | boolean | string[] | undefined

export interface ModuleEndpointConfig {
  path: string
  readOnly?: boolean
  nativeFilterKeys?: string[]
  dateRangeMapping?: Record<string, { startKey: string; endKey: string }>
}

export const moduleEndpointContracts: Record<string, ModuleEndpointConfig> = {
  materials: {
    path: '/materials',
    nativeFilterKeys: ['keyword', 'category', 'material'],
  },
  suppliers: { path: '/suppliers', nativeFilterKeys: ['keyword', 'status'] },
  customers: { path: '/customers', nativeFilterKeys: ['keyword', 'status'] },
  carriers: { path: '/carriers', nativeFilterKeys: ['keyword', 'status'] },
  'material-categories': { path: '/material-categories', nativeFilterKeys: ['keyword', 'status'] },
  warehouses: {
    path: '/warehouses',
    nativeFilterKeys: ['keyword', 'warehouseType', 'status'],
  },
  'purchase-orders': {
    path: '/purchase-orders',
    nativeFilterKeys: ['keyword', 'supplierName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      orderDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'purchase-inbounds': {
    path: '/purchase-inbounds',
    nativeFilterKeys: ['keyword', 'supplierName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      inboundDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-orders': {
    path: '/sales-orders',
    nativeFilterKeys: ['keyword', 'customerName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      deliveryDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-outbounds': {
    path: '/sales-outbounds',
    nativeFilterKeys: ['keyword', 'customerName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      outboundDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'freight-bills': {
    path: '/freight-bills',
    nativeFilterKeys: ['keyword', 'carrierName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      billTime: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'purchase-contracts': {
    path: '/purchase-contracts',
    nativeFilterKeys: ['keyword', 'supplierName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      signDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-contracts': {
    path: '/sales-contracts',
    nativeFilterKeys: ['keyword', 'customerName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      signDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'supplier-statements': {
    path: '/supplier-statements',
    nativeFilterKeys: ['keyword', 'supplierName', 'status'],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  'customer-statements': {
    path: '/customer-statements',
    nativeFilterKeys: ['keyword', 'customerName', 'status'],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  'freight-statements': {
    path: '/freight-statements',
    nativeFilterKeys: ['keyword', 'carrierName', 'status', 'signStatus'],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  receipts: {
    path: '/receipts',
    nativeFilterKeys: ['keyword', 'customerName', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      receiptDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  payments: {
    path: '/payments',
    nativeFilterKeys: ['keyword', 'businessType', 'status', 'startDate', 'endDate'],
    dateRangeMapping: {
      paymentDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'invoice-receipts': {
    path: '/invoice-receipts',
    nativeFilterKeys: [
      'keyword',
      'supplierName',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      invoiceDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'invoice-issues': {
    path: '/invoice-issues',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      invoiceDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'pending-invoice-receipt-report': {
    path: '/pending-invoice-receipt-report',
    readOnly: true,
    nativeFilterKeys: ['keyword', 'supplierName', 'startDate', 'endDate'],
    dateRangeMapping: {
      orderDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'general-settings': {
    path: '/general-settings',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'company-settings': {
    path: '/company-settings',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'operation-logs': {
    path: '/operation-logs',
    readOnly: true,
    nativeFilterKeys: [
      'keyword',
      'moduleName',
      'actionType',
      'resultStatus',
      'startTime',
      'endTime',
    ],
    dateRangeMapping: {
      operationTime: {
        startKey: 'startTime',
        endKey: 'endTime',
      },
    },
  },
  'permission-management': {
    path: '/permission-management',
    readOnly: true,
    nativeFilterKeys: ['keyword'],
  },
  departments: {
    path: '/departments',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'user-accounts': {
    path: '/user-accounts',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'role-settings': {
    path: '/role-settings',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'inventory-report': {
    path: '/inventory-report',
    readOnly: true,
    nativeFilterKeys: ['keyword', 'warehouseName', 'category'],
  },
  'io-report': {
    path: '/io-report',
    readOnly: true,
    nativeFilterKeys: ['keyword', 'businessType', 'startDate', 'endDate'],
    dateRangeMapping: {
      businessDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'receivables-payables': {
    path: '/receivables-payables',
    readOnly: true,
    nativeFilterKeys: ['keyword', 'direction', 'counterpartyType', 'status'],
  },
}

export function getModuleConfig(moduleKey: string) {
  const config = moduleEndpointContracts[moduleKey]
  if (!config) {
    throw new Error(`未配置模块接口: ${moduleKey}`)
  }
  return config
}
