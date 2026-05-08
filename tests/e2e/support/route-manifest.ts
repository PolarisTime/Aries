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

export const businessRoutes: BusinessRouteManifest[] = [
  { path: '/materials', title: '商品资料', apiPath: 'materials', supportsDetail: true, searchKeys: ['materialCode', 'materialName'] },
  { path: '/material-categories', title: '商品类别', apiPath: 'material-categories', supportsDetail: true, searchKeys: ['categoryCode', 'categoryName'] },
  { path: '/suppliers', title: '供应商资料', apiPath: 'suppliers', supportsDetail: true, searchKeys: ['supplierCode', 'supplierName'] },
  { path: '/customers', title: '客户资料', apiPath: 'customers', supportsDetail: true, searchKeys: ['customerCode', 'customerName'] },
  { path: '/carriers', title: '物流方资料', apiPath: 'carriers', supportsDetail: true, searchKeys: ['carrierCode', 'carrierName'] },
  { path: '/warehouses', title: '仓库资料', apiPath: 'warehouses', supportsDetail: true, searchKeys: ['warehouseCode', 'warehouseName'] },
  { path: '/purchase-orders', title: '采购订单', apiPath: 'purchase-orders', supportsDetail: true, searchKeys: ['orderNo'] },
  { path: '/purchase-inbounds', title: '采购入库', apiPath: 'purchase-inbounds', supportsDetail: true, searchKeys: ['inboundNo'] },
  { path: '/sales-orders', title: '销售订单', apiPath: 'sales-orders', supportsDetail: true, searchKeys: ['orderNo'] },
  { path: '/sales-outbounds', title: '销售出库', apiPath: 'sales-outbounds', supportsDetail: true, searchKeys: ['outboundNo'] },
  { path: '/freight-bills', title: '物流单', apiPath: 'freight-bills', supportsDetail: true, searchKeys: ['billNo', 'carrierName'] },
  { path: '/purchase-contracts', title: '采购合同', apiPath: 'purchase-contracts', supportsDetail: true, searchKeys: ['contractNo'] },
  { path: '/sales-contracts', title: '销售合同', apiPath: 'sales-contracts', supportsDetail: true, searchKeys: ['contractNo'] },
  { path: '/inventory-report', title: '商品库存报表', apiPath: 'inventory-report', supportsDetail: false },
  { path: '/io-report', title: '出入库报表', apiPath: 'io-report', supportsDetail: false },
  { path: '/supplier-statements', title: '供应商对账单', apiPath: 'supplier-statements', supportsDetail: true, searchKeys: ['statementNo'] },
  { path: '/customer-statements', title: '客户对账单', apiPath: 'customer-statements', supportsDetail: true, searchKeys: ['statementNo'] },
  { path: '/freight-statements', title: '物流对账单', apiPath: 'freight-statements', supportsDetail: true, searchKeys: ['statementNo'] },
  { path: '/receipts', title: '收款单', apiPath: 'receipts', supportsDetail: true, searchKeys: ['receiptNo'] },
  { path: '/payments', title: '付款单', apiPath: 'payments', supportsDetail: true, searchKeys: ['paymentNo'] },
  { path: '/invoice-receipts', title: '收票单', apiPath: 'invoice-receipts', supportsDetail: true, searchKeys: ['receiveNo'] },
  { path: '/invoice-issues', title: '开票单', apiPath: 'invoice-issues', supportsDetail: true, searchKeys: ['issueNo'] },
  { path: '/pending-invoice-receipt-report', title: '未收票报表', apiPath: 'pending-invoice-receipt-report', supportsDetail: false },
  { path: '/receivables-payables', title: '应收应付', apiPath: 'receivables-payables', supportsDetail: false },
  { path: '/operation-logs', title: '操作日志', apiPath: 'operation-logs', supportsDetail: false },
  { path: '/departments', title: '部门管理', apiPath: 'departments', supportsDetail: true, searchKeys: ['departmentCode', 'departmentName'] },
  { path: '/permission-management', title: '权限管理', apiPath: 'permission-management', supportsDetail: false },
]

export const systemRoutes: SystemRouteManifest[] = [
  { path: '/general-settings', title: '通用设置', marker: '系统开关' },
  { path: '/company-settings', title: '公司信息', marker: '公司名称' },
  { path: '/number-rules', title: '单号规则', marker: '模块' },
  { path: '/user-accounts', title: '用户', marker: '账户管理' },
  { path: '/role-action-editor', title: '角色列表', marker: '请选择角色' },
  { path: '/role-settings', title: '角色列表', marker: '请选择角色' },
  { path: '/database-management', title: '数据库状态', marker: '数据库备份管理' },
  { path: '/session-management', title: '会话管理', marker: '登录名' },
  { path: '/api-key-management', title: 'API Key 管理', marker: '生成 API Key' },
  { path: '/security-keys', title: '安全密钥管理', marker: 'JWT 密钥最后轮换' },
  { path: '/print-templates', title: '打印模板', marker: '新建模板' },
]
