export interface BusinessRouteManifest {
  path: string
  title: string
  apiPath: string
  supportsDetail: boolean
  searchKeys?: string[]
}

export interface SystemRouteManifest {
  path: string
  title: string
  marker: string
}

export const dashboardRoute = {
  path: '/dashboard',
  title: '工作台',
} as const

export const businessRoutes: BusinessRouteManifest[] = [
  {
    path: '/material',
    title: '商品资料',
    apiPath: 'material',
    supportsDetail: true,
    searchKeys: ['materialCode', 'materialName'],
  },
  {
    path: '/material-categories',
    title: '商品类别',
    apiPath: 'material-categories',
    supportsDetail: true,
    searchKeys: ['categoryCode', 'categoryName'],
  },
  {
    path: '/supplier',
    title: '供应商资料',
    apiPath: 'supplier',
    supportsDetail: true,
    searchKeys: ['supplierCode', 'supplierName'],
  },
  {
    path: '/customer',
    title: '客户资料',
    apiPath: 'customer',
    supportsDetail: true,
    searchKeys: ['customerCode', 'customerName'],
  },
  {
    path: '/carrier',
    title: '物流方资料',
    apiPath: 'carrier',
    supportsDetail: true,
    searchKeys: ['carrierCode', 'carrierName'],
  },
  {
    path: '/warehouse',
    title: '仓库资料',
    apiPath: 'warehouse',
    supportsDetail: true,
    searchKeys: ['warehouseCode', 'warehouseName'],
  },
  {
    path: '/purchase-order',
    title: '采购订单',
    apiPath: 'purchase-order',
    supportsDetail: true,
    searchKeys: ['orderNo'],
  },
  {
    path: '/purchase-inbound',
    title: '采购入库',
    apiPath: 'purchase-inbound',
    supportsDetail: true,
    searchKeys: ['inboundNo'],
  },
  {
    path: '/sales-order',
    title: '销售订单',
    apiPath: 'sales-order',
    supportsDetail: true,
    searchKeys: ['orderNo'],
  },
  {
    path: '/sales-outbound',
    title: '销售出库',
    apiPath: 'sales-outbound',
    supportsDetail: true,
    searchKeys: ['outboundNo'],
  },
  {
    path: '/freight-bill',
    title: '物流单',
    apiPath: 'freight-bill',
    supportsDetail: true,
    searchKeys: ['billNo', 'carrierName'],
  },
  {
    path: '/purchase-contract',
    title: '采购合同',
    apiPath: 'purchase-contracts',
    supportsDetail: true,
    searchKeys: ['contractNo'],
  },
  {
    path: '/sales-contract',
    title: '销售合同',
    apiPath: 'sales-contracts',
    supportsDetail: true,
    searchKeys: ['contractNo'],
  },
  {
    path: '/inventory-report',
    title: '商品库存报表',
    apiPath: 'inventory-report',
    supportsDetail: false,
  },
  {
    path: '/io-report',
    title: '出入库报表',
    apiPath: 'io-report',
    supportsDetail: false,
  },
  {
    path: '/supplier-statement',
    title: '供应商对账单',
    apiPath: 'supplier-statement',
    supportsDetail: true,
    searchKeys: ['statementNo'],
  },
  {
    path: '/customer-statement',
    title: '客户对账单',
    apiPath: 'customer-statement',
    supportsDetail: true,
    searchKeys: ['statementNo'],
  },
  {
    path: '/freight-statement',
    title: '物流对账单',
    apiPath: 'freight-statement',
    supportsDetail: true,
    searchKeys: ['statementNo'],
  },
  {
    path: '/receipt',
    title: '收款单',
    apiPath: 'receipt',
    supportsDetail: true,
    searchKeys: ['receiptNo'],
  },
  {
    path: '/payment',
    title: '付款单',
    apiPath: 'payment',
    supportsDetail: true,
    searchKeys: ['paymentNo'],
  },
  {
    path: '/invoice-receipt',
    title: '收票单',
    apiPath: 'invoice-receipt',
    supportsDetail: true,
    searchKeys: ['receiveNo'],
  },
  {
    path: '/invoice-issue',
    title: '开票单',
    apiPath: 'invoice-issue',
    supportsDetail: true,
    searchKeys: ['issueNo'],
  },
  {
    path: '/pending-invoice-receipt-report',
    title: '未收票报表',
    apiPath: 'pending-invoice-receipt-report',
    supportsDetail: false,
  },
  {
    path: '/ledger-adjustment',
    title: '台账调整单',
    apiPath: 'ledger-adjustment',
    supportsDetail: true,
    searchKeys: ['adjustmentNo'],
  },
  {
    path: '/receivable-payable',
    title: '应收应付',
    apiPath: 'receivable-payable',
    supportsDetail: false,
  },
  {
    path: '/operation-log',
    title: '操作日志',
    apiPath: 'operation-log',
    supportsDetail: false,
  },
  {
    path: '/department',
    title: '部门管理',
    apiPath: 'department',
    supportsDetail: true,
    searchKeys: ['departmentCode', 'departmentName'],
  },
]

export const systemRoutes: SystemRouteManifest[] = [
  { path: '/system-parameters', title: '系统参数', marker: '基础参数' },
  { path: '/general-setting', title: '基础参数', marker: '系统开关' },
  {
    path: '/company-setting',
    title: '结算主体管理',
    marker: '结算主体名称',
  },
  { path: '/number-rules', title: '单号规则', marker: '模块' },
  { path: '/security-center', title: '安全中心', marker: '有效会话' },
  { path: '/access-control', title: '权限管理', marker: '用户账户' },
  {
    path: '/database',
    title: '数据库管理',
    marker: 'PostgreSQL',
  },
  { path: '/session', title: '会话管理', marker: '有效会话' },
  {
    path: '/api-key',
    title: 'API Key 管理',
    marker: '生成 API Key',
  },
  { path: '/security-key', title: '安全密钥管理', marker: 'JWT 主密钥' },
  { path: '/print-template', title: '打印模板', marker: '新建模板' },
]
