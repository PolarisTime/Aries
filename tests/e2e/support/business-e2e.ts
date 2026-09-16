import type { Locator, Page } from '@playwright/test'
import {
  APP_BASE_URL as API_KEY_APP_BASE_URL,
  primeApiKeySession,
} from './api-key'
import { expect } from './test'

export const API_BASE_URL = 'http://127.0.0.1:11211/api/v2.0'
export const APP_BASE_URL = API_KEY_APP_BASE_URL

const NAV_TIMEOUT_MS = 30_000

/** antd 会在两个汉字按钮文案中插入空格，这里生成容忍空白的匹配正则。 */
export function buttonName(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(escaped.split('').join('\\s*'))
}

export function buildSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export function isoToday() {
  return formatIsoDate(new Date())
}

export function isoNextDay() {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  return formatIsoDate(now)
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 通过当前 JWT 账号密码登录并注入浏览器会话，跳转到工作台。 */
export async function loginAsE2eUser(page: Page) {
  await primeApiKeySession(page)
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
}

export async function gotoRoute(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
}

export async function expectModuleHeading(page: Page, title: string) {
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({
    timeout: NAV_TIMEOUT_MS,
  })
}

/** 当前应用列表页关键字输入：business-grid 用 name=keyword，master/独立页用 aria-label=关键字。 */
export function moduleKeywordInput(page: Page): Locator {
  return page
    .locator(
      'input[name="keyword"]:visible, input[aria-label="关键字"]:visible, input[placeholder="关键字"]:visible',
    )
    .first()
}

export async function expectGridTable(page: Page) {
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT_MS,
  })
}

const EMPTY_STATE_PATTERN =
  /没有匹配的记录|暂无|还没有任何数据|当前列表暂无记录|未找到记录/

/** 返回首个包含雪花 ID 的数据行；空态行会被排除。 */
export async function firstDataRow(page: Page): Promise<Locator | null> {
  const rows = page.locator('tbody tr:not(.ant-table-measure-row)')
  const count = await rows.count()
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index)
    const text = (await row.textContent().catch(() => '')) || ''
    if (/\d{15,20}/.test(text) && !EMPTY_STATE_PATTERN.test(text)) {
      return row
    }
  }
  return null
}

/** 从数据行中提取首个雪花单号，作为服务端关键字搜索词。 */
export async function firstRowPrimaryNo(page: Page): Promise<string | null> {
  const row = await firstDataRow(page)
  if (!row) return null
  const cells = await row.locator('td').allTextContents()
  for (const cell of cells) {
    const value = cell.trim()
    if (/^\d{15,20}$/.test(value)) {
      return value
    }
  }
  return null
}

/**
 * 在列表关键字框输入并触发搜索，等待同资源列表请求返回。
 * 允许数据为空：只校验列表请求成功发出且页面仍渲染表格。
 */
export async function searchModule(
  page: Page,
  keyword: string,
  resourcePath?: string,
) {
  const input = moduleKeywordInput(page)
  await expect(input).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await input.fill(keyword)
  const responsePromise = page
    .waitForResponse(
      (response) => {
        if (response.request().method() !== 'GET') return false
        if (!response.url().includes('/api/v2.0/')) return false
        if (resourcePath && !response.url().includes(resourcePath)) return false
        return response.status() < 500
      },
      { timeout: NAV_TIMEOUT_MS },
    )
    .catch(() => null)
  await input.press('Enter')
  await responsePromise
  await expectGridTable(page)
}

/** 点击文字标签（如“单据状态”）对应的筛选 chip，打开其弹出面板。 */
export async function openFilterChip(page: Page, label: string) {
  const trigger = page
    .locator('button')
    .filter({ hasText: buttonName(label) })
    .first()
  await expect(trigger).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await trigger.click()
}

/** 双击首行数据行打开记录编辑浮层，返回浮层定位器；无数据时返回 null。 */
export async function openFirstRowEditor(page: Page): Promise<Locator | null> {
  const row = await firstDataRow(page)
  if (!row) return null
  await row.dblclick()
  const overlay = page.locator('.workspace-overlay-panel').first()
  await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  return overlay
}

/** 关闭最上层浮层（取消/关闭/Esc），避免写入数据。 */
export async function closeTopOverlay(page: Page) {
  const overlay = page.locator('.workspace-overlay-panel:visible').last()
  const cancel = overlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /取\s*消|关\s*闭/ })
    .first()
  if ((await cancel.count()) > 0) {
    await cancel.click()
  } else {
    await page.keyboard.press('Escape')
  }
  await expect(overlay)
    .toBeHidden({ timeout: NAV_TIMEOUT_MS })
    .catch(() => {})
}
