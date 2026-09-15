import { randomUUID } from 'node:crypto'
import type { APIRequestContext, Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import {
  clearCachedAuthSession,
  e2eApiBaseUrl,
  getPasswordSession,
} from './support/api-key'
import {
  gotoRoute as baseGotoRoute,
  loginAsE2eUser as baseLoginAsE2eUser,
} from './support/business-e2e'

export const E2E_PREFIX = `E2E-C-${Date.now()}`

function isLoginUrl(url: string) {
  return /\/login(?:\?|$)/.test(url)
}

export async function loginE2e(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await baseLoginAsE2eUser(page)
      if (!isLoginUrl(page.url())) return
    } catch {
      // 并发会话可能使上一个 token 失效，清缓存后重试。
    }
    clearCachedAuthSession()
    await new Promise((resolve) => setTimeout(resolve, 1_500))
  }
  await baseLoginAsE2eUser(page)
}

export async function gotoRouteE2e(page: Page, path: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await baseGotoRoute(page, path)
    if (!isLoginUrl(page.url())) return
    clearCachedAuthSession()
    await baseLoginAsE2eUser(page)
  }
  await baseGotoRoute(page, path)
}

export const parentSelectorPanel = (page: Page): Locator =>
  page.locator('.workspace-overlay-panel--parent-selector:visible')

export const editorPanel = (page: Page): Locator =>
  page.locator('.workspace-overlay-panel:visible').filter({
    has: page.getByRole('button', { name: /保存/ }),
  })

export const saveResultPanel = (page: Page): Locator =>
  page.locator('.save-result-overlay:visible')

async function openAndPick(
  page: Page,
  trigger: Locator,
  option: string | number,
): Promise<void> {
  await trigger.click()
  await expect(
    page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),
  ).toHaveCount(1, { timeout: 15_000 })
  const panel = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .last()
  const items = panel.locator('.ant-select-item-option')
  await expect(items.first()).toBeVisible({ timeout: 15_000 })
  const target =
    typeof option === 'number'
      ? items.nth(option)
      : items.filter({ hasText: option }).first()
  await expect(target).toBeVisible({ timeout: 15_000 })
  await target.click()
  await expect(
    page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),
  )
    .toHaveCount(0, { timeout: 10_000 })
    .catch(() => undefined)
}

export async function selectFieldOption(
  page: Page,
  fieldId: string,
  option: string | number,
): Promise<void> {
  const trigger = page.locator(`#${fieldId}`)
  await expect(trigger).toBeVisible({ timeout: 20_000 })
  await openAndPick(page, trigger, option)
}

export async function selectAriaLabelOption(
  page: Page,
  ariaLabel: string,
  option: string | number,
): Promise<void> {
  const trigger = page
    .locator(`input[aria-label="${ariaLabel}"]:visible`)
    .first()
  await expect(trigger).toBeVisible({ timeout: 20_000 })
  await openAndPick(page, trigger, option)
}

export async function selectPopoverOption(
  page: Page,
  chipLabel: string,
  option: string | number,
): Promise<void> {
  const chip = page.locator('button').filter({ hasText: chipLabel }).first()
  await expect(chip).toBeVisible({ timeout: 20_000 })
  await chip.click()
  const trigger = page
    .locator(`.ant-popover:visible input[aria-label="${chipLabel}"]`)
    .first()
  await expect(trigger).toBeVisible({ timeout: 20_000 })
  await openAndPick(page, trigger, option)
}

export async function importFirstParentCandidate(page: Page): Promise<void> {
  const panel = parentSelectorPanel(page)
  await expect(panel).toBeVisible({ timeout: 30_000 })
  const rows = panel.locator('tbody tr:not(.ant-table-measure-row)')
  await expect(rows.first()).toBeVisible({ timeout: 30_000 })
  await expect(panel.locator('.ant-spin-spinning'))
    .toHaveCount(0, { timeout: 20_000 })
    .catch(() => undefined)
  const confirm = panel.getByRole('button', { name: /确认导入/ })
  const checkboxInput = rows.first().locator('input[type="checkbox"]').first()
  const checkboxWrapper = rows
    .first()
    .locator('.ant-table-selection-column .ant-checkbox')
    .first()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await confirm.isEnabled()) break
    await checkboxInput
      .check({ force: true, timeout: 5_000 })
      .catch(() => undefined)
    if (await confirm.isEnabled()) break
    await checkboxWrapper
      .click({ force: true, timeout: 5_000 })
      .catch(() => undefined)
    await page.waitForTimeout(300)
  }
  await expect(confirm).toBeEnabled({ timeout: 20_000 })
  await confirm.click()
  await expect(panel).toBeHidden({ timeout: 30_000 })
}

export async function clickEditorSave(
  page: Page,
  mode: 'save' | 'audit',
): Promise<void> {
  const panel = editorPanel(page).last()
  const pattern = mode === 'save' ? /^\s*保存\s*$/ : /保存并(确认|审核)/
  const button = panel.locator('button').filter({ hasText: pattern }).first()
  await expect(button).toBeVisible({ timeout: 20_000 })
  await button.click()
}

export async function confirmStatusDialog(
  page: Page,
  action: '确认' | '审核',
): Promise<void> {
  const dialog = page.locator('.ant-modal-confirm:visible').last()
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  await dialog
    .locator('.ant-btn-primary')
    .filter({ hasText: new RegExp(`${action}`) })
    .first()
    .click()
}

export interface SaveOutcome {
  panelText: string
}

export async function expectSaveSuccess(page: Page): Promise<SaveOutcome> {
  const panel = saveResultPanel(page)
  await expect(panel).toBeVisible({ timeout: 30_000 })
  await expect(panel).toContainText(/保存成功|已确认|已审核/, {
    timeout: 30_000,
  })
  const panelText = (await panel.textContent()) || ''
  return { panelText }
}

export interface ObservedSaveResult {
  success: boolean
  panelText: string
}

export async function observeSaveResult(
  page: Page,
): Promise<ObservedSaveResult> {
  const panel = saveResultPanel(page)
  const appeared = await panel
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => true)
    .catch(() => false)
  if (!appeared) {
    const formError = await page
      .locator('.ant-form-item-explain-error:visible')
      .first()
      .textContent()
      .catch(() => '')
    const notice = await page
      .locator('.ant-message-notice:visible')
      .first()
      .textContent()
      .catch(() => '')
    return {
      success: false,
      panelText: formError || notice || '未出现保存结果浮层',
    }
  }
  const panelText = (await panel.textContent()) || ''
  return { success: /保存成功/.test(panelText), panelText }
}

export async function dismissSaveResult(page: Page): Promise<void> {
  const panel = saveResultPanel(page)
  if ((await panel.count()) > 0) {
    const primary = panel.locator('.ant-btn-primary').first()
    if ((await primary.count()) > 0) {
      await primary.click().catch(() => undefined)
    }
    await expect(panel)
      .toBeHidden({ timeout: 15_000 })
      .catch(() => undefined)
  }
  await page.keyboard.press('Escape').catch(() => undefined)
}

export async function closeSaveResult(page: Page): Promise<void> {
  const panel = saveResultPanel(page)
  const close = panel.locator('button').filter({ hasText: /^\s*关\s*闭\s*$/ })
  await expect(close.first()).toBeVisible({ timeout: 20_000 })
  await close.first().click()
  await expect(panel).toBeHidden({ timeout: 30_000 })
}

export function extractIdAfterLabel(
  text: string,
  label: string,
): string | null {
  const pattern = new RegExp(`${label}[：:]?\\s*(\\d{15,20})`)
  return text.match(pattern)?.[1] ?? null
}

interface ApiResult {
  ok: boolean
  status: number
  data: Record<string, unknown> | null
}

export async function apiGetJson(
  request: APIRequestContext,
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<ApiResult> {
  const session = await getPasswordSession(request)
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value != null && value !== '') params.set(key, String(value))
  })
  const qs = params.toString()
  const response = await request.get(
    `${e2eApiBaseUrl()}${path}${qs ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  )
  return {
    ok: response.ok(),
    status: response.status(),
    data: (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null,
  }
}

export async function collectionTotal(
  request: APIRequestContext,
  path: string,
): Promise<number> {
  const { data } = await apiGetJson(request, path, { page: 0, size: 1 })
  const total = data?.totalElements ?? data?.total
  return Number(total ?? 0)
}

export async function firstSettlementCompanyWithAccount(
  request: APIRequestContext,
): Promise<string | null> {
  const { ok, data } = await apiGetJson(request, '/company-settings', {
    page: 0,
    size: 50,
  })
  const rows = Array.isArray(data?.content)
    ? (data?.content as Array<Record<string, unknown>>)
    : []
  if (!ok) return null
  const row = rows.find((item) => {
    const accounts = Array.isArray(item.settlementAccounts)
      ? (item.settlementAccounts as Array<Record<string, unknown>>)
      : []
    return accounts.some((account) => account.status !== '停用')
  })
  return row ? String(row.companyName) : null
}

export async function findCustomerStatementCandidate(
  request: APIRequestContext,
): Promise<{
  customerId: string
  customerName: string
  projectId: string
  projectName: string
} | null> {
  const { ok, data } = await apiGetJson(
    request,
    '/customer-statements/candidates',
    { page: 0, size: 20, keyword: '' },
  )
  const rows = Array.isArray(data?.content)
    ? (data?.content as Array<Record<string, unknown>>)
    : []
  const row = rows[0]
  if (!ok || !row) return null
  return {
    customerId: String(row.customerId),
    customerName: String(row.customerName),
    projectId: String(row.projectId),
    projectName: String(row.projectName),
  }
}

export async function findFreightBillCandidate(
  request: APIRequestContext,
): Promise<{ orderNo: string } | null> {
  const { ok, data } = await apiGetJson(
    request,
    '/freight-bills/sales-order-candidates',
    { page: 0, size: 5, keyword: '' },
  )
  const rows = Array.isArray(data?.content)
    ? (data?.content as Array<Record<string, unknown>>)
    : []
  if (!ok || !rows[0]) return null
  return { orderNo: String(rows[0].orderNo) }
}

export async function deleteModuleRecordBestEffort(
  request: APIRequestContext,
  path: string,
  id: string,
): Promise<void> {
  const session = await getPasswordSession(request)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request.delete(`${e2eApiBaseUrl()}${path}/${id}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Idempotency-Key': randomUUID(),
      },
    })
    if (response.status() < 400) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

export async function reverseModuleStatusBestEffort(
  request: APIRequestContext,
  path: string,
  id: string,
  status: string,
): Promise<void> {
  const session = await getPasswordSession(request)
  await request
    .patch(`${e2eApiBaseUrl()}${path}/${id}/status`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Idempotency-Key': randomUUID(),
      },
      data: { status },
    })
    .catch(() => undefined)
}

export async function reverseConfirmStatementBestEffort(
  request: APIRequestContext,
  id: string,
): Promise<void> {
  await reverseModuleStatusBestEffort(
    request,
    '/customer-statements',
    id,
    '待确认',
  )
}
