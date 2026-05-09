import fs from 'node:fs'
import path from 'node:path'
import { type APIRequestContext, expect, type Page } from '@playwright/test'

const STORAGE_KEYS = {
  token: 'aries-token',
  tokenExpiresAt: 'aries-token-expires-at',
  user: 'aries-user',
  authPersistence: 'aries-auth-persistence',
  personalSettings: 'aries-personal-settings',
} as const

const API_BASE_URL =
  process.env.E2E_API_BASE_URL || 'http://127.0.0.1:11211/api'
const APP_BASE_URL = process.env.E2E_APP_BASE_URL || 'http://127.0.0.1:3100'
const SESSION_CACHE_FILE = path.resolve(
  process.cwd(),
  '.playwright/.e2e-auth-session.json',
)
const E2E_BACKEND_MODE =
  process.env.E2E_BACKEND_MODE === 'mock' ? 'mock' : 'real'
const IS_REAL_BACKEND = E2E_BACKEND_MODE === 'real'
const API_KEY = String(process.env.E2E_API_KEY || '').trim()
const LOGIN_NAME = String(process.env.E2E_LOGIN_NAME || 'sakura').trim()
const LOGIN_PASSWORD = String(process.env.E2E_LOGIN_PASSWORD || '97143658').trim()
const LOGIN_MAX_RETRIES = 5
const LOGIN_RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000, 15_000] as const

const FALLBACK_PERMISSION_RESOURCES = [
  'access-control',
  'api-key',
  'carrier',
  'company-setting',
  'customer',
  'customer-statement',
  'dashboard',
  'database',
  'department',
  'freight-bill',
  'freight-statement',
  'general-setting',
  'inventory-report',
  'invoice-issue',
  'invoice-receipt',
  'io-report',
  'material',
  'operation-log',
  'payment',
  'pending-invoice-receipt-report',
  'permission',
  'print-template',
  'purchase-contract',
  'purchase-inbound',
  'purchase-order',
  'receipt',
  'receivable-payable',
  'role',
  'sales-contract',
  'sales-order',
  'sales-outbound',
  'security-key',
  'session',
  'supplier',
  'supplier-statement',
  'user-account',
  'warehouse',
] as const

const FALLBACK_MENU_CODES_BY_RESOURCE: Record<
  (typeof FALLBACK_PERMISSION_RESOURCES)[number],
  string[]
> = {
  'access-control': ['/access-control'],
  'api-key': ['/api-key'],
  carrier: ['/carrier'],
  'company-setting': ['/company-setting'],
  customer: ['/customer'],
  'customer-statement': ['/customer-statement'],
  dashboard: ['/dashboard'],
  database: ['/database'],
  department: ['/department'],
  'freight-bill': ['/freight-bill'],
  'freight-statement': ['/freight-statement'],
  'general-setting': ['/general-setting', '/number-rules'],
  'inventory-report': ['/inventory-report'],
  'invoice-issue': ['/invoice-issue'],
  'invoice-receipt': ['/invoice-receipt'],
  'io-report': ['/io-report'],
  material: ['/material', '/material-categories'],
  'operation-log': ['/operation-log'],
  payment: ['/payment'],
  'pending-invoice-receipt-report': ['/pending-invoice-receipt-report'],
  permission: ['/access-control'],
  'print-template': ['/print-template'],
  'purchase-contract': ['/purchase-contracts'],
  'purchase-inbound': ['/purchase-inbound'],
  'purchase-order': ['/purchase-order'],
  receipt: ['/receipt'],
  'receivable-payable': ['/receivable-payable'],
  role: ['/access-control'],
  'sales-contract': ['/sales-contracts'],
  'sales-order': ['/sales-order'],
  'sales-outbound': ['/sales-outbound'],
  'security-key': ['/security-key'],
  session: ['/session'],
  supplier: ['/supplier'],
  'supplier-statement': ['/supplier-statement'],
  'user-account': ['/access-control'],
  warehouse: ['/warehouse'],
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

interface ApiLoginUser {
  id: number | string
  loginName: string
  userName?: string
  roleName?: string
  totpEnabled?: boolean
  forceTotpSetup?: boolean
  permissions?: Array<{
    resource: string
    actions: string[]
  }>
  dataScopes?: Record<string, string>
}

interface LoginPayload {
  code: number
  message?: string
  data?: {
    accessToken?: string
    expiresIn?: number | string
    user?: ApiLoginUser
    requires2fa?: boolean
    tempToken?: string
  }
}

interface BrowserSession {
  accessToken: string
  expiresIn: number
  user: ApiLoginUser
  refreshCookie?: {
    name: string
    value: string
    path: string
  }
}

let cachedSessionPromise: Promise<BrowserSession> | null = null

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureSessionCacheDir() {
  fs.mkdirSync(path.dirname(SESSION_CACHE_FILE), { recursive: true })
}

function readCachedSessionFromDisk() {
  if (!fs.existsSync(SESSION_CACHE_FILE)) {
    return null
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(SESSION_CACHE_FILE, 'utf8'),
    ) as BrowserSession & { cachedAt?: number }
    const tokenExpiresAt =
      Number(parsed.cachedAt || 0) + Number(parsed.expiresIn || 0) * 1000
    if (!parsed.accessToken || !parsed.user || Date.now() >= tokenExpiresAt - 60_000) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCachedSessionToDisk(session: BrowserSession) {
  ensureSessionCacheDir()
  fs.writeFileSync(
    SESSION_CACHE_FILE,
    JSON.stringify({
      ...session,
      cachedAt: Date.now(),
    }),
    'utf8',
  )
}

export function clearCachedAuthSession() {
  cachedSessionPromise = null
  if (fs.existsSync(SESSION_CACHE_FILE)) {
    fs.rmSync(SESSION_CACHE_FILE, { force: true })
  }
}

function parseSetCookie(
  setCookieHeader: string | null,
  cookieName = 'leo_refresh_token',
) {
  if (!setCookieHeader) {
    return null
  }

  const cookies = setCookieHeader
    .split(/,(?=[^;,]+=)/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const cookie of cookies) {
    if (!cookie.startsWith(`${cookieName}=`)) {
      continue
    }
    const [nameValue, ...attributes] = cookie.split(';').map((part) => part.trim())
    const separatorIndex = nameValue.indexOf('=')
    const name = nameValue.slice(0, separatorIndex)
    const value = nameValue.slice(separatorIndex + 1)
    const pathAttribute = attributes.find((attribute) =>
      attribute.toLowerCase().startsWith('path='),
    )
    return {
      name,
      value,
      path: pathAttribute ? pathAttribute.slice(5) : '/',
    }
  }

  return null
}

function requireApiKey() {
  expect(API_KEY, '缺少 E2E_API_KEY，无法执行 API Key 联调 e2e').toBeTruthy()
  return API_KEY
}

function requireLoginCredentials() {
  expect(LOGIN_NAME, '缺少 E2E_LOGIN_NAME，无法执行真实登录 e2e').toBeTruthy()
  expect(LOGIN_PASSWORD, '缺少 E2E_LOGIN_PASSWORD，无法执行真实登录 e2e').toBeTruthy()
}

function buildFallbackPermissions() {
  return FALLBACK_PERMISSION_RESOURCES.map((resource) => ({
    resource,
    actions: ['read', 'create', 'update', 'delete', 'audit', 'export', 'print'],
  }))
}

function buildMockBrowserSession(): BrowserSession {
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
    expiresIn: 1_800,
    user: {
      id: 'mock-user',
      loginName: 'mock-api-key-user',
      userName: 'Mock API Key User',
      roleName: 'API Key',
      totpEnabled: true,
      permissions,
      dataScopes: Object.fromEntries(
        FALLBACK_PERMISSION_RESOURCES.map((resource) => [resource, 'all']),
      ),
    },
  }
}

export function buildApiKeyHeaders(token?: string) {
  if (!IS_REAL_BACKEND || !API_KEY) {
    return {}
  }

  return {
    'X-API-Key': token || requireApiKey(),
  }
}

function buildAuthorizationHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

async function loadPermissionCatalog(
  request: APIRequestContext,
  accessToken?: string,
) {
  if (!IS_REAL_BACKEND) {
    return buildFallbackPermissions()
  }

  const headers = accessToken
    ? buildAuthorizationHeaders(accessToken)
    : buildApiKeyHeaders()

  const response = await request.get(`${API_BASE_URL}/permission/catalog`, {
    headers,
  })

  if (!response.ok()) {
    return buildFallbackPermissions()
  }

  const payload = (await response.json()) as PermissionCatalogPayload
  if (
    payload.code !== 0 ||
    !Array.isArray(payload.data) ||
    payload.data.length === 0
  ) {
    return buildFallbackPermissions()
  }

  return payload.data.map((entry) => ({
    resource: entry.code,
    actions:
      Array.isArray(entry.actions) && entry.actions.length > 0
        ? entry.actions.map((action) => action.code)
        : ['read'],
  }))
}

async function createApiKeySession(
  request: APIRequestContext,
): Promise<BrowserSession> {
  if (!IS_REAL_BACKEND) {
    return buildMockBrowserSession()
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
    expiresIn: 1_800,
    user: {
      id: `api-key:${loginName}`,
      loginName,
      userName: String(payload.data?.userName || loginName),
      roleName: String(payload.data?.roleName || 'API Key'),
      totpEnabled: Boolean(payload.data?.totpEnabled),
      permissions,
      dataScopes: Object.fromEntries(
        permissions.map((entry) => [entry.resource, 'all']),
      ),
    },
  }
}

async function createPasswordSession(
  request: APIRequestContext,
): Promise<BrowserSession> {
  requireLoginCredentials()

  let lastError: Error | null = null

  for (let attempt = 0; attempt < LOGIN_MAX_RETRIES; attempt += 1) {
    const delayMs =
      LOGIN_RETRY_DELAYS_MS[
        Math.min(attempt, LOGIN_RETRY_DELAYS_MS.length - 1)
      ]
    if (delayMs > 0) {
      await sleep(delayMs)
    }

    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        loginName: LOGIN_NAME,
        password: LOGIN_PASSWORD,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const payload = (await response.json()) as LoginPayload
    if (!response.ok() || payload.code !== 0) {
      const message = String(
        payload.message || `登录失败，HTTP ${response.status()}`,
      )
      if (
        /请求过于频繁|too frequent|rate/i.test(message) &&
        attempt < LOGIN_MAX_RETRIES - 1
      ) {
        lastError = new Error(message)
        continue
      }
      throw new Error(message)
    }

    if (payload.data?.requires2fa) {
      throw new Error('E2E 账号要求二次验证，当前测试不支持 TOTP 登录')
    }

    const accessToken = String(payload.data?.accessToken || '')
    const user = payload.data?.user || null
    const expiresIn = Number(payload.data?.expiresIn || 1_800)

    expect(accessToken, '登录响应缺少 accessToken').toBeTruthy()
    expect(user, '登录响应缺少 user').toBeTruthy()

    const permissionCatalog = await loadPermissionCatalog(request, accessToken)
    const currentPermissions =
      Array.isArray(user?.permissions) && user.permissions.length > 0
        ? user.permissions
        : permissionCatalog

    return {
      accessToken,
      expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 1_800,
      user: {
        ...user,
        permissions: currentPermissions,
        dataScopes:
          user?.dataScopes ||
          Object.fromEntries(
            currentPermissions.map((entry) => [entry.resource, 'all']),
          ),
      },
      refreshCookie: parseSetCookie(response.headers()['set-cookie'] || null),
    }
  }

  throw lastError || new Error('真实登录失败')
}

async function createBrowserSession(
  request: APIRequestContext,
): Promise<BrowserSession> {
  if (!IS_REAL_BACKEND) {
    return buildMockBrowserSession()
  }

  const diskSession = readCachedSessionFromDisk()
  if (diskSession) {
    return diskSession
  }

  if (API_KEY) {
    const session = await createApiKeySession(request)
    writeCachedSessionToDisk(session)
    return session
  }

  const session = await createPasswordSession(request)
  writeCachedSessionToDisk(session)
  return session
}

export async function clearBrowserSession(page: Page) {
  await page.context().clearCookies()
}

export async function getApiKeySession(request: APIRequestContext) {
  if (!cachedSessionPromise) {
    cachedSessionPromise = createBrowserSession(request).catch((error) => {
      cachedSessionPromise = null
      throw error
    })
  }
  return cachedSessionPromise
}

function updateCachedSession(session: BrowserSession) {
  cachedSessionPromise = Promise.resolve(session)
  writeCachedSessionToDisk(session)
}

async function syncSessionFromPage(page: Page, fallback: BrowserSession) {
  const pageSession = await page.evaluate((storageKeys) => {
    const token = localStorage.getItem(storageKeys.token)
    const tokenExpiresAt = localStorage.getItem(storageKeys.tokenExpiresAt)
    const rawUser = localStorage.getItem(storageKeys.user)

    return {
      token,
      tokenExpiresAt,
      rawUser,
    }
  }, STORAGE_KEYS)

  if (!pageSession.token) {
    return fallback
  }

  let user = fallback.user
  if (pageSession.rawUser) {
    try {
      user = JSON.parse(pageSession.rawUser) as ApiLoginUser
    } catch {
      user = fallback.user
    }
  }

  const expiresAt = Number(pageSession.tokenExpiresAt || 0)
  const expiresIn =
    Number.isFinite(expiresAt) && expiresAt > Date.now()
      ? Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))
      : fallback.expiresIn

  return {
    accessToken: pageSession.token,
    expiresIn,
    user,
    refreshCookie: fallback.refreshCookie,
  } satisfies BrowserSession
}

async function applyBrowserSession(page: Page, session: BrowserSession) {
  if (session.refreshCookie) {
    await page.context().addCookies([
      {
        name: session.refreshCookie.name,
        value: session.refreshCookie.value,
        domain: '127.0.0.1',
        path: session.refreshCookie.path || '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ])
  }

  await page.goto('about:blank')
  await page.context().addInitScript(
    ({ storageKeys, token, user, expiresIn }) => {
      const expiresAt = String(Date.now() + expiresIn * 1000)
      localStorage.setItem(storageKeys.token, token)
      localStorage.setItem(storageKeys.tokenExpiresAt, expiresAt)
      localStorage.setItem(storageKeys.user, JSON.stringify(user))
      localStorage.setItem(storageKeys.authPersistence, 'local')
      sessionStorage.removeItem(storageKeys.token)
      sessionStorage.removeItem(storageKeys.tokenExpiresAt)
      sessionStorage.removeItem(storageKeys.user)
      sessionStorage.removeItem(storageKeys.authPersistence)
    },
    {
      storageKeys: STORAGE_KEYS,
      token: session.accessToken,
      user: session.user,
      expiresIn: session.expiresIn,
    },
  )
  await page.goto(APP_BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ storageKeys, token, user, expiresIn }) => {
      const expiresAt = String(Date.now() + expiresIn * 1000)
      localStorage.setItem(storageKeys.token, token)
      localStorage.setItem(storageKeys.tokenExpiresAt, expiresAt)
      localStorage.setItem(storageKeys.user, JSON.stringify(user))
      localStorage.setItem(storageKeys.authPersistence, 'local')
      sessionStorage.removeItem(storageKeys.token)
      sessionStorage.removeItem(storageKeys.tokenExpiresAt)
      sessionStorage.removeItem(storageKeys.user)
      sessionStorage.removeItem(storageKeys.authPersistence)
    },
    {
      storageKeys: STORAGE_KEYS,
      token: session.accessToken,
      user: session.user,
      expiresIn: session.expiresIn,
    },
  )
}

export async function primeApiKeySession(page: Page) {
  let session = await getApiKeySession(page.request)
  await applyBrowserSession(page, session)

  await page.goto('about:blank')
  await page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  if (page.url().includes('/login')) {
    clearCachedAuthSession()
    session = await getApiKeySession(page.request)
    await applyBrowserSession(page, session)
    await page.goto('about:blank')
    await page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  }

  session = await syncSessionFromPage(page, session)
  updateCachedSession(session)

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

  const session = await getApiKeySession(request)
  const params = new URLSearchParams()
  params.set('page', '0')
  params.set('size', '20')

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, String(value))
    }
  })

  const response = await request.get(
    `${API_BASE_URL}/${apiPath}?${params.toString()}`,
    {
      headers: buildAuthorizationHeaders(session.accessToken),
    },
  )

  if (!response.ok()) {
    return {
      ok: false,
      status: response.status(),
      records: [] as Array<Record<string, unknown>>,
    }
  }

  const payload = (await response.json()) as ApiCollectionPayload<
    Record<string, unknown>
  >
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

export async function fetchData(
  request: APIRequestContext,
  apiPath: string,
  query?: Record<string, string | number | undefined>,
) {
  if (!IS_REAL_BACKEND) {
    return {
      ok: false,
      status: 0,
      data: null as unknown,
    }
  }

  const session = await getApiKeySession(request)
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, String(value))
    }
  })
  const queryString = params.toString()
  const url = queryString
    ? `${API_BASE_URL}/${apiPath}?${queryString}`
    : `${API_BASE_URL}/${apiPath}`

  const response = await request.get(url, {
    headers: buildAuthorizationHeaders(session.accessToken),
  })

  if (!response.ok()) {
    return {
      ok: false,
      status: response.status(),
      data: null,
    }
  }

  const payload = (await response.json()) as {
    code: number
    message?: string
    data?: unknown
  }

  return {
    ok: payload.code === 0,
    status: response.status(),
    data: payload.code === 0 ? payload.data ?? null : null,
  }
}

export async function fetchDetail(
  request: APIRequestContext,
  apiPath: string,
  id: string | number,
) {
  if (!IS_REAL_BACKEND) {
    return {
      ok: false,
      status: 0,
      record: null as Record<string, unknown> | null,
    }
  }

  const session = await getApiKeySession(request)
  const response = await request.get(`${API_BASE_URL}/${apiPath}/${id}`, {
    headers: buildAuthorizationHeaders(session.accessToken),
  })

  if (!response.ok()) {
    return {
      ok: false,
      status: response.status(),
      record: null,
    }
  }

  const payload = (await response.json()) as {
    code: number
    message?: string
    data?: Record<string, unknown>
  }

  return {
    ok: payload.code === 0,
    status: response.status(),
    record: payload.code === 0 ? payload.data || null : null,
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
