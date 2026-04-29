import type { MenuGroupKey, AppIconKey } from '@/config/navigation-registry'

export type RouteViewKey =
  | 'dashboard'
  | 'business-grid'
  | 'number-rules'
  | 'general-settings'
  | 'company-settings'
  | 'print-templates'
  | 'user-accounts'
  | 'role-action-editor'
  | 'database-management'
  | 'session-management'
  | 'api-key-management'
  | 'security-keys'

export interface AppPageDefinition {
  key: string
  title: string
  menuKey: string
  view: RouteViewKey
  icon: AppIconKey
  menuParent?: MenuGroupKey
  moduleKey?: string
  searchable?: boolean
  accessMenuKeys?: string[]
  hiddenInMenu?: boolean
  activeMenuKey?: string
  openPageKey?: string
  /** Explicit permission resource code. Takes priority over menuKey-based resolution. */
  resourceKey?: string
}

export const appPageDefinitions: AppPageDefinition[] = [
  {
    key: 'dashboard',
    title: '工作台',
    menuKey: '/dashboard',
    view: 'dashboard',
    icon: 'HomeOutlined',
  },
  {
    key: 'materials',
    title: '商品资料',
    menuKey: '/materials',
    view: 'business-grid',
    icon: 'DatabaseOutlined',
    menuParent: 'master',
    moduleKey: 'materials',
  },
  {
    key: 'material-categories',
    title: '商品类别',
    menuKey: '/material-categories',
    view: 'business-grid',
    icon: 'TagsOutlined',
    menuParent: 'master',
    moduleKey: 'material-categories',
  },
  {
    key: 'suppliers',
    title: '供应商资料',
    menuKey: '/suppliers',
    view: 'business-grid',
    icon: 'TeamOutlined',
    menuParent: 'master',
    moduleKey: 'suppliers',
  },
  {
    key: 'customers',
    title: '客户资料',
    menuKey: '/customers',
    view: 'business-grid',
    icon: 'UserOutlined',
    menuParent: 'master',
    moduleKey: 'customers',
  },
  {
    key: 'carriers',
    title: '物流方资料',
    menuKey: '/carriers',
    view: 'business-grid',
    icon: 'CarOutlined',
    menuParent: 'master',
    moduleKey: 'carriers',
  },
  {
    key: 'warehouses',
    title: '仓库资料',
    menuKey: '/warehouses',
    view: 'business-grid',
    icon: 'BankOutlined',
    menuParent: 'master',
    moduleKey: 'warehouses',
  },
  {
    key: 'purchase-orders',
    title: '采购订单',
    menuKey: '/purchase-orders',
    view: 'business-grid',
    icon: 'ProfileOutlined',
    menuParent: 'purchase',
    moduleKey: 'purchase-orders',
    searchable: true,
  },
  {
    key: 'purchase-inbounds',
    title: '采购入库',
    menuKey: '/purchase-inbounds',
    view: 'business-grid',
    icon: 'InboxOutlined',
    menuParent: 'purchase',
    moduleKey: 'purchase-inbounds',
    searchable: true,
  },
  {
    key: 'sales-orders',
    title: '销售订单',
    menuKey: '/sales-orders',
    view: 'business-grid',
    icon: 'FileDoneOutlined',
    menuParent: 'sales',
    moduleKey: 'sales-orders',
    searchable: true,
  },
  {
    key: 'sales-outbounds',
    title: '销售出库',
    menuKey: '/sales-outbounds',
    view: 'business-grid',
    icon: 'SwapOutlined',
    menuParent: 'sales',
    moduleKey: 'sales-outbounds',
    searchable: true,
  },
  {
    key: 'freight-bills',
    title: '物流单',
    menuKey: '/freight-bills',
    view: 'business-grid',
    icon: 'CarOutlined',
    menuParent: 'freight',
    moduleKey: 'freight-bills',
    searchable: true,
  },
  {
    key: 'purchase-contracts',
    title: '采购合同',
    menuKey: '/purchase-contracts',
    view: 'business-grid',
    icon: 'ProfileOutlined',
    menuParent: 'contracts',
    moduleKey: 'purchase-contracts',
    searchable: true,
  },
  {
    key: 'sales-contracts',
    title: '销售合同',
    menuKey: '/sales-contracts',
    view: 'business-grid',
    icon: 'FileDoneOutlined',
    menuParent: 'contracts',
    moduleKey: 'sales-contracts',
    searchable: true,
  },
  {
    key: 'inventory-report',
    title: '商品库存报表',
    menuKey: '/inventory-report',
    view: 'business-grid',
    icon: 'BarChartOutlined',
    menuParent: 'reports',
    moduleKey: 'inventory-report',
  },
  {
    key: 'io-report',
    title: '出入库报表',
    menuKey: '/io-report',
    view: 'business-grid',
    icon: 'SwapOutlined',
    menuParent: 'reports',
    moduleKey: 'io-report',
  },
  {
    key: 'supplier-statements',
    title: '供应商对账单',
    menuKey: '/supplier-statements',
    view: 'business-grid',
    icon: 'FileSearchOutlined',
    menuParent: 'statements',
    moduleKey: 'supplier-statements',
    searchable: true,
  },
  {
    key: 'customer-statements',
    title: '客户对账单',
    menuKey: '/customer-statements',
    view: 'business-grid',
    icon: 'FileTextOutlined',
    menuParent: 'statements',
    moduleKey: 'customer-statements',
    searchable: true,
  },
  {
    key: 'freight-statements',
    title: '物流对账单',
    menuKey: '/freight-statements',
    view: 'business-grid',
    icon: 'FileSyncOutlined',
    menuParent: 'statements',
    moduleKey: 'freight-statements',
    searchable: true,
  },
  {
    key: 'receipts',
    title: '收款单',
    menuKey: '/receipts',
    view: 'business-grid',
    icon: 'AccountBookOutlined',
    menuParent: 'finance',
    moduleKey: 'receipts',
    searchable: true,
  },
  {
    key: 'payments',
    title: '付款单',
    menuKey: '/payments',
    view: 'business-grid',
    icon: 'CreditCardOutlined',
    menuParent: 'finance',
    moduleKey: 'payments',
    searchable: true,
  },
  {
    key: 'invoice-receipts',
    title: '收票单',
    menuKey: '/invoice-receipts',
    view: 'business-grid',
    icon: 'FileTextOutlined',
    menuParent: 'finance',
    moduleKey: 'invoice-receipts',
    searchable: true,
  },
  {
    key: 'invoice-issues',
    title: '开票单',
    menuKey: '/invoice-issues',
    view: 'business-grid',
    icon: 'FileDoneOutlined',
    menuParent: 'finance',
    moduleKey: 'invoice-issues',
    searchable: true,
  },
  {
    key: 'pending-invoice-receipt-report',
    title: '未收票报表',
    menuKey: '/pending-invoice-receipt-report',
    view: 'business-grid',
    icon: 'FileSearchOutlined',
    menuParent: 'finance',
    moduleKey: 'pending-invoice-receipt-report',
  },
  {
    key: 'receivables-payables',
    title: '应收应付',
    menuKey: '/receivables-payables',
    view: 'business-grid',
    icon: 'CalculatorOutlined',
    menuParent: 'finance',
    moduleKey: 'receivables-payables',
  },
  {
    key: 'print-templates',
    title: '打印模板',
    menuKey: '/print-templates',
    view: 'print-templates',
    icon: 'PrinterOutlined',
    menuParent: 'system',
  },
  {
    key: 'number-rules',
    title: '单号规则',
    menuKey: '/number-rules',
    view: 'number-rules',
    icon: 'ProfileOutlined',
    menuParent: 'system',
    accessMenuKeys: ['/general-settings'],
  },
  {
    key: 'general-settings',
    title: '通用设置',
    menuKey: '/general-settings',
    view: 'general-settings',
    icon: 'SettingOutlined',
    menuParent: 'system',
    moduleKey: 'general-settings',
  },
  {
    key: 'company-settings',
    title: '公司信息',
    menuKey: '/company-settings',
    view: 'company-settings',
    icon: 'AccountBookOutlined',
    menuParent: 'system',
    moduleKey: 'company-settings',
  },
  {
    key: 'operation-logs',
    title: '操作日志',
    menuKey: '/operation-logs',
    view: 'business-grid',
    icon: 'FileSearchOutlined',
    menuParent: 'system',
    moduleKey: 'operation-logs',
  },
  {
    key: 'departments',
    title: '部门管理',
    menuKey: '/departments',
    view: 'business-grid',
    icon: 'ApartmentOutlined',
    menuParent: 'system',
    moduleKey: 'departments',
  },
  {
    key: 'user-accounts',
    title: '用户账户',
    menuKey: '/user-accounts',
    view: 'user-accounts',
    icon: 'UserOutlined',
    menuParent: 'system',
  },
  {
    key: 'permission-management',
    title: '权限管理',
    menuKey: '/permission-management',
    view: 'business-grid',
    icon: 'TeamOutlined',
    menuParent: 'system',
    moduleKey: 'permission-management',
  },
  {
    key: 'role-settings',
    title: '角色权限配置',
    menuKey: '/role-settings',
    view: 'role-action-editor',
    icon: 'AccountBookOutlined',
    menuParent: 'system',
    accessMenuKeys: ['/role-action-editor', '/role-settings'],
    hiddenInMenu: true,
    activeMenuKey: '/role-action-editor',
    openPageKey: '/role-action-editor',
  },
  {
    key: 'role-action-editor',
    title: '角色权限配置',
    menuKey: '/role-action-editor',
    view: 'role-action-editor',
    icon: 'SafetyCertificateOutlined',
    menuParent: 'system',
    accessMenuKeys: ['/role-action-editor', '/role-settings'],
  },
  {
    key: 'database-management',
    title: '数据库管理',
    menuKey: '/database-management',
    view: 'database-management',
    icon: 'DatabaseOutlined',
    menuParent: 'system',
  },
  {
    key: 'session-management',
    title: '会话管理',
    menuKey: '/session-management',
    view: 'session-management',
    icon: 'SafetyCertificateOutlined',
    menuParent: 'system',
  },
  {
    key: 'api-key-management',
    title: 'API Key 管理',
    menuKey: '/api-key-management',
    view: 'api-key-management',
    icon: 'SafetyCertificateOutlined',
    menuParent: 'system',
  },
  {
    key: 'security-keys',
    title: '安全密钥管理',
    menuKey: '/security-keys',
    view: 'security-keys',
    icon: 'SafetyCertificateOutlined',
    menuParent: 'system',
  },
]

export const dashboardPageDefinition = appPageDefinitions.find(
  (entry) => entry.key === 'dashboard',
)!

const appPageDefinitionMap = new Map(
  appPageDefinitions.map((entry) => [entry.key, entry] as const),
)
const searchableModuleKeys = appPageDefinitions
  .filter((entry) => entry.searchable && entry.moduleKey)
  .map((entry) => entry.moduleKey as string)

export function getPageRoutePath(page: AppPageDefinition | string) {
  const target =
    typeof page === 'string' ? appPageDefinitionMap.get(page) : page
  if (!target) {
    throw new Error(`未找到页面定义: ${String(page)}`)
  }
  return target.menuKey.replace(/^\/+/, '')
}

export function getPageDefinition(key: string) {
  return appPageDefinitionMap.get(key)
}

export function getSearchableModuleKeys() {
  return searchableModuleKeys
}
