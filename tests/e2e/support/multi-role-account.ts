import { randomUUID } from 'node:crypto'
import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  expect,
  type Page,
} from '@playwright/test'
import { deleteModuleRecordBestEffort } from '../ops-e2e-support'
import { APP_BASE_URL, e2eApiBaseUrl, getPasswordSession } from './api-key'

const NAV_TIMEOUT_MS = 30_000

/** 第二个登录账号使用的固定密码（仅测试库使用）。 */
export const SECOND_USER_PASSWORD = 'E2ePass123'

/**
 * 比价页编辑所需的最小权限集：
 * 报价单读写 + 行/编辑锁写 + 页面元数据（品牌/供应商/网价日历）读取。
 */
export const QUOTE_EDITOR_PERMISSIONS = [
  'quote-sheets:read',
  'quote-sheets:create',
  'quote-sheets:update',
  'quote-sheets:delete',
  'materials:read',
  'suppliers:read',
  'steel-quote-calendars:read',
  'material-price-matches:read',
] as const

export interface MultiRoleAccount {
  userId: string
  loginName: string
  userName: string
  roleId: string
  roleCode: string
  password: string
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function adminRequest(
  request: APIRequestContext,
  method: HttpMethod,
  path: string,
  data?: unknown,
) {
  const session = await getPasswordSession(request)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': randomUUID(),
  }
  const url = `${e2eApiBaseUrl()}${path}`
  if (method === 'GET') return request.get(url, { headers })
  if (method === 'POST') return request.post(url, { headers, data: data ?? {} })
  if (method === 'PUT') return request.put(url, { headers, data: data ?? {} })
  return request.delete(url, { headers })
}

/**
 * 用管理员会话创建「普通角色 + 用户」并分配权限。
 * 角色/用户均以时间戳+随机数命名，用例结束由 cleanupMultiRoleAccount 清理。
 */
export async function createMultiRoleAccount(
  request: APIRequestContext,
  options: { permissions?: readonly string[]; label?: string } = {},
): Promise<MultiRoleAccount> {
  const permissions = options.permissions ?? QUOTE_EDITOR_PERMISSIONS
  const label = (options.label ?? 'editor').replace(/[^a-zA-Z0-9]/g, '')
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  const roleCode = `E2E_${label.toUpperCase()}_ROLE_${suffix}`
  const roleName = `E2E${label}角色${suffix}`
  const loginName = `e2e_${label}_${suffix}`
  const userName = `E2E${label}用户${suffix}`

  const roleResponse = await adminRequest(request, 'POST', '/roles', {
    code: roleCode,
    name: roleName,
    description: 'E2E 多角色测试夹具',
  })
  expect(roleResponse.status(), await roleResponse.text()).toBe(201)
  const roleId = String(((await roleResponse.json()) as { id: unknown }).id)

  const permissionResponse = await adminRequest(
    request,
    'PUT',
    `/roles/${roleId}/permissions`,
    { permissions: [...permissions] },
  )
  expect(
    permissionResponse.status(),
    await permissionResponse.text(),
  ).toBeLessThan(400)

  const userResponse = await adminRequest(request, 'POST', '/users', {
    loginName,
    userName,
    password: SECOND_USER_PASSWORD,
    status: 'NORMAL',
  })
  expect(userResponse.status(), await userResponse.text()).toBe(201)
  const userId = String(((await userResponse.json()) as { id: unknown }).id)

  const assignResponse = await adminRequest(
    request,
    'PUT',
    `/users/${userId}/roles`,
    { roleIds: [roleId] },
  )
  expect(assignResponse.status(), await assignResponse.text()).toBeLessThan(400)

  return {
    userId,
    loginName,
    userName,
    roleId,
    roleCode,
    password: SECOND_USER_PASSWORD,
  }
}

/** 在独立浏览器上下文以 UI 登录第二账号，返回上下文与页面。 */
export async function loginMultiRoleAccount(
  browser: Browser,
  account: MultiRoleAccount,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: APP_BASE_URL,
    locale: 'zh-CN',
  })
  const page = await context.newPage()
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('#loginName').fill(account.loginName)
  await page.locator('#password').fill(account.password)
  await page.getByRole('button', { name: /登录|Sign In/i }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, {
    timeout: NAV_TIMEOUT_MS,
  })
  await page.evaluate(() => {
    localStorage.setItem('leo-locale', 'zh-CN')
  })
  return { context, page }
}

/** 读取当前页面登录态 access token（未登录返回 null）。 */
export async function currentAccessToken(page: Page): Promise<string | null> {
  return page
    .evaluate(() => localStorage.getItem('aries-token'))
    .catch(() => null)
}

/** 注销当前浏览器会话的刷新令牌，避免清理账号时残留会话。 */
export async function logoutBrowserSession(page: Page): Promise<void> {
  const token = await currentAccessToken(page)
  if (!token) return
  await page.request
    .post(`${e2eApiBaseUrl()}/auth/logout`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Idempotency-Key': randomUUID(),
      },
    })
    .catch(() => undefined)
}

/** 兜底清理：先软删用户，再删角色（顺序不可颠倒）。 */
export async function cleanupMultiRoleAccount(
  request: APIRequestContext,
  account: MultiRoleAccount | undefined,
): Promise<void> {
  if (!account) return
  await deleteModuleRecordBestEffort(request, '/users', account.userId)
  if (account.roleId) {
    await deleteModuleRecordBestEffort(request, '/roles', account.roleId)
  }
}
