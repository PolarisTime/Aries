import { randomUUID } from 'node:crypto'
import {
  type APIRequestContext,
  type BrowserContext,
  expect,
  type Page,
} from '@playwright/test'
import { apiGetJson, deleteModuleRecordBestEffort } from './ops-e2e-support'
import {
  APP_BASE_URL,
  e2eApiBaseUrl,
  getPasswordSession,
  primeApiKeySession,
} from './support/api-key'
import { buttonName } from './support/business-e2e'
import { test } from './support/test'

const NAV_TIMEOUT_MS = 30_000
const TEMP_PASSWORD = 'Abcd1234'
const RESET_PASSWORD = 'Zxcv9876'

/** 用户列表行：按行内文本过滤，跳过 antd 测高行。 */
function userRow(page: Page, text: string) {
  return page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: text })
    .first()
}

async function openUserAccounts(page: Page) {
  await page.goto('/user-accounts', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '用户账号' })).toBeVisible({
    timeout: NAV_TIMEOUT_MS,
  })
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT_MS,
  })
}

async function searchUser(page: Page, keyword: string) {
  const input = page.locator('#user-account-search:visible').first()
  await expect(input).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await input.fill(keyword)
  await input.press('Enter')
}

async function adminPost(
  request: APIRequestContext,
  path: string,
  data: unknown,
) {
  const session = await getPasswordSession(request)
  return request.post(`${e2eApiBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': randomUUID(),
    },
    data,
  })
}

/** 兜底自清理：按登录名查列表并删除自建账号，避免污染库。 */
async function deleteUserByLoginNameBestEffort(
  request: APIRequestContext,
  loginName: string,
) {
  const { ok, data } = await apiGetJson(request, '/users', {
    page: 0,
    size: 50,
    keyword: loginName,
  })
  if (!ok) return
  const rows = Array.isArray(data?.content)
    ? (data.content as Array<Record<string, unknown>>)
    : []
  for (const row of rows) {
    if (String(row.loginName) === loginName) {
      await deleteModuleRecordBestEffort(request, '/users', String(row.id))
    }
  }
}

function assignedRoleIds(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.map((value) => String(value))
  }
  const roles = (payload as { roles?: unknown } | null)?.roles
  if (Array.isArray(roles)) {
    return roles.map((role) => String((role as { id?: unknown }).id))
  }
  return []
}

test.describe('用户账号管理真实操作', () => {
  test.setTimeout(150_000)

  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('新建 → 编辑 → 分配角色 → 重置密码 → 停用 → 删除', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const suffix = `${Date.now()}`
    const loginName = `e2e_user_${suffix}`
    const userName = `E2E临时用户${suffix}`
    const editedName = `${userName}改`
    const roleCode = `E2E_USR_ROLE_${suffix}`
    const roleName = `E2E用户角色${suffix}`
    let roleId = ''
    let userId = ''

    try {
      // 准备一个非超管角色（无权限），用于验证角色分配。
      const roleResponse = await adminPost(page.request, '/roles', {
        code: roleCode,
        name: roleName,
        description: 'E2E 用户角色分配',
      })
      expect(roleResponse.status()).toBe(201)
      roleId = String(((await roleResponse.json()) as { id: unknown }).id)

      await openUserAccounts(page)

      // 1. 新建临时普通用户
      await page.getByRole('button', { name: buttonName('新建用户') }).click()
      const createModal = page.locator('.ant-modal:visible').last()
      await expect(createModal).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await createModal.locator('#loginName').fill(loginName)
      await createModal.locator('#userName').fill(userName)
      await createModal.locator('#password').fill(TEMP_PASSWORD)
      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /\/users(\?|$)/.test(response.url()),
        { timeout: NAV_TIMEOUT_MS },
      )
      await createModal
        .locator('.ant-modal-footer .ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      const createResponse = await createResponsePromise
      expect(createResponse.status()).toBe(201)
      userId = String(((await createResponse.json()) as { id: unknown }).id)
      await expect(createModal).toBeHidden({ timeout: NAV_TIMEOUT_MS })

      // 2. 列表可见
      await searchUser(page, loginName)
      const createdRow = userRow(page, loginName)
      await expect(createdRow).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await expect(createdRow).toContainText(userName)

      // 3. 编辑：登录名只读，姓名可改
      await createdRow
        .getByRole('button', { name: '编辑' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const editModal = page.locator('.ant-modal:visible').last()
      await expect(editModal).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await expect(editModal.locator('#loginName')).toBeDisabled()
      await editModal.locator('#userName').fill(editedName)
      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/users/${userId}`),
        { timeout: NAV_TIMEOUT_MS },
      )
      await editModal
        .locator('.ant-modal-footer .ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await updateResponsePromise).status()).toBe(200)
      await expect(editModal).toBeHidden({ timeout: NAV_TIMEOUT_MS })
      await searchUser(page, loginName)
      await expect(userRow(page, loginName)).toContainText(editedName, {
        timeout: NAV_TIMEOUT_MS,
      })

      // 4. 分配角色（多选）
      await userRow(page, loginName)
        .getByRole('button', { name: '分配角色' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const rolesModal = page.locator('.ant-modal:visible').last()
      await expect(rolesModal).toContainText('分配角色', {
        timeout: NAV_TIMEOUT_MS,
      })
      await rolesModal.locator('#roleIds').click()
      const dropdown = page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
        .last()
      const roleOption = dropdown
        .locator('.ant-select-item-option')
        .filter({ hasText: roleName })
        .first()
      await expect(roleOption).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await roleOption.click()
      await page.keyboard.press('Escape')
      const rolesResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/users/${userId}/roles`),
        { timeout: NAV_TIMEOUT_MS },
      )
      await rolesModal
        .locator('.ant-modal-footer .ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await rolesResponsePromise).status()).toBeLessThan(400)
      await expect(rolesModal).toBeHidden({ timeout: NAV_TIMEOUT_MS })

      const rolesCheck = await apiGetJson(
        page.request,
        `/users/${userId}/roles`,
      )
      expect(rolesCheck.ok).toBe(true)
      expect(assignedRoleIds(rolesCheck.data)).toContain(roleId)

      // 5. 删除自己应被后端拒绝（403）
      const session = await getPasswordSession(page.request)
      const selfDelete = await page.request.delete(
        `${e2eApiBaseUrl()}/users/${session.user.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'X-Idempotency-Key': randomUUID(),
          },
        },
      )
      expect(selfDelete.status()).toBe(403)

      // 6. 停用账号
      const disableResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' &&
          response.url().includes(`/users/${userId}/status`),
        { timeout: NAV_TIMEOUT_MS },
      )
      await userRow(page, loginName)
        .getByRole('button', { name: buttonName('停用') })
        .click({ timeout: NAV_TIMEOUT_MS })
      const statusConfirm = page.locator('.ant-modal-confirm:visible').last()
      await expect(statusConfirm).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await statusConfirm
        .locator('.ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await disableResponsePromise).status()).toBe(200)
      await expect(userRow(page, loginName)).toContainText('禁用', {
        timeout: NAV_TIMEOUT_MS,
      })

      // 7. 重置密码
      await userRow(page, loginName)
        .getByRole('button', { name: '重置密码' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const resetModal = page.locator('.ant-modal:visible').last()
      await expect(resetModal).toContainText('重置密码', {
        timeout: NAV_TIMEOUT_MS,
      })
      await resetModal.locator('#newPassword').fill(RESET_PASSWORD)
      await resetModal.locator('#confirmPassword').fill(RESET_PASSWORD)
      const resetResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('password-resets'),
        { timeout: NAV_TIMEOUT_MS },
      )
      await resetModal
        .locator('.ant-modal-footer .ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await resetResponsePromise).status()).toBe(204)
      await expect(resetModal).toBeHidden({ timeout: NAV_TIMEOUT_MS })

      // 8. 删除临时账号（软删）
      const deleteResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' &&
          response.url().includes(`/users/${userId}`),
        { timeout: NAV_TIMEOUT_MS },
      )
      await userRow(page, loginName)
        .getByRole('button', { name: '删除' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const deleteConfirm = page.locator('.ant-modal-confirm:visible').last()
      await expect(deleteConfirm).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await deleteConfirm
        .locator('.ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await deleteResponsePromise).status()).toBe(204)
      await searchUser(page, loginName)
      await expect(userRow(page, loginName)).toHaveCount(0, {
        timeout: NAV_TIMEOUT_MS,
      })

      await assertNoFatalUiErrors()
    } finally {
      await deleteUserByLoginNameBestEffort(page.request, loginName)
      if (roleId) {
        await deleteModuleRecordBestEffort(page.request, '/roles', roleId)
      }
    }
  })

  test('普通用户越权访问受保护接口返回 403', async ({ page, browser }) => {
    const suffix = `${Date.now()}`
    const loginName = `e2e_plain_${suffix}`
    const userName = `E2E普通用户${suffix}`
    let userContext: BrowserContext | undefined
    let userPage: Page | undefined
    let tempUserToken: string | undefined

    try {
      const createResponse = await adminPost(page.request, '/users', {
        loginName,
        userName,
        password: TEMP_PASSWORD,
        status: 'NORMAL',
      })
      expect(createResponse.status()).toBe(201)

      userContext = await browser.newContext({
        baseURL: APP_BASE_URL,
        locale: 'zh-CN',
      })
      userPage = await userContext.newPage()

      // UI 登录临时普通用户
      await userPage.goto('/login', { waitUntil: 'domcontentloaded' })
      await userPage.locator('#loginName').fill(loginName)
      await userPage.locator('#password').fill(TEMP_PASSWORD)
      await userPage.getByRole('button', { name: /登录|Sign In/i }).click()
      await expect(userPage).toHaveURL(/\/dashboard(?:\?|$)/, {
        timeout: NAV_TIMEOUT_MS,
      })
      const token = await userPage.evaluate(() =>
        localStorage.getItem('aries-token'),
      )
      expect(token).toBeTruthy()
      tempUserToken = token ?? undefined
      await userPage.evaluate(() => {
        localStorage.setItem('leo-locale', 'zh-CN')
      })

      // 受保护接口应 403
      const authHeaders = { Authorization: `Bearer ${token}` }
      const salesResponse = await userPage.request.get(
        `${e2eApiBaseUrl()}/sales-orders?page=0&size=1`,
        { headers: authHeaders },
      )
      expect(salesResponse.status()).toBe(403)
      const usersResponse = await userPage.request.get(
        `${e2eApiBaseUrl()}/users?page=0&size=1`,
        { headers: authHeaders },
      )
      expect(usersResponse.status()).toBe(403)

      // 页面优雅降级：无权限打开用户账号页显示加载失败而非崩溃
      await userPage.goto('/user-accounts', { waitUntil: 'domcontentloaded' })
      await expect(userPage.getByText('用户账号加载失败').first()).toBeVisible({
        timeout: NAV_TIMEOUT_MS,
      })
    } finally {
      // 先注销以吊销该账号的刷新会话，再软删账号。
      if (userPage && tempUserToken) {
        await userPage.request
          .post(`${e2eApiBaseUrl()}/auth/logout`, {
            headers: {
              Authorization: `Bearer ${tempUserToken}`,
              'X-Idempotency-Key': randomUUID(),
            },
          })
          .catch(() => undefined)
      }
      await userContext?.close()
      await deleteUserByLoginNameBestEffort(page.request, loginName)
    }
  })
})
