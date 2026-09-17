import { randomUUID } from 'node:crypto'
import {
  type APIRequestContext,
  type BrowserContext,
  expect,
  type Page,
} from '@playwright/test'
import {
  clearCachedAuthSession,
  e2eApiBaseUrl,
  getPasswordSession,
} from './support/api-key'
import {
  APP_BASE_URL,
  buttonName,
  gotoRoute,
  loginAsE2eUser,
} from './support/business-e2e'
import {
  cleanupMultiRoleAccount,
  createMultiRoleAccount,
  currentAccessToken,
  loginMultiRoleAccount,
  logoutBrowserSession,
} from './support/multi-role-account'
import { test } from './support/test'

const NAV_TIMEOUT = 30_000
const TTL_TIMEOUT = 150_000
const TEST_PROJECT_ID = '900000000000000100'
const TEST_PROJECT_NAME = 'E2E比价并发项目'
const TON_INPUT = 'input[data-ton]'
const TOUR_KEY = 'aries-price-compare-tour'

type Rec = Record<string, unknown>

const createdSheetIds: string[] = []

function idOf(record: Rec): string {
  return String(record.id)
}

function defaultItem(overrides: Rec = {}): Rec {
  return {
    category: '螺纹钢',
    material: 'HRB400',
    spec: 16,
    length: '9米',
    ton: 5,
    prices: [{ brandName: '万泰', spotPrice: 3200 }],
    ...overrides,
  }
}

function sheetBody(overrides: Rec = {}): Rec {
  return {
    name: `E2E-EL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    projectId: TEST_PROJECT_ID,
    projectName: TEST_PROJECT_NAME,
    orderDate: '2026-09-17',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    locked: false,
    specQuantityLocked: false,
    brands: [
      { brandName: '万泰', freight: 10, sortOrder: 0 },
      { brandName: '中天', freight: 30, sortOrder: 1 },
    ],
    items: [defaultItem()],
    ...overrides,
  }
}

async function sendApi(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: { data?: unknown; version?: string },
  token: string,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': randomUUID(),
  }
  if (options.version) headers['X-Resource-Version'] = options.version
  const url = `${e2eApiBaseUrl()}${path}`
  if (method === 'GET') return request.get(url, { headers })
  if (method === 'POST')
    return request.post(url, { headers, data: options.data ?? {} })
  if (method === 'PUT')
    return request.put(url, { headers, data: options.data ?? {} })
  return request.delete(url, { headers })
}

async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: { data?: unknown; version?: string } = {},
) {
  const session = await getPasswordSession(request)
  const response = await sendApi(
    request,
    method,
    path,
    options,
    session.accessToken,
  )
  if (response.status() !== 401) return response
  clearCachedAuthSession()
  const refreshed = await getPasswordSession(request)
  return sendApi(request, method, path, options, refreshed.accessToken)
}

async function ensureTestProjectConfig(request: APIRequestContext) {
  const current = await apiRequest(
    request,
    'GET',
    `/quote-project-configs/${TEST_PROJECT_ID}`,
  )
  expect(current.status()).toBe(200)
  const body = (await current.json()) as Rec
  const saved = await apiRequest(
    request,
    'PUT',
    `/quote-project-configs/${TEST_PROJECT_ID}`,
    {
      version: String(body.version ?? '0'),
      data: {
        lengthPremium: 30,
        hrb400eFallback: false,
        products: [],
        designatedBrands: [],
        brands: [
          { brandName: '万泰', freight: 10, categories: [], sortOrder: 0 },
          { brandName: '中天', freight: 30, categories: [], sortOrder: 1 },
        ],
      },
    },
  )
  expect([200, 201]).toContain(saved.status())
}

async function createSheet(
  request: APIRequestContext,
  overrides: Rec = {},
): Promise<Rec> {
  const response = await apiRequest(request, 'POST', '/quote-sheets', {
    data: sheetBody(overrides),
  })
  expect(response.status(), await response.text()).toBe(201)
  const record = (await response.json()) as Rec
  createdSheetIds.push(idOf(record))
  return record
}

async function getSheet(request: APIRequestContext, id: string): Promise<Rec> {
  const response = await apiRequest(request, 'GET', `/quote-sheets/${id}`)
  expect(response.status()).toBe(200)
  return (await response.json()) as Rec
}

async function fetchLock(
  request: APIRequestContext,
  id: string,
): Promise<{ locked: boolean; mine: boolean }> {
  const response = await apiRequest(
    request,
    'GET',
    `/quote-sheets/${id}/edit-locks`,
  )
  expect(response.status()).toBe(200)
  const body = (await response.json()) as Rec
  return { locked: Boolean(body.locked), mine: Boolean(body.mine) }
}

async function waitForLockHeld(request: APIRequestContext, id: string) {
  await expect
    .poll(async () => (await fetchLock(request, id)).mine, {
      timeout: NAV_TIMEOUT,
      message: `批次 ${id} 的编辑锁应由本人持有`,
    })
    .toBe(true)
}

function waitItemWrite(page: Page, sheetId: string) {
  return page.waitForResponse(
    (response) => {
      const request = response.request()
      return (
        (request.method() === 'PUT' || request.method() === 'POST') &&
        response.url().includes(`/quote-sheets/${sheetId}/items`)
      )
    },
    { timeout: NAV_TIMEOUT },
  )
}

async function openAdminPriceCompare(page: Page) {
  await loginAsE2eUser(page)
  await ensureTestProjectConfig(page.request)
  await page.evaluate((key) => localStorage.setItem(key, '1'), TOUR_KEY)
  await gotoRoute(page, '/price-compare')
  await expect(
    page.getByRole('heading', { name: '报单比价' }).first(),
  ).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT,
  })
}

async function openSecondUserPriceCompare(page: Page) {
  await page.evaluate((key) => localStorage.setItem(key, '1'), TOUR_KEY)
  await gotoRoute(page, '/price-compare')
  await expect(
    page.getByRole('heading', { name: '报单比价' }).first(),
  ).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT,
  })
}

async function selectBatch(page: Page, name: string) {
  const option = page
    .locator('.ant-segmented-item')
    .filter({ hasText: name })
    .first()
  await expect(option).toBeVisible({ timeout: NAV_TIMEOUT })
  await option.click()
}

async function setTon(page: Page, value: number) {
  const input = page.locator(TON_INPUT).first()
  await expect(input).toBeEnabled({ timeout: NAV_TIMEOUT })
  await input.fill(String(value))
  await input.press('Enter')
}

const editLockBanner = (page: Page) =>
  page.locator('.price-compare-edit-lock:visible').first()

test.describe('报单比价编辑锁多角色与极端场景', () => {
  test.setTimeout(120_000)

  test.afterEach(async ({ request }) => {
    while (createdSheetIds.length) {
      const id = createdSheetIds.pop()
      if (!id) continue
      await apiRequest(request, 'DELETE', `/quote-sheets/${id}`).catch(
        () => undefined,
      )
    }
  })

  test('他人签出后第二账号只读并显示占用人', async ({ browser, request }) => {
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const name = String(sheet.name)
    const account = await createMultiRoleAccount(request, { label: 'readonly' })
    let adminCtx: BrowserContext | undefined
    let userCtx: BrowserContext | undefined
    try {
      adminCtx = await browser.newContext({ baseURL: APP_BASE_URL })
      const adminPage = await adminCtx.newPage()
      await openAdminPriceCompare(adminPage)
      await selectBatch(adminPage, name)
      await waitForLockHeld(request, id)

      const user = await loginMultiRoleAccount(browser, account)
      userCtx = user.context
      await openSecondUserPriceCompare(user.page)
      await selectBatch(user.page, name)

      const adminLoginName = String(
        (await getPasswordSession(request)).user.loginName,
      )
      const banner = editLockBanner(user.page)
      await expect(banner).toContainText('正在编辑该批次', {
        timeout: NAV_TIMEOUT,
      })
      await expect(banner).toContainText(adminLoginName)
      await expect(
        banner.getByRole('button', { name: buttonName('申请接管') }),
      ).toBeVisible()
      // 只读: 吨位/添加行/品牌拖拽等编辑类控件禁用
      await expect(user.page.locator(TON_INPUT).first()).toBeDisabled()
      await expect(
        user.page.getByRole('button', { name: buttonName('添加一行') }),
      ).toBeDisabled()
      await expect(
        user.page.locator('.price-compare-table .ant-select-disabled').first(),
      ).toBeVisible()
      await expect(
        user.page
          .locator('.price-compare-row-drag[aria-disabled="true"]')
          .first(),
      ).toBeVisible()

      // 只读期间不产生写请求
      let writes = 0
      user.page.on('request', (req) => {
        if (
          req.method() !== 'GET' &&
          !req.url().includes('edit-locks') &&
          req.url().includes('/quote-sheets')
        ) {
          writes += 1
        }
      })
      await user.page.waitForTimeout(1_500)
      expect(writes, '只读态不应发起报价单写请求').toBe(0)
    } finally {
      await adminCtx?.close()
      await userCtx?.close()
      await cleanupMultiRoleAccount(request, account)
    }
  })

  test('强制接管成功后原持有人保存被 409', async ({ browser, request }) => {
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const name = String(sheet.name)
    const account = await createMultiRoleAccount(request, { label: 'takeover' })
    let adminCtx: BrowserContext | undefined
    let userCtx: BrowserContext | undefined
    try {
      adminCtx = await browser.newContext({ baseURL: APP_BASE_URL })
      const adminPage = await adminCtx.newPage()
      await openAdminPriceCompare(adminPage)
      await selectBatch(adminPage, name)
      await waitForLockHeld(request, id)

      const user = await loginMultiRoleAccount(browser, account)
      userCtx = user.context
      await openSecondUserPriceCompare(user.page)
      await selectBatch(user.page, name)
      const banner = editLockBanner(user.page)
      await expect(banner).toContainText('正在编辑该批次', {
        timeout: NAV_TIMEOUT,
      })

      await banner.getByRole('button', { name: buttonName('申请接管') }).click()
      const confirm = user.page.locator('.ant-modal-confirm:visible').last()
      await expect(confirm).toContainText('申请接管批次', {
        timeout: NAV_TIMEOUT,
      })
      const takeoverResponse = user.page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes(`/quote-sheets/${id}/edit-locks`) &&
          response.url().includes('force=true'),
        { timeout: NAV_TIMEOUT },
      )
      await confirm
        .getByRole('button', { name: buttonName('强制接管') })
        .click()
      expect(
        (await takeoverResponse).status(),
        'force 接管应成功',
      ).toBeLessThan(400)

      // B 取得编辑权
      await expect(editLockBanner(user.page)).toContainText(
        '你正在编辑该批次',
        {
          timeout: NAV_TIMEOUT,
        },
      )
      await expect(user.page.locator(TON_INPUT).first()).toBeEnabled()

      // A 的后续保存: 锁已易主 -> 409
      const conflicted = waitItemWrite(adminPage, id)
      await setTon(adminPage, 23)
      expect((await conflicted).status(), '原持有人写应 409').toBe(409)
      // 服务端值保持不变
      expect(
        Number(((await getSheet(request, id)).items as Rec[])[0].ton),
      ).toBe(5)
    } finally {
      await adminCtx?.close()
      await userCtx?.close()
      await cleanupMultiRoleAccount(request, account)
    }
  })

  test('SPA 切换到其它标签页立即释放编辑锁, 返回后重新签出', async ({
    browser,
    request,
  }) => {
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const name = String(sheet.name)
    let adminCtx: BrowserContext | undefined
    try {
      adminCtx = await browser.newContext({ baseURL: APP_BASE_URL })
      const page = await adminCtx.newPage()
      await openAdminPriceCompare(page)
      await selectBatch(page, name)
      await waitForLockHeld(request, id)

      // 切到工作台标签: 视图 keep-alive 不卸载, 但仍应归还编辑锁
      const released = page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' &&
          response.url().includes(`/quote-sheets/${id}/edit-locks`),
        { timeout: NAV_TIMEOUT },
      )
      await page
        .locator('.leo-tabbar-label')
        .filter({ hasText: '工作台' })
        .first()
        .click()
      expect(
        (await released).status(),
        '离开路由应 DELETE 释放锁',
      ).toBeLessThan(400)
      await expect
        .poll(async () => (await fetchLock(request, id)).locked, {
          timeout: NAV_TIMEOUT,
          message: '离开比价路由后锁应释放',
        })
        .toBe(false)

      // 返回比价标签: 重新签出
      const reacquired = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes(`/quote-sheets/${id}/edit-locks`),
        { timeout: NAV_TIMEOUT },
      )
      await page
        .locator('.leo-tabbar-label')
        .filter({ hasText: '报单比价' })
        .first()
        .click()
      expect((await reacquired).status(), '返回路由应重新签出锁').toBeLessThan(
        400,
      )
      await waitForLockHeld(request, id)
    } finally {
      await adminCtx?.close()
    }
  })

  test('普通用户越权访问受保护报价接口返回 403', async ({
    browser,
    request,
  }) => {
    const account = await createMultiRoleAccount(request, {
      label: 'plain',
      permissions: [],
    })
    let userCtx: BrowserContext | undefined
    try {
      const user = await loginMultiRoleAccount(browser, account)
      userCtx = user.context
      const token = await currentAccessToken(user.page)
      expect(token).toBeTruthy()

      const list = await user.page.request.get(
        `${e2eApiBaseUrl()}/quote-sheets?page=0&size=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      expect(list.status(), '无权限读取报价单应 403').toBe(403)

      const config = await user.page.request.get(
        `${e2eApiBaseUrl()}/quote-project-configs/${TEST_PROJECT_ID}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      expect(config.status(), '无权限读取比价配置应 403').toBe(403)
    } finally {
      if (userCtx) {
        const page = userCtx.pages()[0]
        if (page) await logoutBrowserSession(page)
        await userCtx.close()
      }
      await cleanupMultiRoleAccount(request, account)
    }
  })

  test('锁 TTL 过期后他人无需 force 即可接管', async ({ browser, request }) => {
    test.setTimeout(200_000)
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const name = String(sheet.name)
    const account = await createMultiRoleAccount(request, { label: 'ttl' })
    let adminCtx: BrowserContext | undefined
    let userCtx: BrowserContext | undefined
    try {
      adminCtx = await browser.newContext({ baseURL: APP_BASE_URL })
      const adminPage = await adminCtx.newPage()
      await openAdminPriceCompare(adminPage)
      await selectBatch(adminPage, name)
      await waitForLockHeld(request, id)

      // 关闭 A 页面: 浏览器上下文销毁, 客户端不再续约也不再显式释放
      await adminCtx.close()
      adminCtx = undefined

      // 等待服务端 120s TTL 自然过期
      await expect
        .poll(async () => (await fetchLock(request, id)).locked, {
          timeout: TTL_TIMEOUT,
          intervals: [2_000],
          message: '编辑锁应在 TTL 后自动过期',
        })
        .toBe(false)

      // B 无需 force 即可取得编辑权
      const user = await loginMultiRoleAccount(browser, account)
      userCtx = user.context
      await openSecondUserPriceCompare(user.page)
      await selectBatch(user.page, name)
      await expect(editLockBanner(user.page)).toContainText(
        '你正在编辑该批次',
        {
          timeout: NAV_TIMEOUT,
        },
      )
      const lock = await fetchLock(request, id)
      expect(lock.mine, '管理员探针不应持有').toBe(false)
      expect(lock.locked).toBe(true)
    } finally {
      await adminCtx?.close()
      await userCtx?.close()
      await cleanupMultiRoleAccount(request, account)
    }
  })

  test('续约请求飞行中关闭页面: 不再续约且锁按 TTL 释放', async ({
    browser,
    request,
  }) => {
    test.setTimeout(210_000)
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const name = String(sheet.name)
    const account = await createMultiRoleAccount(request, { label: 'renew' })
    let adminCtx: BrowserContext | undefined
    let userCtx: BrowserContext | undefined
    try {
      adminCtx = await browser.newContext({ baseURL: APP_BASE_URL })
      const adminPage = await adminCtx.newPage()
      await openAdminPriceCompare(adminPage)
      // 在签出前安装页面时钟, 以便后续 fastForward 触发 60s 续约定时器
      await adminPage.clock.install()
      await selectBatch(adminPage, name)
      await waitForLockHeld(request, id)

      let renewals = 0
      let renewalPendingResolve: (() => void) | undefined
      const renewalPending = new Promise<void>((resolve) => {
        renewalPendingResolve = resolve
      })
      await adminPage.route('**/quote-sheets/**/edit-locks*', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue()
          return
        }
        renewals += 1
        renewalPendingResolve?.()
        // 挂起续约请求, 模拟"飞行中"
        await new Promise(() => {})
      })
      await adminPage.clock.fastForward(65_000)
      await renewalPending
      expect(renewals, '应触发一次续约请求').toBe(1)

      // 续约仍在飞行中时关闭页面/上下文
      await adminCtx.close()
      adminCtx = undefined

      // 关闭后不得再有续约: 锁只能按 TTL 自然过期
      await expect
        .poll(async () => (await fetchLock(request, id)).locked, {
          timeout: TTL_TIMEOUT,
          intervals: [2_000],
          message: '关闭页面后锁应仅按 TTL 过期',
        })
        .toBe(false)

      const user = await loginMultiRoleAccount(browser, account)
      userCtx = user.context
      await openSecondUserPriceCompare(user.page)
      await selectBatch(user.page, name)
      await expect(editLockBanner(user.page)).toContainText(
        '你正在编辑该批次',
        {
          timeout: NAV_TIMEOUT,
        },
      )
    } finally {
      await adminCtx?.close()
      await userCtx?.close()
      await cleanupMultiRoleAccount(request, account)
    }
  })
})
