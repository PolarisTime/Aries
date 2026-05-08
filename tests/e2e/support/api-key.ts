import { expect, type APIRequestContext, type Page } from '@playwright/test'

const STORAGE_KEYS = {
  token: 'aries-token',
  user: 'aries-user',
  authPersistence: 'aries-auth-persistence',
  personalSettings: 'aries-personal-settings',
} as const

const API_BASE_URL = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:11211/api'
const API_KEY = String(process.env.E2E_API_KEY || '').trim()
const E2E_BACKEND_MODE = process.env.E2E_BACKEND_MODE === 'real' ? 'real' : 'mock'
const IS_REAL_BACKEND = E2E_BACKEND_MODE === 'real'

const FALLBACK_PERMISSION_RESOURCES = [
  'dashboard',
  'material',
  'supplier',
  'customer',
  'carrier',
  'warehouse',
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'purchase-contract',
  'sales-contract',
  'inventory-report',
  'io-report',
  'pending-invoice-receipt-report',
  'supplier-statement',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
  'invoice-receipt',
  'invoice-issue',
  'receivable-payable',
  'general-setting',
  'company-setting',
  'operation-log',
  'department',
  'user-account',
  'permission',
  'role',
  'database',
  'session',
  'api-key',
  'security-key',
  'print-template',
] as const

const FALLBACK_MENU_CODES_BY_RESOURCE: Record<
  (typeof FALLBACK_PERMISSION_RESOURCES)[number],
  string[]
> = {
  dashboard: ['/dashboard'],
  material: ['/materials', '/material-categories'],
  supplier: ['/suppliers'],
  customer: ['/customers'],
  carrier: ['/carriers'],
  warehouse: ['/warehouses'],
  'purchase-order': ['/purchase-orders'],
  'purchase-inbound': ['/purchase-inbounds'],
  'sales-order': ['/sales-orders'],
  'sales-outbound': ['/sales-outbounds'],
  'freight-bill': ['/freight-bills'],
  'purchase-contract': ['/purchase-contracts'],
  'sales-contract': ['/sales-contracts'],
  'inventory-report': ['/inventory-report'],
  'io-report': ['/io-report'],
  'pending-invoice-receipt-report': ['/pending-invoice-receipt-report'],
  'supplier-statement': ['/supplier-statements'],
  'customer-statement': ['/customer-statements'],
  'freight-statement': ['/freight-statements'],
  receipt: ['/receipts'],
  payment: ['/payments'],
  'invoice-receipt': ['/invoice-receipts'],
  'invoice-issue': ['/invoice-issues'],
  'receivable-payable': ['/receivables-payables'],
  'general-setting': ['/general-settings', '/number-rules'],
  'company-setting': ['/company-settings'],
  'operation-log': ['/operation-logs'],
  department: ['/departments'],
  'user-account': ['/user-accounts'],
  permission: ['/permission-management'],
  role: ['/role-action-editor', '/role-settings'],
  database: ['/database-management'],
  session: ['/session-management'],
  'api-key': ['/api-key-management'],
  'security-key': ['/security-keys'],
  'print-template': ['/print-templates'],
}

interface DashboardSummaryPayload {
  code: number
  message?: string
  data?: {
    loginName?: string
    userName?: string
    roleName?: string
    totpEnabled?: boolean
  }
}

interface PermissionCatalogPayload {
  code: number
  message?: string
  data?: Array<{
    code: string
    actions?: Array<{ code: string }>
  }>
}

interface ApiCollectionPayload<T> {
  code: number
  message?: string
  data?:
    | T[]
    | {
        rows?: T[]
        records?: T[]
      }
}

interface ApiKeySessionUser {
  id: string
  loginName: string
  userName: string
  roleName: string
  totpEnabled: boolean
  permissions: Array<{
    resource: string
    actions: string[]
  }>
}

interface ApiKeySession {
  accessToken: string
  user: ApiKeySessionUser
}

let cachedSessionPromise: Promise<ApiKeySession> | null = null

function requireApiKey() {
  expect(API_KEY, '缺少 E2E_API_KEY，无法执行 API Key 联调 e2e').toBeTruthy()
  return API_KEY
}

function buildFallbackPermissions() {
  return FALLBACK_PERMISSION_RESOURCES.map((resource) => ({
    resource,
    actions: ['read', 'create', 'update', 'delete', 'audit', 'export', 'print'],
  }))
}

function buildMockApiKeySession(): ApiKeySession {
  const permissions = buildFallbackPermissions().flatMap((entry) => {
    return [
      entry,
      ...FALLBACK_MENU_CODES_BY_RESOURCE[entry.resource].map((menuCode) => ({
        resource: menuCode,
        actions: entry.actions,
      })),
    ]
  })

  return {
    accessToken: 'leo_mock_api_key_token',
    user: {
      id: 'api-key:mock-user',
      loginName: 'mock-api-key-user',
      userName: 'Mock API Key User',
      roleName: 'API Key',
      totpEnabled: true,
      permissions,
    },
  }
}

export function buildApiKeyHeaders(token?: string) {
  if (!IS_REAL_BACKEND) {
    return {}
  }

  return {
    'X-API-Key': token || requireApiKey(),
  }
}

async function loadPermissionCatalog(request: APIRequestContext) {
  if (!IS_REAL_BACKEND) {
    return buildFallbackPermissions()
  }

  const response = await request.get(`${API_BASE_URL}/permission-management/catalog`, {
    headers: buildApiKeyHeaders(),
  })

  if (!response.ok()) {
    return buildFallbackPermissions()
  }

  const payload = (await response.json()) as PermissionCatalogPayload
  if (payload.code !== 0 || !Array.isArray(payload.data) || payload.data.length === 0) {
    return buildFallbackPermissions()
  }

  return payload.data.map((entry) => ({
    resource: entry.code,
    actions:
      Array.isArray(entry.actions) && entry.actions.length > 0
        ? entry.actions.map((action) => action.code)
        : ['VIEW'],
  }))
}

async function createApiKeySession(request: APIRequestContext): Promise<ApiKeySession> {
  if (!IS_REAL_BACKEND) {
    return buildMockApiKeySession()
  }

  const [dashboardResponse, permissions] = await Promise.all([
    request.get(`${API_BASE_URL}/dashboard/summary`, {
      headers: buildApiKeyHeaders(),
    }),
    loadPermissionCatalog(request),
  ])

  expect(dashboardResponse.ok(), 'dashboard/summary 请求失败').toBeTruthy()
  const payload = (await dashboardResponse.json()) as DashboardSummaryPayload
  expect(payload.code, payload.message || '读取 API Key 会话信息失败').toBe(0)

  const loginName = String(payload.data?.loginName || 'api-key-user')

  return {
    accessToken: requireApiKey(),
    user: {
      id: `api-key:${loginName}`,
      loginName,
      userName: String(payload.data?.userName || loginName),
      roleName: String(payload.data?.roleName || 'API Key'),
      totpEnabled: Boolean(payload.data?.totpEnabled),
      permissions,
    },
  }
}

export async function clearBrowserSession(page: Page) {
  await page.addInitScript(({ storageKeys }) => {
    localStorage.removeItem(storageKeys.token)
    localStorage.removeItem(storageKeys.user)
    localStorage.removeItem(storageKeys.authPersistence)
    localStorage.removeItem(storageKeys.personalSettings)
    sessionStorage.removeItem(storageKeys.token)
    sessionStorage.removeItem(storageKeys.user)
    sessionStorage.removeItem(storageKeys.authPersistence)
  }, { storageKeys: STORAGE_KEYS })
}

export async function getApiKeySession(request: APIRequestContext) {
  if (!cachedSessionPromise) {
    cachedSessionPromise = createApiKeySession(request)
  }
  return cachedSessionPromise
}

export async function primeApiKeySession(page: Page) {
  const session = await getApiKeySession(page.request)

  await page.addInitScript(
    ({ storageKeys, token, user }) => {
      localStorage.setItem(storageKeys.token, token)
      localStorage.setItem(storageKeys.user, JSON.stringify(user))
      localStorage.setItem(storageKeys.authPersistence, 'local')
    },
    {
      storageKeys: STORAGE_KEYS,
      token: session.accessToken,
      user: session.user,
    },
  )

  return session
}

export async function fetchCollection(
  request: APIRequestContext,
  apiPath: string,
  query?: Record<string, string | number | undefined>,
) {
  if (!IS_REAL_BACKEND) {
    return {
      ok: false,
      status: 0,
      records: [] as Array<Record<string, unknown>>,
    }
  }

  const params = new URLSearchParams()
  params.set('page', '0')
  params.set('size', '20')

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, String(value))
    }
  })

  const response = await request.get(`${API_BASE_URL}/${apiPath}?${params.toString()}`, {
    headers: buildApiKeyHeaders(),
  })

  if (!response.ok()) {
    return {
      ok: false,
      status: response.status(),
      records: [] as Array<Record<string, unknown>>,
    }
  }

  const payload = (await response.json()) as ApiCollectionPayload<Record<string, unknown>>
  if (payload.code !== 0) {
    return {
      ok: false,
      status: response.status(),
      records: [] as Array<Record<string, unknown>>,
    }
  }

  const data = payload.data
  const records = Array.isArray(data)
    ? data
    : Array.isArray(data?.rows)
      ? data.rows
      : Array.isArray(data?.records)
        ? data.records
        : []

  return {
    ok: true,
    status: response.status(),
    records,
  }
}

export async function fetchFirstApiKeyRecord(request: APIRequestContext) {
  if (!IS_REAL_BACKEND) {
    return null
  }
  const result = await fetchCollection(request, 'auth/api-keys')
  return result.records[0] || null
}

export function isRealBackendMode() {
  return IS_REAL_BACKEND
}

export function pickSearchTerm(
  record: Record<string, unknown>,
  preferredKeys = [
    'orderNo',
    'inboundNo',
    'outboundNo',
    'billNo',
    'contractNo',
    'statementNo',
    'receiptNo',
    'paymentNo',
    'receiveNo',
    'issueNo',
    'materialCode',
    'materialName',
    'categoryCode',
    'categoryName',
    'supplierCode',
    'supplierName',
    'customerCode',
    'customerName',
    'carrierCode',
    'carrierName',
    'warehouseCode',
    'warehouseName',
    'departmentCode',
    'departmentName',
    'permissionName',
    'moduleName',
    'loginName',
    'userName',
    'companyName',
    'name',
    'code',
  ],
) {
  for (const key of preferredKeys) {
    const value = String(record[key] || '').trim()
    if (value && value.length >= 2) {
      return value
    }
  }

  return ''
}

export async function openHeaderMenu(page: Page) {
  await page.locator('.leo-header .app-user-settings-trigger').last().click()
}
