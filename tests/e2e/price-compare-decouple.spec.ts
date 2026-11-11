import { randomUUID } from 'node:crypto'
import { type APIRequestContext, expect, type Page } from '@playwright/test'
import {
  clearCachedAuthSession,
  e2eApiBaseUrl,
  getPasswordSession,
} from './support/api-key'
import { buttonName, gotoRoute, loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

/**
 * 报单比价「与采购/销售彻底解耦」回归（2026-11-12）。
 *
 * <p>用户 2026-11-11/12 决策：报单比价模块只是**内部选价看板**，与采购、销售彻底解耦。
 * 本次移除的能力：采购订单关联（`purchase_order_id` / `purchase_order_no` /
 * `purchase_order_item_id` / `purchase_orderLinks`）、「已开 / 未开」吨位口径、
 * 「已开完」人工标记、吨位弹层里的采购订单选择器，以及
 * `GET /v2.0/quote-sheets/purchase-order-tonnages` 端点（迁移 V214/V215 同步删表删列）。
 *
 * <p>本文件锁住四类契约，防止能力被「悄悄复活」或「顺手删多了」：
 * <ol>
 *   <li>已删端点不得重新返回吨位数据；</li>
 *   <li>报价单详情的响应体不含任何采购字段；</li>
 *   <li>请求体里残留采购字段时必须被忽略（不落库、不回显），不能 500；</li>
 *   <li>本该保留的东西必须还在：报单吨位可编辑并落库、行锁 + 单据锁两级锁仍生效。</li>
 * </ol>
 *
 * <p>本文件不碰真实采购单据：解耦后比价单与采购没有任何链路，测试也不应再依赖采购数据，
 * 因此在共享开发库上没有「无采购订单明细」这类前置不足，随时可跑。
 */

const NAV_TIMEOUT = 30_000
/** 专用测试项目 id(雪花字符串)，与其它比价用例共用，避免污染真实项目配置。 */
const TEST_PROJECT_ID = '900000000000000100'
const TEST_PROJECT_NAME = 'E2E比价解耦项目'
const TON_INPUT = 'input[data-ton]'
const TOUR_KEY = 'aries-price-compare-tour'

type Rec = Record<string, unknown>

const createdSheetIds: string[] = []

/** 已删除能力的字段名特征：命中即视为「采购/已开口径泄漏」。 */
const REMOVED_FIELD_PATTERN = /purchase|issued|remaining|opening/i

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
    name: `E2E-DC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    projectId: TEST_PROJECT_ID,
    projectName: TEST_PROJECT_NAME,
    orderDate: '2026-09-17',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    locked: false,
    specQuantityLocked: false,
    brands: [{ brandName: '万泰', freight: 10, sortOrder: 0 }],
    items: [defaultItem()],
    ...overrides,
  }
}

/** 递归收集响应体里命中已删能力特征的字段路径，用于断言「一个都不该有」。 */
function removedFieldPaths(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      removedFieldPaths(item, `${path}[${index}]`),
    )
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Rec).flatMap(([key, child]) => {
      const here = `${path}.${key}`
      const own = REMOVED_FIELD_PATTERN.test(key) ? [here] : []
      return [...own, ...removedFieldPaths(child, here)]
    })
  }
  return []
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
  expect(response.status(), await response.text()).toBe(200)
  return (await response.json()) as Rec
}

function itemsOf(record: Rec): Rec[] {
  const items = (record.items ?? []) as Rec[]
  expect(items.length, '报价单应包含商品行').toBeGreaterThan(0)
  return items
}

/** 打开比价页并跳过新手引导；比价页是独立视图，无列表页关键字可按。 */
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

/** 切到指定批次页签（页面上还有「项目」下拉，必须限定在批次页签内，否则会点到别的控件）。 */
async function selectBatch(page: Page, name: string) {
  const option = page
    .locator('.price-compare-batch-tabs .ant-tabs-tab')
    .filter({ hasText: name })
    .first()
  await expect(option).toBeVisible({ timeout: NAV_TIMEOUT })
  await option.click()
}

test.describe('报单比价 与采购解耦', () => {
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

  test('已删端点: /quote-sheets/purchase-order-tonnages 不再返回吨位数据', async ({
    request,
  }) => {
    const response = await apiRequest(
      request,
      'GET',
      '/quote-sheets/purchase-order-tonnages',
    )
    /*
     * 该端点已删除。路由细节：`/quote-sheets/purchase-order-tonnages` 会被
     * `@GetMapping("/{id}")` 的路径变量捕获，"purchase-order-tonnages" 转 Long 失败 →
     * `GlobalExceptionHandler` 的 MethodArgumentTypeMismatchException 分支返回 400；
     * 若将来补了 404/405 处理同样正常。三者都接受，但**绝不能是 2xx**。
     */
    expect(
      [400, 404, 405],
      `吨位汇总端点应已下线，实际返回 ${response.status()}`,
    ).toContain(response.status())
    const text = await response.text()
    for (const field of [
      'issuedWeight',
      'issuedDone',
      'remainingTon',
      'purchaseOrderItemId',
    ]) {
      expect(text, `响应体不应再包含已删除字段 ${field}`).not.toContain(field)
    }
  })

  test('详情契约: 响应体不含任何采购/已开字段，吨位仍保留', async ({
    request,
  }) => {
    const sheet = await createSheet(request)
    const detail = await getSheet(request, idOf(sheet))

    expect(
      removedFieldPaths(detail),
      '报价单详情不应出现任何 purchase / issued / remaining 字段',
    ).toEqual([])

    const item = itemsOf(detail)[0]
    expect(item.ton, '报单吨位必须保留').toBe(5)
    expect(item.locked, '行锁标记必须保留').toBe(false)
    expect(itemsOf(detail)[0].prices, '现货价必须保留').toBeTruthy()
  })

  test('请求兼容: 携带已删采购字段被忽略（不落库、不回显、不 500）', async ({
    request,
  }) => {
    /*
     * 旧前端/旧脚本可能仍在请求体里带采购字段。Spring Boot 默认
     * `FAIL_ON_UNKNOWN_PROPERTIES=false`，这些字段应被静默丢弃，而不是 4xx/5xx。
     */
    const sheet = await createSheet(request, {
      items: [
        defaultItem({
          purchaseOrderId: '900000000000000900',
          purchaseOrderNo: 'PO-LEGACY-001',
          purchaseOrderItemId: '900000000000000901',
          purchaseOrderLinks: [
            {
              purchaseOrderId: '900000000000000900',
              purchaseOrderItemId: '900000000000000901',
              allocatedTon: 3,
            },
          ],
          purchased: true,
          issuedWeight: 3,
        }),
      ],
    })
    const detail = await getSheet(request, idOf(sheet))

    expect(removedFieldPaths(detail)).toEqual([])
    const item = itemsOf(detail)[0]
    expect(item.ton, '吨位应原样落库').toBe(5)
    expect(item.locked, '不应因残留采购字段变成锁定行').toBe(false)
  })

  test('吨位列仍在: 报单吨位可在页面上编辑并落库', async ({
    page,
    request,
  }) => {
    const sheet = await createSheet(request)
    const id = idOf(sheet)

    await openPriceCompare(page)
    await selectBatch(page, String(sheet.name))

    const input = page.locator(TON_INPUT).first()
    await expect(input).toBeEnabled({ timeout: NAV_TIMEOUT })
    await input.fill('12.5')
    await input.press('Enter')

    await expect
      .poll(async () => Number(itemsOf(await getSheet(request, id))[0].ton), {
        timeout: NAV_TIMEOUT,
        message: '吨位应通过行级保存接口落库',
      })
      .toBe(12.5)

    // 已删能力的 UI 不得回归：吨位弹层与采购进度提示都不应再出现
    await expect(
      page.locator('.price-compare-ton-popover'),
      '吨位采购弹层不应再渲染',
    ).toHaveCount(0)
    await expect(
      page.locator('.price-compare-ton-info'),
      '吨位弹层入口不应再渲染',
    ).toHaveCount(0)
  })

  test('两级锁仍在: 单据级「锁定规格和数量」冻结吨位，解锁后恢复', async ({
    page,
    request,
  }) => {
    const sheet = await createSheet(request, { specQuantityLocked: true })

    await openPriceCompare(page)
    await selectBatch(page, String(sheet.name))

    await expect(
      page.getByRole('button', { name: buttonName('解锁规格和数量') }),
    ).toBeVisible({ timeout: NAV_TIMEOUT })
    await expect(page.locator(TON_INPUT).first()).toBeDisabled()

    await page
      .getByRole('button', { name: buttonName('解锁规格和数量') })
      .click()
    await expect(page.locator(TON_INPUT).first()).toBeEnabled({
      timeout: NAV_TIMEOUT,
    })
  })

  test('两级锁仍在: 行级锁只冻结该行吨位，不波及同单其它行', async ({
    page,
    request,
  }) => {
    const sheet = await createSheet(request, {
      items: [defaultItem({ locked: true }), defaultItem({ spec: 18, ton: 3 })],
    })
    const detail = await getSheet(request, idOf(sheet))
    const items = itemsOf(detail)
    const lockedItemId = String(items[0].id)
    const freeItemId = String(items[1].id)

    expect(items[0].locked, '服务端应记录行级锁').toBe(true)
    expect(items[1].locked, '未锁定的行不应被连带锁定').toBe(false)

    await openPriceCompare(page)
    await selectBatch(page, String(sheet.name))

    await expect(
      page.locator(`input[data-ton="${lockedItemId}"]`),
      '行级锁应冻结该行吨位输入',
    ).toBeDisabled({ timeout: NAV_TIMEOUT })
    await expect(
      page.locator(`input[data-ton="${freeItemId}"]`),
      '同单未锁定行的吨位仍应可编辑',
    ).toBeEnabled()
  })
})
