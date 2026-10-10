import { randomUUID } from 'node:crypto'
import { type APIRequestContext, expect, type Page } from '@playwright/test'
import {
  clearCachedAuthSession,
  e2eApiBaseUrl,
  getPasswordSession,
} from './support/api-key'
import { buttonName, gotoRoute, loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

const NAV_TIMEOUT = 30_000
const TEST_PROJECT_ID = '900000000000000100'
const TEST_PROJECT_NAME = 'E2E比价并发项目'
const TON_INPUT = 'input[data-ton]'
const TOUR_KEY = 'aries-price-compare-tour'

type Rec = Record<string, unknown>

const createdSheetIds: string[] = []

function idOf(record: Rec): string {
  return String(record.id)
}

function sheetBody(overrides: Rec = {}): Rec {
  return {
    name: `E2E-SQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    projectId: TEST_PROJECT_ID,
    projectName: TEST_PROJECT_NAME,
    orderDate: '2026-09-17',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    locked: false,
    specQuantityLocked: false,
    brands: [{ brandName: '万泰', freight: 10, sortOrder: 0 }],
    items: [
      {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 16,
        length: '9米',
        ton: 5,
        prices: [{ brandName: '万泰', spotPrice: 3200 }],
      },
    ],
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

async function selectBatch(page: Page, name: string) {
  const option = page
    .locator('.ant-segmented-item')
    .filter({ hasText: name })
    .first()
  await expect(option).toBeVisible({ timeout: NAV_TIMEOUT })
  await option.click()
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

/** 打开首行吨位格的采购订单明细弹层, 返回弹层定位器。 */
async function openTonPopover(page: Page) {
  const info = page.locator('.price-compare-ton-info').first()
  await expect(info).toBeVisible({ timeout: NAV_TIMEOUT })
  await info.click()
  const popover = page.locator('.price-compare-ton-popover:visible').first()
  await expect(popover).toBeVisible({ timeout: NAV_TIMEOUT })
  return popover
}

/**
 * 缺陷回归: 「锁定规格和数量」冻结整单规格/吨位后, 吨位弹层的「选择采购订单」曾只认行级锁,
 * 一边禁用入口一边提示"请先锁定该行"; 而行菜单的「锁定该行」在全局锁下又是禁用的 —— 用户无路可走。
 */
test.describe('报单比价 锁定规格和数量后的采购订单关联', () => {
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

  test('全局锁下可直接关联: 入口可点且不再提示先锁定; 未锁定时仍保持门禁', async ({
    page,
    request,
  }) => {
    const locked = await createSheet(request, { specQuantityLocked: true })
    const unlocked = await createSheet(request, {})

    await openAdminPriceCompare(page)

    // 1) 全局锁批次: 规格/吨位只读, 但关联入口必须放行
    await selectBatch(page, String(locked.name))
    await expect(
      page.getByRole('button', { name: buttonName('解锁规格和数量') }),
    ).toBeVisible({ timeout: NAV_TIMEOUT })
    await expect(page.locator(TON_INPUT).first()).toBeDisabled()

    const lockedPopover = await openTonPopover(page)
    await expect(lockedPopover).toContainText('未关联采购订单')
    await expect(lockedPopover).not.toContainText('请先锁定')
    const lockedPicker = lockedPopover.getByRole('button', {
      name: buttonName('选择采购订单'),
    })
    await expect(lockedPicker).toBeEnabled()
    await lockedPicker.click()
    const pickerModal = page.locator('.ant-modal:visible').last()
    await expect(pickerModal).toContainText('选择采购订单规格行', {
      timeout: NAV_TIMEOUT,
    })

    /*
     * 落库验证: 选中订单后服务端必须同时收到 locked=true 与关联, 否则保存时会被
     * 「仅锁定行可关联采购订单」的门禁清空。开发/CI 库可能没有可关联的采购订单明细,
     * 这种情况下只验证门禁(上方断言), 不把环境数据缺失当成缺陷。
     */
    const optionRows = pickerModal.locator('.ant-table-tbody tr.ant-table-row')
    if ((await optionRows.count()) > 0) {
      const write = waitItemWrite(page, idOf(locked))
      await optionRows.first().click()
      expect((await write).status(), '行级保存应成功').toBeLessThan(400)
      // locked=true 与关联必须一并落库: 缺 locked 时服务端门禁会在保存时清空关联
      await expect
        .poll(
          async () => {
            const item = (
              (await getSheet(request, idOf(locked))).items as Rec[]
            )[0]
            return `${Boolean(item.locked)}:${String(item.purchaseOrderItemId ?? '')}`
          },
          { timeout: NAV_TIMEOUT, message: '关联与行级锁应一并落库' },
        )
        .toMatch(/^true:.+$/)
      // 行级锁状态在界面上可见(实心锁图标), 用户能看出这一行已定稿
      await expect(
        page.locator('.price-compare-row-actions .anticon-lock').first(),
      ).toBeVisible({ timeout: NAV_TIMEOUT })
    } else {
      test.info().annotations.push({
        type: 'skipped-persistence-check',
        description: '开发库暂无可关联的采购订单明细, 本次仅验证关联门禁',
      })
      await pickerModal
        .getByRole('button', { name: buttonName('取消') })
        .click()
    }

    // 2) 未锁定批次: 门禁保持原样, 提示仍然指向"先锁定该行"(防止修复变成无条件放行)
    await selectBatch(page, String(unlocked.name))
    await expect(
      page.getByRole('button', { name: buttonName('锁定规格和数量') }),
    ).toBeVisible({ timeout: NAV_TIMEOUT })
    await expect(page.locator(TON_INPUT).first()).toBeEnabled()

    const unlockedPopover = await openTonPopover(page)
    await expect(unlockedPopover).toContainText('请先锁定')
    await expect(
      unlockedPopover.getByRole('button', {
        name: buttonName('选择采购订单'),
      }),
    ).toBeDisabled()
  })
})
