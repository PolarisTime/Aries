import type { Page } from '@playwright/test'

export const TEST_USER = {
  id: 1,
  loginName: 'admin',
  userName: '管理员',
  status: 'active',
  roleName: 'admin',
  totpEnabled: false,
  permissions: [
    { resource: 'dashboard', actions: ['read'] },
    { resource: 'materials', actions: ['read', 'create', 'update', 'delete', 'export'] },
    { resource: 'customers', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'suppliers', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'sales-orders', actions: ['read', 'create', 'update', 'delete', 'export'] },
    { resource: 'purchase-orders', actions: ['read', 'create', 'update', 'delete', 'export'] },
    { resource: 'user-accounts', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'role-settings', actions: ['read', 'create', 'update'] },
    { resource: 'company-setting', actions: ['read', 'update'] },
    { resource: 'general-setting', actions: ['read', 'update'] },
    { resource: 'print-template', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'database', actions: ['read', 'export', 'import'] },
    { resource: 'session', actions: ['read', 'revoke'] },
    { resource: 'api-key', actions: ['read', 'create', 'revoke'] },
    { resource: 'security-key', actions: ['read', 'rotate'] },
    { resource: 'permission', actions: ['read'] },
    { resource: 'department', actions: ['read'] },
    { resource: 'operation-log', actions: ['read'] },
    { resource: 'warehouse', actions: ['read'] },
    { resource: 'carrier', actions: ['read'] },
    { resource: 'freight-bill', actions: ['read'] },
    { resource: 'inventory-report', actions: ['read'] },
    { resource: 'io-report', actions: ['read'] },
    { resource: 'customer-statement', actions: ['read', 'create'] },
    { resource: 'supplier-statement', actions: ['read', 'create'] },
    { resource: 'freight-statement', actions: ['read', 'create'] },
    { resource: 'receipt', actions: ['read', 'create'] },
    { resource: 'payment', actions: ['read', 'create'] },
    { resource: 'invoice-receipt', actions: ['read', 'create'] },
    { resource: 'invoice-issue', actions: ['read', 'create'] },
    { resource: 'receivable-payable', actions: ['read'] },
    { resource: 'pending-invoice-receipt-report', actions: ['read'] },
    { resource: 'purchase-contract', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'sales-contract', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'material-categories', actions: ['read'] },
  ],
}

const LOGIN_RESPONSE = {
  code: 0,
  message: 'ok',
  data: {
    accessToken: 'test-access-token',
    tokenType: 'Bearer',
    expiresIn: 1800,
    refreshExpiresIn: 604800,
    user: TEST_USER,
  },
}

const MENU_TREE = [
  { id: 1, code: 'dashboard', title: '工作台', icon: 'HomeOutlined', path: '/dashboard', children: [] },
  {
    id: 2, code: 'master', title: '基础资料', icon: 'AppstoreOutlined',
    children: [
      { id: 21, code: 'materials', title: '商品资料', icon: 'DatabaseOutlined', path: '/materials' },
      { id: 22, code: 'customers', title: '客户资料', icon: 'UserOutlined', path: '/customers' },
      { id: 23, code: 'suppliers', title: '供应商资料', icon: 'TeamOutlined', path: '/suppliers' },
      { id: 24, code: 'carriers', title: '物流方资料', icon: 'CarOutlined', path: '/carriers' },
      { id: 25, code: 'warehouses', title: '仓库资料', icon: 'BankOutlined', path: '/warehouses' },
    ],
  },
  {
    id: 3, code: 'purchase', title: '采购管理', icon: 'ShoppingCartOutlined',
    children: [
      { id: 31, code: 'purchase-orders', title: '采购订单', icon: 'ProfileOutlined', path: '/purchase-orders' },
      { id: 32, code: 'purchase-inbounds', title: '采购入库', icon: 'InboxOutlined', path: '/purchase-inbounds' },
    ],
  },
  {
    id: 4, code: 'sales', title: '销售管理', icon: 'ShopOutlined',
    children: [
      { id: 41, code: 'sales-orders', title: '销售订单', icon: 'FileDoneOutlined', path: '/sales-orders' },
      { id: 42, code: 'sales-outbounds', title: '销售出库', icon: 'SwapOutlined', path: '/sales-outbounds' },
    ],
  },
  {
    id: 9, code: 'system', title: '系统管理', icon: 'SettingOutlined',
    children: [
      { id: 91, code: 'user-accounts', title: '用户账户', icon: 'UserOutlined', path: '/user-accounts' },
      { id: 92, code: 'role-action-editor', title: '角色权限配置', icon: 'SafetyCertificateOutlined', path: '/role-action-editor' },
      { id: 93, code: 'company-settings', title: '公司信息', icon: 'AccountBookOutlined', path: '/company-settings' },
      { id: 94, code: 'general-settings', title: '通用设置', icon: 'SettingOutlined', path: '/general-settings' },
      { id: 95, code: 'number-rules', title: '单号规则', icon: 'ProfileOutlined', path: '/number-rules' },
      { id: 96, code: 'print-templates', title: '打印模板', icon: 'PrinterOutlined', path: '/print-templates' },
      { id: 97, code: 'database-management', title: '数据库管理', icon: 'DatabaseOutlined', path: '/database-management' },
      { id: 98, code: 'session-management', title: '会话管理', icon: 'SafetyCertificateOutlined', path: '/session-management' },
      { id: 99, code: 'api-key-management', title: 'API Key 管理', icon: 'SafetyCertificateOutlined', path: '/api-key-management' },
      { id: 100, code: 'security-keys', title: '安全密钥管理', icon: 'SafetyCertificateOutlined', path: '/security-keys' },
    ],
  },
]

export async function setupAuthMocks(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({ json: LOGIN_RESPONSE })
  })
  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({ json: { code: 0 } })
  })
  await page.route('**/api/auth/captcha', async (route) => {
    await route.fulfill({ json: { code: 0, data: { captchaId: 'test', captchaImage: '', required: false } } })
  })
  await page.route('**/api/auth/ping', async (route) => {
    await route.fulfill({ json: { code: 0, data: 'pong' } })
  })
  await page.route('**/api/system/menus/tree', async (route) => {
    await route.fulfill({ json: { code: 0, data: MENU_TREE } })
  })
  await page.route('**/api/health', async (route) => {
    await route.fulfill({ json: { status: 'UP' } })
  })
  await page.route('**/api/company-settings/current', async (route) => {
    await route.fulfill({ json: { code: 0, data: { companyName: 'Test Company' } } })
  })
  await page.route('**/api/dashboard/summary', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        data: {
          totalCustomers: 42,
          totalSuppliers: 18,
          totalMaterials: 156,
          pendingOrders: 7,
          todayInbounds: 12,
          todayOutbounds: 9,
        },
      },
    })
  })
}

export function mockBusinessList(page: Page, moduleKey: string, rows: Array<Record<string, unknown>>) {
  return page.route(`**/api/${moduleKey}*`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          code: 0,
          data: { rows, total: rows.length },
        },
      })
    } else {
      await route.fulfill({ json: { code: 0, data: {} } })
    }
  })
}
