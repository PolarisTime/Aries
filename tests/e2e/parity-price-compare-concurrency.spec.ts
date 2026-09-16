import { randomUUID } from 'node:crypto'
import {
  type APIRequestContext,
  type Browser,
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
import { test } from './support/test'

const NAV_TIMEOUT = 30_000
/**
 * 专用测试项目 id(雪花字符串)。使用独立 id 而非真实项目, 避免污染既有
 * quote-project-configs; 配置写入幂等, 可重复运行。
 */
const TEST_PROJECT_ID = '900000000000000100'
const TEST_PROJECT_NAME = 'E2E比价并发项目'
const TON_INPUT = 'input[data-ton]'
const TOUR_KEY = 'aries-price-compare-tour'

type Rec = Record<string, unknown>

const createdSheetIds: string[] = []

function idOf(record: Rec): string {
  return String(record.id)
}

function itemIdOf(record: Rec): string {
  const items = (record.items ?? []) as Rec[]
  expect(items.length, '报价单应包含商品行').toBeGreaterThan(0)
  return String(items[0].id)
}

function tonOf(record: Rec): number {
  const items = (record.items ?? []) as Rec[]
  return Number(items[0].ton)
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
    name: `E2E-PC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

/**
 * 真实模式后端仅保留 3 个并发 refresh 会话, 多次登录会互相驱逐。
 * 这里在 401 时清理会话缓存并重登一次, 保证测试断言不因会话驱逐而误报。
 */
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

function waitHeaderSave(page: Page, sheetId: string) {
  return page.waitForResponse(
    (response) => {
      if (response.request().method() !== 'PUT') return false
      const { pathname } = new URL(response.url())
      return pathname.endsWith(`/quote-sheets/${sheetId}`)
    },
    { timeout: NAV_TIMEOUT },
  )
}

async function openPriceCompare(page: Page) {
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

async function newLoggedInPage(
  browser: Browser,
  ensureConfig = false,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: APP_BASE_URL,
    locale: 'zh-CN',
  })
  const page = await context.newPage()
  await loginAsE2eUser(page)
  if (ensureConfig) await ensureTestProjectConfig(page.request)
  await page.evaluate((key) => localStorage.setItem(key, '1'), TOUR_KEY)
  await gotoRoute(page, '/price-compare')
  await expect(
    page.getByRole('heading', { name: '报单比价' }).first(),
  ).toBeVisible({ timeout: NAV_TIMEOUT })
  return { context, page }
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

const conflictModal = (page: Page) =>
  page.locator('.ant-modal-confirm:visible').last()

test.describe('报单比价极端场景', () => {
  test.afterEach(async ({ request }) => {
    while (createdSheetIds.length) {
      const id = createdSheetIds.pop()
      if (!id) continue
      await apiRequest(request, 'DELETE', `/quote-sheets/${id}`).catch(
        () => undefined,
      )
    }
  })

  test('API 契约: 缺版本 428 / 旧版本 412 / 数字雪花ID 400 / 锁定与边界 422', async ({
    request,
  }) => {
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const headerBody = {
      name: 'E2E-PC-契约',
      orderDate: '2026-09-17',
      refDate: '2026-09-16',
      refPeriod: '上午',
      lengthPremium: 30,
      locked: false,
      specQuantityLocked: false,
    }

    const missing = await apiRequest(request, 'PUT', `/quote-sheets/${id}`, {
      data: headerBody,
    })
    expect(missing.status(), '缺少 X-Resource-Version 应 428').toBe(428)

    const stale = await apiRequest(request, 'PUT', `/quote-sheets/${id}`, {
      data: headerBody,
      version: '1',
    })
    expect(stale.status(), '旧版本写应 412').toBe(412)

    const numeric = await apiRequest(request, 'PUT', `/quote-sheets/${id}`, {
      data: { ...headerBody, projectId: 900000000000000100 },
      version: '0',
    })
    expect(numeric.status(), '数值型雪花 ID 应 400').toBe(400)

    // 参照锁: 锁定后改 refDate 应 422
    const refLocked = await createSheet(request, { locked: true })
    const refLockedId = idOf(refLocked)
    const refChange = await apiRequest(
      request,
      'PUT',
      `/quote-sheets/${refLockedId}`,
      {
        // 不携带 locked(表头 PATCH 保留原值 true), 只改参照日期
        data: {
          name: 'E2E-PC-参照锁',
          orderDate: '2026-09-17',
          refDate: '2026-09-15',
          refPeriod: '上午',
          lengthPremium: 30,
        },
        version: String(refLocked.version),
      },
    )
    expect(refChange.status(), '参照锁定期改参照日期应 422').toBe(422)

    // 锁定规格数量: 改规格/加行/删行应 422
    const lockedSheet = await createSheet(request, {
      specQuantityLocked: true,
    })
    const lockedId = idOf(lockedSheet)
    const lockedVersion = String(lockedSheet.version)
    const itemId = itemIdOf(lockedSheet)
    const changed = await apiRequest(
      request,
      'PUT',
      `/quote-sheets/${lockedId}/items/${itemId}`,
      { data: defaultItem({ spec: 20 }), version: lockedVersion },
    )
    expect(changed.status(), '锁定后改规格应 422').toBe(422)
    const added = await apiRequest(
      request,
      'POST',
      `/quote-sheets/${lockedId}/items`,
      { data: defaultItem({ spec: 18 }), version: lockedVersion },
    )
    expect(added.status(), '锁定后加行应 422').toBe(422)
    const deleted = await apiRequest(
      request,
      'DELETE',
      `/quote-sheets/${lockedId}/items/${itemId}`,
      { version: lockedVersion },
    )
    expect(deleted.status(), '锁定后删行应 422').toBe(422)

    // 输入边界
    const negative = await apiRequest(request, 'POST', '/quote-sheets', {
      data: sheetBody({ items: [defaultItem({ ton: -1 })] }),
    })
    expect(negative.status(), '负吨位应 422').toBe(422)
    const longRemark = await apiRequest(request, 'POST', '/quote-sheets', {
      data: sheetBody({ remark: 'x'.repeat(300) }),
    })
    expect(longRemark.status(), '超长备注应 422').toBe(422)
    const dupBrand = await apiRequest(request, 'POST', '/quote-sheets', {
      data: sheetBody({
        items: [
          defaultItem({
            prices: [
              { brandName: '万泰', spotPrice: 3200 },
              { brandName: '万泰', spotPrice: 3300 },
            ],
          }),
        ],
      }),
    })
    expect(dupBrand.status(), '同品牌重复现货价应 422').toBe(422)
  })

  test('两上下文并发: 旧版本写触发 412 冲突, 以我的覆盖收敛', async ({
    browser,
    request,
  }) => {
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const name = String(sheet.name)
    let ctxA: BrowserContext | undefined
    let ctxB: BrowserContext | undefined
    try {
      const a = await newLoggedInPage(browser, true)
      ctxA = a.context
      const b = await newLoggedInPage(browser)
      ctxB = b.context
      const api = a.page.request
      await selectBatch(a.page, name)
      await selectBatch(b.page, name)

      const saved = waitItemWrite(b.page, id)
      await setTon(b.page, 11)
      expect((await saved).status(), 'B 保存应成功').toBe(200)

      const conflicted = waitItemWrite(a.page, id)
      await setTon(a.page, 22)
      expect((await conflicted).status(), 'A 旧版本写应 412').toBe(412)

      const modal = conflictModal(a.page)
      await expect(modal).toContainText('单据版本已变更', {
        timeout: NAV_TIMEOUT,
      })

      const overridden = waitHeaderSave(a.page, id)
      await modal
        .getByRole('button', { name: buttonName('以我的覆盖') })
        .click()
      expect((await overridden).status(), '覆盖重发应成功').toBe(200)
      await expect(modal).toBeHidden({ timeout: NAV_TIMEOUT })

      expect(tonOf(await getSheet(api, id)), '覆盖后为 A 的值').toBe(22)
    } finally {
      await ctxA?.close()
      await ctxB?.close()
    }
  })

  test('两上下文并发: 旧版本写后重新加载丢弃本地改动', async ({
    browser,
    request,
  }) => {
    const sheet = await createSheet(request)
    const id = idOf(sheet)
    const name = String(sheet.name)
    let ctxA: BrowserContext | undefined
    let ctxB: BrowserContext | undefined
    try {
      const a = await newLoggedInPage(browser, true)
      ctxA = a.context
      const b = await newLoggedInPage(browser)
      ctxB = b.context
      const api = a.page.request
      await selectBatch(a.page, name)
      await selectBatch(b.page, name)

      const saved = waitItemWrite(b.page, id)
      await setTon(b.page, 11)
      expect((await saved).status()).toBe(200)

      const conflicted = waitItemWrite(a.page, id)
      await setTon(a.page, 22)
      expect((await conflicted).status()).toBe(412)

      const modal = conflictModal(a.page)
      await expect(modal).toContainText('单据版本已变更', {
        timeout: NAV_TIMEOUT,
      })
      await modal.getByRole('button', { name: buttonName('重新加载') }).click()
      await expect(modal).toBeHidden({ timeout: NAV_TIMEOUT })

      await expect(a.page.locator(TON_INPUT).first()).toHaveValue('11', {
        timeout: NAV_TIMEOUT,
      })
      expect(tonOf(await getSheet(api, id)), '服务端保持 B 的值').toBe(11)
    } finally {
      await ctxA?.close()
      await ctxB?.close()
    }
  })

  test('同一上下文连续快速写: 版本链正确且无丢失更新', async ({ page }) => {
    const api = page.request
    const sheet = await createSheet(api)
    const id = idOf(sheet)
    const name = String(sheet.name)
    await openPriceCompare(page)
    await selectBatch(page, name)

    const versionBefore = Number((await getSheet(api, id)).version)

    const first = waitItemWrite(page, id)
    await setTon(page, 6)
    expect((await first).status()).toBe(200)

    const second = waitItemWrite(page, id)
    await setTon(page, 8)
    expect((await second).status()).toBe(200)

    const fresh = await getSheet(api, id)
    expect(tonOf(fresh)).toBe(8)
    expect(Number(fresh.version)).toBe(versionBefore + 2)
    await expect(conflictModal(page)).toHaveCount(0)
  })

  test('编辑锁 A→B→A 快速切换: 迟到签出响应不误删新锁', async ({ page }) => {
    const api = page.request
    const first = await createSheet(api)
    const second = await createSheet(api)
    const firstId = idOf(first)
    const firstName = String(first.name)
    const secondName = String(second.name)

    await openPriceCompare(page)
    await selectBatch(page, firstName)
    await waitForLockHeld(api, firstId)

    let delayNext = true
    await page.route('**/quote-sheets/**/edit-locks*', async (route) => {
      const isTarget =
        delayNext &&
        route.request().method() === 'POST' &&
        route.request().url().includes(`/quote-sheets/${firstId}/edit-locks`)
      if (isTarget) {
        delayNext = false
        await new Promise((resolve) => setTimeout(resolve, 2_500))
      }
      await route.continue()
    })

    // 切到 B, 再切回 A(该次签出响应被延迟), 再 B, 再 A。
    await selectBatch(page, secondName)
    await selectBatch(page, firstName)
    await selectBatch(page, secondName)
    await selectBatch(page, firstName)
    await page.waitForTimeout(3_000)

    const lock = await fetchLock(api, firstId)
    expect(lock.locked, 'A 的锁应仍然存在').toBe(true)
    expect(lock.mine, 'A 的锁应仍由本人持有').toBe(true)
  })

  test('锁定规格数量: UI 只读 + 后端 422, 解锁放行且参照锁独立', async ({
    page,
  }) => {
    const api = page.request
    const sheet = await createSheet(api)
    const id = idOf(sheet)
    const name = String(sheet.name)
    await openPriceCompare(page)
    await selectBatch(page, name)

    const lockSave = waitHeaderSave(page, id)
    await page
      .getByRole('button', { name: buttonName('锁定规格和数量') })
      .click()
    expect((await lockSave).status()).toBe(200)

    const locked = await getSheet(api, id)
    expect(locked.specQuantityLocked, '服务端应记录规格数量锁').toBe(true)
    expect(locked.locked, '参照锁应保持独立(不随规格锁变化)').toBe(false)

    await expect(page.locator(TON_INPUT).first()).toBeDisabled()
    await expect(
      page.getByRole('button', { name: buttonName('添加一行') }),
    ).toBeDisabled()
    await expect(
      page.locator('.price-compare-table .ant-select-disabled').first(),
    ).toBeVisible()
    await expect(
      page.locator('.price-compare-row-drag[aria-disabled="true"]').first(),
    ).toBeVisible()

    const version = String(locked.version)
    const itemId = itemIdOf(locked)
    expect(
      (
        await apiRequest(api, 'PUT', `/quote-sheets/${id}/items/${itemId}`, {
          data: defaultItem({ spec: 20 }),
          version,
        })
      ).status(),
    ).toBe(422)
    expect(
      (
        await apiRequest(api, 'POST', `/quote-sheets/${id}/items`, {
          data: defaultItem({ spec: 18 }),
          version,
        })
      ).status(),
    ).toBe(422)
    expect(
      (
        await apiRequest(api, 'DELETE', `/quote-sheets/${id}/items/${itemId}`, {
          version,
        })
      ).status(),
    ).toBe(422)

    const unlockSave = waitHeaderSave(page, id)
    await page
      .getByRole('button', { name: buttonName('解锁规格和数量') })
      .click()
    expect((await unlockSave).status()).toBe(200)
    await expect(page.locator(TON_INPUT).first()).toBeEnabled()

    const afterUnlock = await getSheet(api, id)
    expect(afterUnlock.specQuantityLocked).toBe(false)
    const unlocked = await apiRequest(
      api,
      'PUT',
      `/quote-sheets/${id}/items/${itemId}`,
      {
        data: defaultItem({ spec: 20 }),
        version: String(afterUnlock.version),
      },
    )
    expect(unlocked.status(), '解锁后改规格应放行').toBe(200)
  })

  test('保存失败(5xx)不丢编辑: 本地保留, 恢复后补发', async ({ page }) => {
    const api = page.request
    const sheet = await createSheet(api)
    const id = idOf(sheet)
    const name = String(sheet.name)
    await openPriceCompare(page)
    await selectBatch(page, name)

    let failWrites = true
    await page.route('**/quote-sheets/**', async (route) => {
      const method = route.request().method()
      const isWrite =
        method !== 'GET' && !route.request().url().includes('edit-locks')
      if (failWrites && isWrite) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 5000, message: 'e2e injected failure' }),
        })
        return
      }
      await route.continue()
    })

    const failed = waitItemWrite(page, id)
    await setTon(page, 42)
    expect((await failed).status()).toBe(500)
    await expect(page.locator(TON_INPUT).first()).toHaveValue('42')

    // 仍失败时聚焦刷新: 本地编辑不得被静默覆盖
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForTimeout(1_500)
    await expect(page.locator(TON_INPUT).first()).toHaveValue('42')
    expect(tonOf(await getSheet(api, id)), '服务端尚未写入').toBe(5)

    failWrites = false
    const recovered = waitItemWrite(page, id)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    expect((await recovered).status(), '恢复后补发成功').toBe(200)
    await expect
      .poll(async () => tonOf(await getSheet(api, id)), {
        timeout: NAV_TIMEOUT,
      })
      .toBe(42)
  })

  test('项目配置未加载: 编辑不丢失, 配置就绪后补发', async ({ page }) => {
    const api = page.request
    const sheet = await createSheet(api)
    const id = idOf(sheet)
    const name = String(sheet.name)

    // 挂起配置 GET(不 abort, 避免触发应用 ERR_NETWORK 的 server-error 跳转)
    let holdConfig = true
    let releaseConfig: (() => void) | undefined
    await page.route('**/quote-project-configs/**', async (route) => {
      if (holdConfig && route.request().method() === 'GET') {
        await new Promise<void>((resolve) => {
          releaseConfig = resolve
        })
      }
      await route.continue().catch(() => undefined)
    })

    await openPriceCompare(page)
    await selectBatch(page, name)

    let itemWrites = 0
    page.on('request', (req) => {
      if (
        req.method() === 'PUT' &&
        req.url().includes(`/quote-sheets/${id}/items`)
      ) {
        itemWrites += 1
      }
    })

    await setTon(page, 77)
    await page.waitForTimeout(1_500)
    expect(itemWrites, '配置未就绪时不应发送行保存').toBe(0)
    await expect(page.locator(TON_INPUT).first()).toHaveValue('77')
    expect(tonOf(await getSheet(api, id))).toBe(5)

    holdConfig = false
    releaseConfig?.()
    releaseConfig = undefined
    const saved = waitItemWrite(page, id)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    expect((await saved).status(), '配置就绪后补发成功').toBe(200)
    await expect
      .poll(async () => tonOf(await getSheet(api, id)), {
        timeout: NAV_TIMEOUT,
      })
      .toBe(77)
  })

  test('雪花 ID 全程字符串: 响应/行键/请求路径均为字符串 ID', async ({
    page,
  }) => {
    const api = page.request
    const sheet = await createSheet(api)
    const id = idOf(sheet)
    const itemId = itemIdOf(sheet)
    expect(id).toMatch(/^\d{15,20}$/)
    expect(itemId).toMatch(/^\d{15,20}$/)

    const raw = await (
      await apiRequest(api, 'GET', `/quote-sheets/${id}`)
    ).text()
    expect(raw).toMatch(new RegExp(`"id":"${id}"`))
    expect(raw).not.toMatch(new RegExp(`"id":${id}`))

    await openPriceCompare(page)
    await selectBatch(page, String(sheet.name))
    const input = page.locator(TON_INPUT).first()
    await expect(input).toHaveAttribute('data-ton', itemId)

    const writeRequest = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        req.url().includes(`/quote-sheets/${id}/items/${itemId}`),
    )
    await setTon(page, 9)
    const write = await writeRequest
    expect(write.url()).toContain(`/quote-sheets/${id}/items/${itemId}`)
    expect(write.postData() ?? '').not.toMatch(/"id":\s*\d{15,}/)
  })

  test('锁定规格数量后撤销不生效: 本地与服务端保持一致', async ({ page }) => {
    const api = page.request
    const sheet = await createSheet(api)
    const id = idOf(sheet)
    const name = String(sheet.name)
    await openPriceCompare(page)
    await selectBatch(page, name)

    const first = waitItemWrite(page, id)
    await setTon(page, 8)
    expect((await first).status()).toBe(200)

    const second = waitItemWrite(page, id)
    await setTon(page, 9)
    expect((await second).status()).toBe(200)

    const lockSave = waitHeaderSave(page, id)
    await page
      .getByRole('button', { name: buttonName('锁定规格和数量') })
      .click()
    expect((await lockSave).status()).toBe(200)

    // 第一次撤销回退"锁定"历史项, 第二次撤销试图回退吨位; 锁定期间两次都不得生效
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(1_500)
    await expect(
      page.locator(TON_INPUT).first(),
      '锁定后撤销不得回退吨位',
    ).toHaveValue('9')
    expect(tonOf(await getSheet(api, id))).toBe(9)
  })
})
