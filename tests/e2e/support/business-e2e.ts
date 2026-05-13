import type { Locator, Page } from '@playwright/test'
import { expect } from './test'

export const API_BASE_URL = 'http://127.0.0.1:11211/api'
export const APP_BASE_URL = 'http://127.0.0.1:3100'

export function buildSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export function isoToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isoNextDay() {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function compareRecordIds(
  left: { id?: string | number | null },
  right: { id?: string | number | null },
) {
  const leftId = BigInt(String(left.id || '0'))
  const rightId = BigInt(String(right.id || '0'))
  if (leftId === rightId) {
    return 0
  }
  return leftId > rightId ? -1 : 1
}

export async function loginAsTest9(page: Page) {
  const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
    data: { loginName: 'test9', password: '123456' },
  })
  expect(response.ok()).toBeTruthy()
  const payload = (await response.json()) as {
    code: number
    data?: {
      accessToken?: string
      expiresIn?: string | number
      user?: Record<string, unknown>
    }
  }
  expect(payload.code).toBe(0)
  await page.addInitScript(
    ({ token, currentUser, ttl }) => {
      const expiresAt = String(Date.now() + ttl * 1000)
      localStorage.setItem('aries-token', token)
      localStorage.setItem('aries-token-expires-at', expiresAt)
      localStorage.setItem('aries-user', JSON.stringify(currentUser))
      localStorage.setItem('aries-auth-persistence', 'local')
      sessionStorage.removeItem('aries-token')
      sessionStorage.removeItem('aries-token-expires-at')
      sessionStorage.removeItem('aries-user')
      sessionStorage.removeItem('aries-auth-persistence')
    },
    {
      token: String(payload.data?.accessToken || ''),
      currentUser: payload.data?.user || null,
      ttl: Number(payload.data?.expiresIn || 1800),
    },
  )
  await page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
}

export async function getCurrentAccessToken(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('aries-token') || '')
  expect(token).toBeTruthy()
  return token
}

export async function openCreateOverlay(page: Page) {
  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await page.getByRole('button', { name: '新建' }).click()
  const overlay = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(overlay).toBeVisible()
  return overlay
}

export async function selectAntOption(target: Locator, optionText?: string) {
  await target.click()
  const dropdown = target.page().locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible()
  if (optionText) {
    const input = target.locator('input').last()
    if ((await input.count()) > 0) {
      await input.fill(optionText)
    }
    const matchedOption = dropdown
      .locator('.ant-select-item-option')
      .filter({ hasText: optionText })
      .first()
    await expect(matchedOption).toBeVisible()
    await matchedOption.click()
    return
  }
  const firstOption = dropdown
    .locator('.ant-select-item-option:not(.ant-select-item-option-disabled)')
    .first()
  await expect(firstOption).toBeVisible()
  await firstOption.click()
}

export async function fillDateInput(target: Locator, value: string) {
  await target.fill(value)
  await target.press('Enter')
}

export async function setSpinbuttonValue(target: Locator, value: string) {
  await target.click()
  await target.press('ControlOrMeta+A')
  await target.pressSequentially(value)
  await target.press('Enter')
  await target.blur()
}

export async function waitForFirstDetailRow(overlay: Locator) {
  const row = overlay
    .locator('.module-detail-table tbody tr:not(.ant-table-measure-row)')
    .first()
  await expect(row).toBeVisible()
  await expect(row.locator('td').nth(3)).toBeVisible()
  return row
}

export async function waitForSaveOutcome(
  page: Page,
  overlay: Locator,
  expectedNo?: string,
) {
  const rowInList = expectedNo
    ? page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: expectedNo })
        .first()
    : null
  const successMessage = page.locator('.ant-message-notice').filter({
    hasText: /创建成功|更新成功|保存成功|对账单已生成/,
  })
  const errorMessage = page.locator('.ant-message-error').last()
  const validationErrors = overlay.locator('.ant-form-item-explain-error')

  const startedAt = Date.now()
  const intervals = [200, 500, 1000]
  let attempt = 0

  while (Date.now() - startedAt < 20_000) {
    if ((await errorMessage.count()) > 0 && (await errorMessage.isVisible())) {
      const text = (await errorMessage.textContent())?.trim()
      return text ? `error:${text}` : 'error'
    }
    if ((await validationErrors.count()) > 0) {
      const firstError = validationErrors.first()
      if (await firstError.isVisible()) {
        const text = (await firstError.textContent())?.trim()
        return text ? `validation:${text}` : 'validation'
      }
    }
    if ((await successMessage.count()) > 0) {
      return 'message'
    }
    if (rowInList && (await rowInList.count()) > 0 && (await rowInList.isVisible())) {
      return 'row'
    }
    if (!(await overlay.isVisible().catch(() => false))) {
      return 'closed'
    }

    const waitMs = intervals[Math.min(attempt, intervals.length - 1)]
    attempt += 1
    await page.waitForTimeout(waitMs)
  }

  throw new Error('save outcome timeout')
}

export async function saveOverlay(page: Page, overlay: Locator, expectedNo?: string) {
  await overlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存$/ })
    .click()
  const outcome = await waitForSaveOutcome(page, overlay, expectedNo)
  if (typeof outcome === 'string' && /^error:|^validation:/.test(outcome)) {
    throw new Error(outcome)
  }
}

export async function saveAndAuditOverlay(
  page: Page,
  overlay: Locator,
  expectedNo?: string,
) {
  await overlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存并审核$/ })
    .click()
  const outcome = await waitForSaveOutcome(page, overlay, expectedNo)
  if (typeof outcome === 'string' && /^error:|^validation:/.test(outcome)) {
    throw new Error(outcome)
  }
}

export async function importParentByKeyword(
  page: Page,
  overlay: Locator,
  buttonName: string,
  keyword: string,
) {
  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await overlay.getByRole('button', { name: buttonName }).click()
  const selector = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(selector).toBeVisible()
  await selector.getByPlaceholder('搜索单据号...').fill(keyword)
  await selector.getByPlaceholder('搜索单据号...').press('Enter')
  const row = selector
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: keyword })
    .first()
  await expect(row).toBeVisible()
  await row.click()
}
