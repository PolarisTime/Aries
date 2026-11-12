import { randomUUID } from 'node:crypto'
import { type APIRequestContext, expect, type Page } from '@playwright/test'
import {
  clearCachedAuthSession,
  e2eApiBaseUrl,
  getPasswordSession,
} from './support/api-key'
import { gotoRoute, loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

/**
 * 报单比价「现货价唯一来源 = 供应商价格表」回归（2026-11-12）。
 *
 * <p>用户决策：报单比价页**默认禁止手动改价，无例外**。现货价与供应商只能由
 * 「从供应商价格表导入」写入：</p>
 * <ul>
 *   <li>命中报价 → 价 + 供应商一起刷新（锁定行也刷新，行锁只冻结规格/吨位）；</li>
 *   <li>未命中 → 整格清空（价、供应商、代取来源一起清）；</li>
 *   <li>连续两次导入幂等；导入前必须弹确认框，取消不得落库。</li>
 * </ul>
 *
 * <p>本文件锁住三件事：① 格子不接受手工输入（没有 input / select）；② 导入走确认弹窗，
 * 取消不改数据；③ 确认后显示值与「价格表最低价（无则空格）」一致，且重开页面后仍一致。</p>
 *
 * <p>不依赖库里已有的价格表数据：期望值由测试自己从 `/supplier-price-lists/lowest-quotes`
 * 读出来再比对，因此共享开发库无论有没有 万泰/螺纹钢 的报价都能跑。</p>
 */

const NAV_TIMEOUT = 30_000
/** 专用测试项目 id(雪花字符串)，与其它比价用例共用，避免污染真实项目配置。 */
const TEST_PROJECT_ID = '900000000000000100'
const TEST_PROJECT_NAME = 'E2E比价解耦项目'
const TOUR_KEY = 'aries-price-compare-tour'
const BRAND = '万泰'
const LEGACY_SPOT_PRICE = 3200
const CATEGORY = '螺纹钢'
const MATERIAL = 'HRB400'
const SPEC = 16
const LENGTH = '9米'

type Rec = Record<string, unknown>

const createdSheetIds: string[] = []

function idOf(record: Rec): string {
  return String(record.id)
}

function sheetName(): string {
  return `E2E-PS-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function sheetBody(name: string): Rec {
  return {
    name,
    projectId: TEST_PROJECT_ID,
    projectName: TEST_PROJECT_NAME,
    orderDate: '2026-09-17',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    locked: false,
    specQuantityLocked: false,
    brands: [{ brandName: BRAND, freight: 10, sortOrder: 0 }],
    items: [
      {
        category: CATEGORY,
        material: MATERIAL,
        spec: SPEC,
        length: LENGTH,
        ton: 5,
        // 模拟「改造前留下的人工价」：导入后必须被价格表覆盖或被清空，不能原样保留。
        prices: [{ brandName: BRAND, spotPrice: LEGACY_SPOT_PRICE }],
      },
    ],
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
          { brandName: BRAND, freight: 10, categories: [], sortOrder: 0 },
        ],
      },
    },
  )
  expect([200, 201]).toContain(saved.status())
}

async function createSheet(request: APIRequestContext, name: string) {
  const response = await apiRequest(request, 'POST', '/quote-sheets', {
    data: sheetBody(name),
  })
  expect(response.status(), await response.text()).toBe(201)
  const record = (await response.json()) as Rec
  createdSheetIds.push(idOf(record))
  return record
}

/**
 * 清掉比价页的列显隐偏好。
 *
 * <p>品牌列（`brand:<品牌名>`）与备注都可隐藏，且偏好同时存 localStorage 与服务端
 * `account/preferences`（云端漫游）。共享 e2e 账号上残留的「隐藏万泰列」会让表格里
 * 根本不存在 `span[data-spot^="万泰:"]`，测试就会以「元素找不到」失败——与本次改动无关。
 * 因此每次打开页面前把该页的偏好清空，保证品牌列可见。</p>
 */
async function resetPriceCompareColumnSettings(request: APIRequestContext) {
  const current = await apiRequest(request, 'GET', '/account/preferences')
  if (current.status() !== 200) return
  const body = (await current.json()) as { pages?: Record<string, unknown> }
  const pages = { ...(body.pages ?? {}) }
  delete pages['price-compare-sheet']
  await apiRequest(request, 'PUT', '/account/preferences', { data: { pages } })
}

/** 打开比价页并跳过新手引导；比价页是独立视图，无列表页关键字可按。 */
async function openPriceCompare(page: Page) {
  await loginAsE2eUser(page)
  await ensureTestProjectConfig(page.request)
  await resetPriceCompareColumnSettings(page.request)
  await page.evaluate(
    ({ tourKey, pageKey }) => {
      localStorage.setItem(tourKey, '1')
      for (const key of Object.keys(localStorage)) {
        if (key.endsWith(`:${pageKey}`)) localStorage.removeItem(key)
      }
    },
    { tourKey: TOUR_KEY, pageKey: 'price-compare-sheet' },
  )
  await gotoRoute(page, '/price-compare')
  await expect(
    page.getByRole('heading', { name: '报单比价' }).first(),
  ).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT,
  })
}

/** 切到指定批次页签（页面上还有「项目」下拉，必须限定在批次页签内）。 */
async function selectBatch(page: Page, name: string) {
  const option = page
    .locator('.price-compare-batch-tabs .ant-tabs-tab')
    .filter({ hasText: name })
    .first()
  await expect(option).toBeVisible({ timeout: NAV_TIMEOUT })
  await option.click()
}

/** 该批次唯一一行的现货价格子（品牌:行 的 data-spot 以 `BRAND:` 开头）。 */
function spotCell(page: Page) {
  return page
    .locator(`.ant-table-row:visible span[data-spot^="${BRAND}:"]`)
    .first()
}

function supplierCell(page: Page) {
  return page.locator('.ant-table-row:visible .price-compare-supplier').first()
}

/**
 * 从价格表读出该 (品牌, 商品) 的最低报价 —— 与导入用同一接口，避免把期望值写死。
 * 返回 `undefined` 表示价格表里没有这个商品（导入后该格应为「—」）。
 */
async function expectedSpotFromPriceList(
  request: APIRequestContext,
): Promise<number | undefined> {
  const response = await apiRequest(
    request,
    'GET',
    '/supplier-price-lists/lowest-quotes',
  )
  expect(response.status(), await response.text()).toBe(200)
  const quotes = (await response.json()) as Rec[]
  const matches = quotes.filter(
    (quote) =>
      String(quote.brandName ?? '') === BRAND &&
      String(quote.category ?? '') === CATEGORY &&
      String(quote.material ?? '') === MATERIAL &&
      Number(quote.spec) === SPEC &&
      String(quote.length ?? '') === LENGTH,
  )
  if (!matches.length) return undefined
  return Math.min(...matches.map((quote) => Number(quote.price)))
}

async function clickImportButton(page: Page) {
  const button = page
    .locator('button:visible')
    .filter({ hasText: /从供应商价格表导入/ })
    .first()
  await expect(button, '导入按钮应可见').toBeVisible({ timeout: NAV_TIMEOUT })
  return button
}

test.describe('报单比价 价格唯一来源', () => {
  test.setTimeout(180_000)

  test.afterEach(async ({ request }) => {
    while (createdSheetIds.length) {
      const id = createdSheetIds.pop()
      if (!id) continue
      await apiRequest(request, 'DELETE', `/quote-sheets/${id}`).catch(
        () => undefined,
      )
    }
  })

  test('手工改价入口已移除：现货/供应商只读，导入先弹确认框且取消不落库', async ({
    page,
    request,
  }) => {
    const name = sheetName()
    await createSheet(request, name)
    await openPriceCompare(page)
    await selectBatch(page, name)

    // ---- 只读：没有 input[data-spot]，也没有供应商下拉 ----
    const row = page.locator('.ant-table-row:visible').first()
    await expect(row).toBeVisible({ timeout: NAV_TIMEOUT })
    expect(
      await row.locator('input[data-spot]').count(),
      '现货价格子不得再是输入框（禁止手工改价）',
    ).toBe(0)
    expect(
      await row.locator('.price-compare-supplier .ant-select').count(),
      '供应商格子不得再有下拉（供应商只能来自价格表）',
    ).toBe(0)
    // 改造前留下的人工价仍以只读文本渲染，证明数据没被吞掉
    await expect(spotCell(page)).toHaveText(String(LEGACY_SPOT_PRICE))

    // ---- 点导入：必须弹确认框，且文案说明「未匹配的格子会被清空」 ----
    const saveRequests: string[] = []
    page.on('request', (req) => {
      if (
        req.method() === 'PUT' &&
        /\/quote-sheets\/\d+\/items\/\d+$/.test(req.url()) &&
        !req.url().includes('/src/')
      ) {
        saveRequests.push(req.url())
      }
    })

    const importButton = await clickImportButton(page)
    const [lowestResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/supplier-price-lists/lowest-quotes') &&
          res.status() === 200,
        { timeout: NAV_TIMEOUT },
      ),
      importButton.click(),
    ])
    expect(lowestResponse.ok(), '取价接口应成功').toBe(true)

    const dialog = page.locator('.ant-modal-confirm:visible').first()
    await expect(dialog).toBeVisible({ timeout: NAV_TIMEOUT })
    await expect(dialog).toContainText('从供应商价格表导入？')
    await expect(dialog).toContainText('未匹配的格子会被清空')

    // ---- 取消：不产生行级保存，格子保持原值 ----
    // antd 会在两个汉字之间插空格(`autoInsertSpace`)，可访问名实测为「取 消」/「确 认」。
    await dialog.getByRole('button', { name: /取\s*消/ }).click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })
    await page.waitForTimeout(2000)
    expect(saveRequests, '取消导入后不应发出行级保存请求').toEqual([])
    await expect(spotCell(page)).toHaveText(String(LEGACY_SPOT_PRICE))
  })

  test('确认导入：显示值 = 价格表最低价（无报价则清空），重开后一致', async ({
    page,
    request,
  }) => {
    const name = sheetName()
    await createSheet(request, name)
    const expected = await expectedSpotFromPriceList(request)
    await openPriceCompare(page)
    await selectBatch(page, name)
    await expect(spotCell(page)).toHaveText(String(LEGACY_SPOT_PRICE))

    const importButton = await clickImportButton(page)
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/supplier-price-lists/lowest-quotes') &&
          res.status() === 200,
        { timeout: NAV_TIMEOUT },
      ),
      importButton.click(),
    ])

    const dialog = page.locator('.ant-modal-confirm:visible').first()
    await expect(dialog).toBeVisible({ timeout: NAV_TIMEOUT })
    // 同「取 消」：antd 的 autoInsertSpace 会把「确认」渲染成「确 认」。
    await dialog.getByRole('button', { name: /确\s*认/ }).click()

    // 成功提示证明「确认 → 落库 → 提示」整条链路走通
    await expect(page.locator('.ant-message')).toContainText(
      '已从供应商价格表导入',
      { timeout: 20_000 },
    )

    const expectedText = expected === undefined ? '—' : String(expected)
    await expect
      .poll(async () => (await spotCell(page).textContent())?.trim(), {
        timeout: 20_000,
        message: `导入后现货价应为 ${expectedText}（价格表最低价；无报价则清空）`,
      })
      .toBe(expectedText)
    // 没有报价时供应商也必须一起清空，不能留「有供应商、没价格」的格子
    if (expected === undefined) {
      await expect(supplierCell(page)).toHaveText('—')
    }

    // ---- 重开：值来自服务端，而不是内存 ----
    await page.waitForTimeout(2500)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('table:visible').first()).toBeVisible({
      timeout: NAV_TIMEOUT,
    })
    await selectBatch(page, name)
    await expect
      .poll(async () => (await spotCell(page).textContent())?.trim(), {
        timeout: 30_000,
        message: '刷新后现货价必须与导入结果一致（已落库）',
      })
      .toBe(expectedText)
  })
})
