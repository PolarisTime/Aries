import type { Locator, Page } from '@playwright/test'
import { e2eApiUrl } from './support/api-key'
import {
  fillOrReadFormField,
  fillPurchaseOrderLineItem,
  formField,
  waitForFirstDetailRow,
} from './support/business-e2e'
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

function isoNextDay() {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function openCreateOverlay(page: Page) {
  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await page.getByRole('button', { name: /新建|新增/ }).click()
  const overlay = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(overlay).toBeVisible()
  return overlay
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
  expect(accessToken).toBeTruthy()
  expect(user).toBeTruthy()

  await page.addInitScript(
    ({
      token,
      currentUser,
      ttl,
    }: {
      token: string
      currentUser: unknown
      ttl: number
    }) => {
      const expiresAt = String(Date.now() + ttl * 1000)
      localStorage.setItem('aries-token', token)
      localStorage.setItem('aries-token-expires-at', expiresAt)
      localStorage.setItem('aries-user', JSON.stringify(currentUser))
      localStorage.setItem('aries-auth-persistence', 'local')
      localStorage.setItem('leo-locale', 'zh-CN')
      sessionStorage.removeItem('aries-token')
      sessionStorage.removeItem('aries-token-expires-at')
      sessionStorage.removeItem('aries-user')
      sessionStorage.removeItem('aries-auth-persistence')
    },
    {
      token: accessToken,
      currentUser: user,
      ttl: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 1800,
    },
  )

  await page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
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
  const searchInput = selector.getByPlaceholder('搜索单据号...')
  await searchInput.fill(keyword)
  await searchInput.press('Enter')
  const row = selector
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: keyword })
    .first()
  await expect(row).toBeVisible()
  await row.click()
}

async function waitForSaveOutcome(
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
    hasText: /创建成功|更新成功|保存成功/,
  })
  const saveResultText = page.getByText(/保存成功|创建成功|更新成功/)

  await expect
    .poll(
      async () => {
        if ((await successMessage.count()) > 0) {
          return 'message'
        }
        if (
          await saveResultText
            .last()
            .isVisible()
            .catch(() => false)
        ) {
          return 'result'
        }
        if (
          rowInList &&
          (await rowInList.count()) > 0 &&
          (await rowInList.isVisible())
        ) {
          return 'row'
        }
        if (!(await overlay.isVisible().catch(() => false))) {
          return 'closed'
        }
        return 'pending'
      },
      { timeout: 20_000, intervals: [200, 500, 1000] },
    )
    .not.toBe('pending')
}

async function saveOverlay(page: Page, overlay: Locator, expectedNo?: string) {
  await overlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存$/ })
    .click()
  await waitForSaveOutcome(page, overlay, expectedNo)
}

async function saveAndAuditOverlay(
  page: Page,
  overlay: Locator,
  expectedNo?: string,
) {
  await overlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存并审核$/ })
    .click()
  await waitForSaveOutcome(page, overlay, expectedNo)
}

test.describe('purchase to sales chain', () => {
  test('creates purchase order, inbound, sales order and sales outbound with remaining coil quantity', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    test.setTimeout(180_000)
    await loginAsTest9(page)

    const suffix = buildSuffix()
    const orderDate = isoToday()
    const deliveryDate = isoNextDay()
    let purchaseOrderNo = `PO-E2E-${suffix}`
    let purchaseInboundNo = `PI-E2E-${suffix}`
    let salesOrderNo = `SO-E2E-${suffix}`
    let salesOutboundNo = `SOB-E2E-${suffix}`

    await page.goto('/purchase-order')
    const purchaseOrderOverlay = await openCreateOverlay(page)
    await selectAntOption(
      formField(purchaseOrderOverlay, 'supplierName'),
      '益海（浙江）物联网科技有限公司',
    )
    purchaseOrderNo = await fillOrReadFormField(
      formField(purchaseOrderOverlay, 'orderNo'),
      purchaseOrderNo,
    )
    await fillDateInput(formField(purchaseOrderOverlay, 'orderDate'), orderDate)

    const purchaseOrderRow = await waitForFirstDetailRow(purchaseOrderOverlay)
    await fillPurchaseOrderLineItem(purchaseOrderRow)

    await saveOverlay(page, purchaseOrderOverlay, purchaseOrderNo)

    await page.goto('/purchase-inbound')
    const purchaseInboundOverlay = await openCreateOverlay(page)
    purchaseInboundNo = await fillOrReadFormField(
      formField(purchaseInboundOverlay, 'inboundNo'),
      purchaseInboundNo,
    )
    await fillDateInput(
      formField(purchaseInboundOverlay, 'inboundDate'),
      orderDate,
    )
    await importParentByKeyword(
      page,
      purchaseInboundOverlay,
      '导入采购订单明细',
      purchaseOrderNo,
    )

    const purchaseInboundRow = await waitForFirstDetailRow(
      purchaseInboundOverlay,
    )
    const inboundWeightInput = purchaseInboundRow
      .locator('input[role="spinbutton"]')
      .nth(1)
    await setSpinbuttonValue(inboundWeightInput, '23.550')
    await expect(inboundWeightInput).toHaveValue('23.550')

    await saveOverlay(page, purchaseInboundOverlay, purchaseInboundNo)

    await page.goto('/sales-order')
    const salesOrderOverlay = await openCreateOverlay(page)
    salesOrderNo = await fillOrReadFormField(
      formField(salesOrderOverlay, 'orderNo'),
      salesOrderNo,
    )
    await selectAntOption(
      formField(salesOrderOverlay, 'customerName'),
      '浙江大东吴杭萧绿建科技有限公司',
    )
    await selectAntOption(
      formField(salesOrderOverlay, 'projectName'),
      '恒力(大连)船厂有限公司-绿色高端装备制造项目6#曲面分段车间',
    )
    await fillDateInput(
      formField(salesOrderOverlay, 'deliveryDate'),
      deliveryDate,
    )
    await importParentByKeyword(
      page,
      salesOrderOverlay,
      '导入采购订单明细',
      purchaseOrderNo,
    )

    const salesOrderRow = await waitForFirstDetailRow(salesOrderOverlay)
    await setSpinbuttonValue(
      salesOrderRow.locator('input[role="spinbutton"]').nth(0),
      '6',
    )
    await setSpinbuttonValue(
      salesOrderRow.locator('input[role="spinbutton"]').nth(1),
      '3600',
    )

    await saveOverlay(page, salesOrderOverlay, salesOrderNo)

    await page.goto('/sales-outbound')
    const salesOutboundOverlay = await openCreateOverlay(page)
    salesOutboundNo = await fillOrReadFormField(
      formField(salesOutboundOverlay, 'outboundNo'),
      salesOutboundNo,
    )
    await fillDateInput(
      formField(salesOutboundOverlay, 'outboundDate'),
      deliveryDate,
    )
    await importParentByKeyword(
      page,
      salesOutboundOverlay,
      '导入销售订单明细',
      salesOrderNo,
    )
    await saveAndAuditOverlay(page, salesOutboundOverlay, salesOutboundNo)

    const loginRes = await page.request.post(
      'http://127.0.0.1:11211/api/auth/login',
      {
        data: {
          loginName: 'test9',
          password: '123456',
        },
      },
    )
    expect(loginRes.ok()).toBeTruthy()
    const loginPayload = (await loginRes.json()) as {
      code: number
      data?: { accessToken?: string }
    }
    expect(loginPayload.code).toBe(0)
    const token = String(loginPayload.data?.accessToken || '')
    expect(token).toBeTruthy()

    const purchaseOrderSearch = await page.request.get(
      e2eApiUrl(
        'purchase-order',
        `search?keyword=${encodeURIComponent(purchaseOrderNo)}&limit=5`,
      ),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(purchaseOrderSearch.ok()).toBeTruthy()

    const purchaseOrderSearchJson = (await purchaseOrderSearch.json()) as {
      code: number
      data?: Array<{ id?: string }>
    }
    expect(purchaseOrderSearchJson.code).toBe(0)
    const purchaseOrderId = String(purchaseOrderSearchJson.data?.[0]?.id || '')
    expect(purchaseOrderId).toBeTruthy()

    const purchaseOrderDetailRes = await page.request.get(
      e2eApiUrl('purchase-order', purchaseOrderId),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(purchaseOrderDetailRes.ok()).toBeTruthy()
    const purchaseOrderDetailJson = (await purchaseOrderDetailRes.json()) as {
      code: number
      data?: {
        items?: Array<{
          materialCode?: string
          salesRemainingQuantity?: number
          quantity?: number
        }>
      }
    }
    expect(purchaseOrderDetailJson.code).toBe(0)
    const coilItem = purchaseOrderDetailJson.data?.items?.find(
      (item) => String(item.materialCode || '').trim() === 'HZ-YG-PL8',
    )
    expect(coilItem).toBeTruthy()
    expect(Number(coilItem?.quantity || 0)).toBe(10)
    expect(Number(coilItem?.salesRemainingQuantity || 0)).toBe(4)

    const salesOrderSearch = await page.request.get(
      e2eApiUrl(
        'sales-order',
        `search?keyword=${encodeURIComponent(salesOrderNo)}&limit=5`,
      ),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(salesOrderSearch.ok()).toBeTruthy()
    const salesOrderSearchJson = (await salesOrderSearch.json()) as {
      code: number
      data?: Array<{ id?: string }>
    }
    expect(salesOrderSearchJson.code).toBe(0)
    const salesOrderId = String(salesOrderSearchJson.data?.[0]?.id || '')
    expect(salesOrderId).toBeTruthy()

    const salesOrderDetailRes = await page.request.get(
      e2eApiUrl('sales-order', salesOrderId),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(salesOrderDetailRes.ok()).toBeTruthy()
    const salesOrderDetailJson = (await salesOrderDetailRes.json()) as {
      code: number
      data?: { status?: string }
    }
    expect(salesOrderDetailJson.code).toBe(0)
    expect(String(salesOrderDetailJson.data?.status || '')).toBe('待完善')

    await assertNoFatalUiErrors()
  })
})
