export interface BusinessRouteManifest {
  path: string
  title: string
  apiPath: string
  moduleKey: string
  view: 'business-grid' | 'master' | 'custom'
  supportsDetail: boolean
  searchKeys?: string[]
}

export interface PlainRouteManifest {
  path: string
  title: string
}

export const dashboardRoute = {
  path: '/dashboard',
  title: '工作台',
} as const

/**
 * 当前应用真实存在的业务模块路由（全部为单数路径）。
 * 仅登记仍挂在 page-registry 上的页面，退役模块不得再出现。
 */
export const businessRoutes: BusinessRouteManifest[] = [
  {
    path: '/material',
    title: '商品资料',
    apiPath: 'material',
    moduleKey: 'material',
    view: 'master',
    supportsDetail: true,
    searchKeys: ['materialCode', 'material'],
  },
  {
    path: '/material-categories',
    title: '商品类别',
    apiPath: 'material-categories',
    moduleKey: 'material-categories',
    view: 'master',
    supportsDetail: true,
    searchKeys: ['categoryCode', 'categoryName'],
  },
  {
    path: '/supplier',
    title: '供应商资料',
    apiPath: 'supplier',
    moduleKey: 'supplier',
    view: 'master',
    supportsDetail: true,
    searchKeys: ['supplierCode', 'supplierName'],
  },
  {
    path: '/customer',
    title: '客户资料',
    apiPath: 'customer',
    moduleKey: 'customer',
    view: 'master',
    supportsDetail: true,
    searchKeys: ['customerCode', 'customerName'],
  },
  {
    path: '/project',
    title: '项目资料',
    apiPath: 'project',
    moduleKey: 'project',
    view: 'master',
    supportsDetail: true,
    searchKeys: ['projectCode', 'projectName'],
  },
  {
    path: '/carrier',
    title: '物流方资料',
    apiPath: 'carrier',
    moduleKey: 'carrier',
    view: 'master',
    supportsDetail: true,
    searchKeys: ['carrierCode', 'carrierName'],
  },
  {
    path: '/warehouse',
    title: '仓库资料',
    apiPath: 'warehouse',
    moduleKey: 'warehouse',
    view: 'master',
    supportsDetail: true,
    searchKeys: ['warehouseCode', 'warehouseName'],
  },
  {
    path: '/company-setting',
    title: '结算主体管理',
    apiPath: 'company-setting',
    moduleKey: 'company-setting',
    view: 'custom',
    supportsDetail: false,
  },
  {
    path: '/purchase-order',
    title: '采购订单',
    apiPath: 'purchase-order',
    moduleKey: 'purchase-order',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['orderNo'],
  },
  {
    path: '/purchase-inbound',
    title: '采购入库',
    apiPath: 'purchase-inbound',
    moduleKey: 'purchase-inbound',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['inboundNo'],
  },
  {
    path: '/sales-order',
    title: '销售订单',
    apiPath: 'sales-order',
    moduleKey: 'sales-order',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['orderNo'],
  },
  {
    path: '/sales-outbound',
    title: '销售出库',
    apiPath: 'sales-outbound',
    moduleKey: 'sales-outbound',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['outboundNo'],
  },
  {
    path: '/sales-return',
    title: '销售退货单',
    apiPath: 'sales-return',
    moduleKey: 'sales-return',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['returnNo'],
  },
  {
    path: '/freight-bill',
    title: '物流单',
    apiPath: 'freight-bill',
    moduleKey: 'freight-bill',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['billNo'],
  },
  {
    path: '/customer-statement',
    title: '客户对账单',
    apiPath: 'customer-statement',
    moduleKey: 'customer-statement',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['statementNo'],
  },
  {
    path: '/freight-statement',
    title: '物流对账单',
    apiPath: 'freight-statement',
    moduleKey: 'freight-statement',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['statementNo'],
  },
  {
    path: '/receipt',
    title: '收款单',
    apiPath: 'receipt',
    moduleKey: 'receipt',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['receiptNo'],
  },
  {
    path: '/payment',
    title: '付款单',
    apiPath: 'payment',
    moduleKey: 'payment',
    view: 'business-grid',
    supportsDetail: true,
    searchKeys: ['paymentNo'],
  },
  {
    path: '/operation-log',
    title: '操作日志',
    apiPath: 'operation-log',
    moduleKey: 'operation-log',
    view: 'business-grid',
    supportsDetail: false,
  },
]

/** 非列表型 / 独立视图页面。 */
export const plainRoutes: PlainRouteManifest[] = [
  { path: '/dashboard', title: '工作台' },
  { path: '/inventory', title: '库存查询' },
  { path: '/finance-overview', title: '财务概览' },
  { path: '/cash-ledger', title: '资金流水' },
  { path: '/price-compare', title: '报单比价' },
  { path: '/market-sync', title: '行情同步' },
  { path: '/print-template', title: '打印模板' },
  { path: '/account', title: '个人账号' },
]

export const allAppRoutes: PlainRouteManifest[] = [
  ...plainRoutes,
  ...businessRoutes.map((route) => ({ path: route.path, title: route.title })),
]
