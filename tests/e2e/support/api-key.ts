import { randomUUID } from 'node:crypto'
import {
  type APIRequestContext,
  type APIResponse,
  expect,
  type Page,
} from '@playwright/test'
import { E2E_LOGIN_NAME, E2E_LOGIN_PASSWORD } from './e2e-credentials'

export const STORAGE_KEYS = {
  token: 'aries-token',
  tokenExpiresAt: 'aries-token-expires-at',
  user: 'aries-user',
  authPersistence: 'aries-auth-persistence',
  personalSettings: 'aries-personal-settings',
} as const

export const APP_BASE_URL =
  process.env.E2E_APP_BASE_URL || 'http://127.0.0.1:3100'
const API_BASE_URL = (
  process.env.E2E_API_BASE_URL || 'http://127.0.0.1:11211/api/v2.0'
).replace(/\/+$/, '')
const E2E_BACKEND_MODE =
  process.env.E2E_BACKEND_MODE === 'mock' ? 'mock' : 'real'
const IS_REAL_BACKEND = E2E_BACKEND_MODE === 'real'

const LOGIN_MAX_RETRIES = 5
const LOGIN_RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000, 15_000] as const
const REFRESH_COOKIE_NAME = 'leo_refresh_token'
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 600

/**
 * 当前应用模块 key → 后端集合资源路径。
 * 仅保留当前仍存在的模块；退役模块（role/permission/api-key 等）不再登记。
 */
const E2E_API_PATHS_BY_MODULE: Record<string, string> = {
  material: 'materials',
  'material-categories': 'material-categories',
  supplier: 'suppliers',
  customer: 'customers',
  project: 'projects',
  carrier: 'carriers',
  warehouse: 'warehouses',
  'company-setting': 'company-settings',
  'purchase-order': 'purchase-orders',
  'purchase-inbound': 'purchase-inbounds',
  'sales-order': 'sales-orders',
  'sales-outbound': 'sales-outbounds',
  'sales-return': 'sales-returns',
  'freight-bill': 'freight-bills',
  'customer-statement': 'customer-statements',
  'freight-statement': 'freight-statements',
  receipt: 'receipts',
  payment: 'payments',
  'operation-log': 'operation-logs',
}

export interface ApiLoginUser {
  id: string
  loginName: string
  userName?: string
}

export interface BrowserSession {
  accessToken: string
  expiresIn: number
  accessTokenExpiresAt: number
  user: ApiLoginUser
  refreshCookie?: {
    name: string
    value: string
    path: string
  }
}

interface ApiLoginPayload {
  accessToken?: string
  expiresIn?: number | string
  user?: ApiLoginUser
  data?: {
    accessToken?: string
    expiresIn?: number | string
    user?: ApiLoginUser
  }
}

let cachedSessionPromise: Promise<BrowserSession> | null = null
let passwordSessionPromises = new WeakMap<
  APIRequestContext,
  Promise<BrowserSession>
>()

const EMPTY_RECORDS: Array<Record<string, unknown>> = []

export function resolveE2eApiPath(apiPath: string) {
  return E2E_API_PATHS_BY_MODULE[apiPath] || apiPath
}

export function e2eApiUrl(apiPath: string, suffix = '') {
  const resolvedPath = resolveE2eApiPath(apiPath).replace(/^\/+/, '')
  const normalizedSuffix = suffix.replace(/^\/+/, '')
  if (normalizedSuffix.startsWith('?')) {
    return `${API_BASE_URL}/${resolvedPath}${normalizedSuffix}`
  }
  return normalizedSuffix
    ? `${API_BASE_URL}/${resolvedPath}/${normalizedSuffix}`
    : `${API_BASE_URL}/${resolvedPath}`
}

export function e2eApiBaseUrl() {
  return API_BASE_URL
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function clearCachedAuthSession() {
  cachedSessionPromise = null
  passwordSessionPromises = new WeakMap<
    APIRequestContext,
    Promise<BrowserSession>
  >()
}

function requireLoginCredentials() {
  expect(
    E2E_LOGIN_NAME,
    '缺少 E2E_LOGIN_NAME，无法执行真实登录 e2e',
  ).toBeTruthy()
  expect(
    E2E_LOGIN_PASSWORD,
    '缺少 E2E_LOGIN_PASSWORD，无法执行真实登录 e2e',
  ).toBeTruthy()
}

function parseSetCookie(
  setCookieHeader: string | null,
  cookieName = REFRESH_COOKIE_NAME,
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
    const [nameValue, ...attributes] = cookie
      .split(';')
      .map((part) => part.trim())
    const separatorIndex = nameValue.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }
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

function normalizeLoginPayload(payload: ApiLoginPayload) {
  const data = payload.data ?? payload
  return {
    accessToken: String(data.accessToken || ''),
    expiresIn: Number(data.expiresIn || DEFAULT_ACCESS_TOKEN_TTL_SECONDS),
    user: data.user ?? null,
  }
}

export async function loginWithPassword(
  request: APIRequestContext,
  loginName = E2E_LOGIN_NAME,
  password = E2E_LOGIN_PASSWORD,
): Promise<BrowserSession> {
  requireLoginCredentials()

  let lastError: Error | null = null

  for (let attempt = 0; attempt < LOGIN_MAX_RETRIES; attempt += 1) {
    const delayMs =
      LOGIN_RETRY_DELAYS_MS[Math.min(attempt, LOGIN_RETRY_DELAYS_MS.length - 1)]
    if (delayMs > 0) {
      await sleep(delayMs)
    }

    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { loginName, password },
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID(),
      },
    })

    const payload = (await response.json().catch(() => ({}))) as ApiLoginPayload

    if (!response.ok()) {
      const message =
        (payload as { detail?: string; message?: string }).detail ||
        (payload as { message?: string }).message ||
        `登录失败，HTTP ${response.status()}`
      if (
        /请求过于频繁|too frequent|rate limit/i.test(message) &&
        attempt < LOGIN_MAX_RETRIES - 1
      ) {
        lastError = new Error(message)
        continue
      }
      throw new Error(message)
    }

    const { accessToken, expiresIn, user } = normalizeLoginPayload(payload)
    expect(accessToken, '登录响应缺少 accessToken').toBeTruthy()
    expect(user, '登录响应缺少 user').toBeTruthy()
    if (!accessToken || !user) {
      throw new Error('登录响应缺少 accessToken 或 user')
    }

    const ttl =
      Number.isFinite(expiresIn) && expiresIn > 0
        ? expiresIn
        : DEFAULT_ACCESS_TOKEN_TTL_SECONDS

    return {
      accessToken,
      expiresIn: ttl,
      accessTokenExpiresAt: Date.now() + ttl * 1000,
      user: {
        id: String(user.id),
        loginName: String(user.loginName),
        userName: user.userName,
      },
      refreshCookie:
        parseSetCookie(response.headers()['set-cookie'] || null) || undefined,
    }
  }

  throw lastError || new Error('真实登录失败')
}

export async function getPasswordSession(request: APIRequestContext) {
  const existing = passwordSessionPromises.get(request)
  if (existing) {
    const session = await existing
    if (
      !session.accessTokenExpiresAt ||
      session.accessTokenExpiresAt > Date.now() + 30_000
    ) {
      return session
    }
    passwordSessionPromises.delete(request)
  }

  const sessionPromise = loginWithPassword(request).catch((error) => {
    passwordSessionPromises.delete(request)
    throw error
  })
  passwordSessionPromises.set(request, sessionPromise)
  return sessionPromise
}

/** 兼容旧导出名：当前实现走 JWT 账号密码登录。 */
export async function getApiKeySession(request: APIRequestContext) {
  if (IS_REAL_BACKEND) {
    if (!cachedSessionPromise) {
      cachedSessionPromise = loginWithPassword(request).catch((error) => {
        cachedSessionPromise = null
        throw error
      })
    }
    return cachedSessionPromise
  }
  return getPasswordSession(request)
}

export async function clearBrowserSession(page: Page) {
  passwordSessionPromises.delete(page.request)
  await page.context().clearCookies()
}

async function applyBrowserSession(page: Page, session: BrowserSession) {
  const accessTokenExpiresAt =
    session.accessTokenExpiresAt || Date.now() + session.expiresIn * 1000

  if (session.refreshCookie?.value) {
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

  await page.context().addInitScript(
    ({ storageKeys, token, user, accessTokenExpiresAt }) => {
      try {
        localStorage.setItem(storageKeys.token, token)
        localStorage.setItem(
          storageKeys.tokenExpiresAt,
          String(accessTokenExpiresAt),
        )
        localStorage.setItem(storageKeys.user, JSON.stringify(user))
        localStorage.setItem(storageKeys.authPersistence, 'local')
        localStorage.setItem('leo-locale', 'zh-CN')
        sessionStorage.removeItem(storageKeys.token)
        sessionStorage.removeItem(storageKeys.tokenExpiresAt)
        sessionStorage.removeItem(storageKeys.user)
        sessionStorage.removeItem(storageKeys.authPersistence)
      } catch {
        // about:blank 等内部文档无法访问 localStorage。
      }
    },
    {
      storageKeys: STORAGE_KEYS,
      token: session.accessToken,
      user: session.user,
      accessTokenExpiresAt,
    },
  )

  await page.goto(APP_BASE_URL, { waitUntil: 'domcontentloaded' })
}

async function syncSessionFromPage(page: Page, fallback: BrowserSession) {
  const pageSession = await page
    .evaluate((storageKeys) => {
      try {
        return {
          token: localStorage.getItem(storageKeys.token),
          tokenExpiresAt: localStorage.getItem(storageKeys.tokenExpiresAt),
          rawUser: localStorage.getItem(storageKeys.user),
        }
      } catch {
        return { token: null, tokenExpiresAt: null, rawUser: null }
      }
    }, STORAGE_KEYS)
    .catch(() => ({ token: null, tokenExpiresAt: null, rawUser: null }))

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
  const hasValidExpiresAt = Number.isFinite(expiresAt) && expiresAt > Date.now()

  return {
    accessToken: pageSession.token,
    expiresIn: hasValidExpiresAt
      ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))
      : fallback.expiresIn,
    accessTokenExpiresAt: hasValidExpiresAt
      ? expiresAt
      : fallback.accessTokenExpiresAt,
    user,
    refreshCookie: fallback.refreshCookie,
  } satisfies BrowserSession
}

/**
 * 登录并注入浏览器会话。
 * 保留历史导出名 `primeApiKeySession`，实现已切换为当前 JWT 账号密码登录。
 */
export async function primeApiKeySession(page: Page) {
  let session = await getPasswordSession(page.request)
  await applyBrowserSession(page, session)
  await page.goto(`${APP_BASE_URL}/dashboard`, {
    waitUntil: 'domcontentloaded',
  })

  if (/\/login(?:\?|$)/.test(page.url())) {
    clearCachedAuthSession()
    session = await getPasswordSession(page.request)
    await applyBrowserSession(page, session)
    await page.goto(`${APP_BASE_URL}/dashboard`, {
      waitUntil: 'domcontentloaded',
    })
  }

  session = await syncSessionFromPage(page, session)
  passwordSessionPromises.set(page.request, Promise.resolve(session))
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)

  return session
}

export const primeLoginSession = primeApiKeySession

async function authorizedGet(
  request: APIRequestContext,
  url: string,
): Promise<APIResponse> {
  const session = await getPasswordSession(request)
  return request.get(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
}

export async function fetchCollection(
  request: APIRequestContext,
  apiPath: string,
  query?: Record<string, string | number | undefined>,
) {
  if (!IS_REAL_BACKEND) {
    return { ok: false, status: 0, records: EMPTY_RECORDS }
  }

  const params = new URLSearchParams()
  params.set('page', '0')
  params.set('size', '20')
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, String(value))
    }
  })

  const response = await authorizedGet(
    request,
    e2eApiUrl(apiPath, `?${params.toString()}`),
  )

  if (!response.ok()) {
    return { ok: false, status: response.status(), records: EMPTY_RECORDS }
  }

  const payload = (await response.json()) as {
    content?: Array<Record<string, unknown>>
    rows?: Array<Record<string, unknown>>
    records?: Array<Record<string, unknown>>
    data?: unknown
  }
  const data = payload.content ?? payload.rows ?? payload.records
  const records = Array.isArray(data)
    ? data
    : Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Array<Record<string, unknown>> }).data
      : []

  return { ok: true, status: response.status(), records }
}

export async function fetchData(
  request: APIRequestContext,
  apiPath: string,
  query?: Record<string, string | number | undefined>,
) {
  if (!IS_REAL_BACKEND) {
    return { ok: false, status: 0, data: null as unknown }
  }

  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, String(value))
    }
  })
  const queryString = params.toString()
  const url = queryString
    ? e2eApiUrl(apiPath, `?${queryString}`)
    : e2eApiUrl(apiPath)

  const response = await authorizedGet(request, url)
  if (!response.ok()) {
    return { ok: false, status: response.status(), data: null as unknown }
  }

  const payload = (await response.json()) as { data?: unknown }
  return {
    ok: true,
    status: response.status(),
    data: payload.data ?? payload,
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

  const response = await authorizedGet(request, e2eApiUrl(apiPath, String(id)))
  if (!response.ok()) {
    return { ok: false, status: response.status(), record: null }
  }

  const payload = (await response.json()) as Record<string, unknown>
  return {
    ok: true,
    status: response.status(),
    record:
      (payload.data as Record<string, unknown> | undefined) ?? payload ?? null,
  }
}

export function isRealBackendMode() {
  return IS_REAL_BACKEND
}

export function buildAuthorizationHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function pickSearchTerm(
  record: Record<string, unknown>,
  preferredKeys = [
    'orderNo',
    'inboundNo',
    'outboundNo',
    'returnNo',
    'billNo',
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
    'projectCode',
    'projectName',
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
