import type { Locator, Page } from '@playwright/test'
import { expect, test } from './support/test'

const API_BASE_URL = 'http://127.0.0.1:11211/api'
const APP_BASE_URL = 'http://127.0.0.1:3100'

function buildSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

function isoToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loginAsTest9(page: Page) {
  const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      loginName: 'test9',
      password: '123456',
    },
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
  const accessToken = String(payload.data?.accessToken || '')
  const user = payload.data?.user || null
  const expiresIn = Number(payload.data?.expiresIn || 1800)

  await page.addInitScript(
    ({ token, currentUser, ttl }) => {
      const expiresAt = String(Date.now() + ttl * 1000)
      localStorage.setItem('aries-token', token)
      localStorage.setItem('aries-token-expires-at', expiresAt)
      localStorage.setItem('aries-user', JSON.stringify(currentUser))
      localStorage.setItem('aries-auth-persistence', 'local')
    },
    {
      token: accessToken,
      currentUser: user,
      ttl: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 1800,
    },
  )

  await page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
}

async function selectAntOption(target: Locator, optionText?: string) {
  await target.click()
  if (optionText) {
    const input = target.locator('input').last()
    if ((await input.count()) > 0) {
      await input.fill(optionText)
    }
  }
  await target.press('ArrowDown')
  await target.press('Enter')
}

async function fillDateInput(target: Locator, value: string) {
  await target.fill(value)
  await target.press('Enter')
}

async function setSpinbuttonValue(target: Locator, value: string) {
  await target.click()
  await target.press('ControlOrMeta+A')
  await target.pressSequentially(value)
  await target.press('Enter')
  await target.blur()
}

async function openCreateOverlay(page: Page) {
  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await page.getByRole('button', { name: '新建' }).click()
  const overlay = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(overlay).toBeVisible()
  return overlay
}

async function importParentByKeyword(
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

test('debug purchase inbound save result', async ({ page }) => {
  test.setTimeout(120_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  const orderDate = isoToday()
  const purchaseOrderNo = `PO-IN-DBG-${suffix}`
  const purchaseInboundNo = `PI-IN-DBG-${suffix}`

  await page.goto('/purchase-order')
  const purchaseOrderOverlay = await openCreateOverlay(page)
  await selectAntOption(
    purchaseOrderOverlay.locator('#supplierName'),
    '益海（浙江）物联网科技有限公司',
  )
  await purchaseOrderOverlay.locator('#orderNo').fill(purchaseOrderNo)
  await fillDateInput(purchaseOrderOverlay.locator('#orderDate'), orderDate)
  const purchaseOrderRow = purchaseOrderOverlay
    .locator('.module-detail-table tbody tr:not(.ant-table-measure-row)')
    .first()
  await purchaseOrderRow.locator('td').nth(3).locator('input').fill('HZ-YG-PL8')
  await page.waitForTimeout(1200)
  await selectAntOption(
    purchaseOrderRow.locator('td').nth(10).locator('.ant-select'),
    '升华物流',
  )
  await purchaseOrderRow.locator('td').nth(12).locator('input').fill('10')
  await purchaseOrderRow.locator('td').nth(16).locator('input').fill('3200')
  await purchaseOrderOverlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存$/ })
    .click()
  await expect(
    page
      .locator('.ant-message-notice')
      .filter({ hasText: /创建成功|更新成功|保存成功/ }),
  ).toHaveCount(1)

  await page.goto('/purchase-inbound')
  const purchaseInboundOverlay = await openCreateOverlay(page)
  await purchaseInboundOverlay.locator('#inboundNo').fill(purchaseInboundNo)
  await fillDateInput(purchaseInboundOverlay.locator('#inboundDate'), orderDate)
  await importParentByKeyword(
    page,
    purchaseInboundOverlay,
    '导入采购订单明细',
    purchaseOrderNo,
  )

  const purchaseInboundRow = purchaseInboundOverlay
    .locator('.module-detail-table tbody tr:not(.ant-table-measure-row)')
    .first()
  const spin = purchaseInboundRow.locator('input[role="spinbutton"]').nth(1)
  await setSpinbuttonValue(spin, '23.550')

  let requestSeen = false
  let responseStatus: number | null = null
  let responseBody = ''
  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes('/api/purchase-inbound') &&
        response.request().method() === 'POST',
      { timeout: 3000 },
    )
    .then(async (response) => {
      requestSeen = true
      responseStatus = response.status()
      responseBody = await response.text()
    })
    .catch(() => undefined)

  await purchaseInboundOverlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存$/ })
    .click()

  await page.waitForTimeout(2000)
  await responsePromise
  const messageTexts = await page
    .locator('.ant-message-notice')
    .allTextContents()
  const rowTexts = await purchaseInboundRow.locator('td').allTextContents()
  const spinValues = await purchaseInboundRow
    .locator('input[role="spinbutton"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node instanceof HTMLInputElement ? node.value : '')),
    )

  console.log(
    JSON.stringify(
      {
        requestSeen,
        status: responseStatus,
        body: responseBody,
        messages: messageTexts,
        rowTexts,
        spinValues,
      },
      null,
      2,
    ),
  )
})
