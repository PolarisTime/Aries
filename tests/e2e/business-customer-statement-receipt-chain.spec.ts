import type { Locator, Page } from '@playwright/test'
import { waitForFirstDetailRow } from './support/business-e2e'
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

function compareRecordIds(left: { id?: string }, right: { id?: string }) {
  const leftId = BigInt(String(left.id || '0'))
  const rightId = BigInt(String(right.id || '0'))
  if (leftId === rightId) {
    return 0
  }
  return leftId > rightId ? -1 : 1
}

async function loginAsTest9(page: Page) {
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

async function getCurrentAccessToken(page: Page) {
  const token = await page.evaluate(
    () => localStorage.getItem('aries-token') || '',
  )
  expect(token).toBeTruthy()
  return token
}

async function openCreateOverlay(page: Page) {
  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await page.getByRole('button', { name: '新建' }).click()
  const overlay = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(overlay).toBeVisible()
  return overlay
}

async function selectAntOption(target: Locator, optionText?: string) {
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
    hasText: /创建成功|更新成功|保存成功|对账单已生成/,
  })
  const errorMessage = page.locator('.ant-message-error').last()
  const validationErrors = overlay.locator('.ant-form-item-explain-error')

  await expect
    .poll(
      async () => {
        if (
          (await errorMessage.count()) > 0 &&
          (await errorMessage.isVisible())
        ) {
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
        if ((await successMessage.count()) > 0) return 'message'
        if (
          rowInList &&
          (await rowInList.count()) > 0 &&
          (await rowInList.isVisible())
        )
          return 'row'
        if (!(await overlay.isVisible().catch(() => false))) return 'closed'
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

async function createPurchaseSalesCompletedChain(page: Page, suffix: string) {
  const orderDate = isoToday()
  const deliveryDate = isoNextDay()
  const purchaseOrderNo = `PO-CS-${suffix}`
  const salesOrderNo = `SO-CS-${suffix}`
  const salesOutboundNo = `SOB-CS-${suffix}`

  await page.goto('/purchase-order')
  const purchaseOrderOverlay = await openCreateOverlay(page)
  await selectAntOption(
    purchaseOrderOverlay.locator('#supplierName'),
    '益海（浙江）物联网科技有限公司',
  )
  await purchaseOrderOverlay.locator('#orderNo').fill(purchaseOrderNo)
  await fillDateInput(purchaseOrderOverlay.locator('#orderDate'), orderDate)
  const purchaseOrderRow = await waitForFirstDetailRow(purchaseOrderOverlay)
  await purchaseOrderRow.locator('td').nth(3).locator('input').fill('HZ-YG-PL8')
  await page.waitForTimeout(1200)
  await selectAntOption(
    purchaseOrderRow.locator('td').nth(10).locator('.ant-select'),
    '升华物流',
  )
  await purchaseOrderRow.locator('td').nth(12).locator('input').fill('10')
  await purchaseOrderRow.locator('td').nth(16).locator('input').fill('3200')
  await saveOverlay(page, purchaseOrderOverlay, purchaseOrderNo)

  await page.goto('/sales-order')
  const salesOrderOverlay = await openCreateOverlay(page)
  await salesOrderOverlay.locator('#orderNo').fill(salesOrderNo)
  await selectAntOption(
    salesOrderOverlay.locator('#customerName'),
    '浙江大东吴杭萧绿建科技有限公司',
  )
  await selectAntOption(
    salesOrderOverlay.locator('#projectName'),
    '恒力(大连)船厂有限公司-绿色高端装备制造项目6#曲面分段车间',
  )
  await fillDateInput(salesOrderOverlay.locator('#deliveryDate'), deliveryDate)
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
  await salesOutboundOverlay.locator('#outboundNo').fill(salesOutboundNo)
  await fillDateInput(
    salesOutboundOverlay.locator('#outboundDate'),
    deliveryDate,
  )
  await importParentByKeyword(
    page,
    salesOutboundOverlay,
    '导入销售订单明细',
    salesOrderNo,
  )
  await saveAndAuditOverlay(page, salesOutboundOverlay, salesOutboundNo)

  return { salesOrderNo, deliveryDate }
}

test('creates customer statement and receipt from completed sales flow', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  const receiptNo = `RC-CS-${suffix}`

  const { salesOrderNo, deliveryDate } =
    await createPurchaseSalesCompletedChain(page, suffix)

  const fetchSalesOrderId = async () => {
    const token = await getCurrentAccessToken(page)
    const salesOrderSearch = await page.request.get(
      `${API_BASE_URL}/sales-order/search?keyword=${encodeURIComponent(salesOrderNo)}&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const salesOrderSearchJson = (await salesOrderSearch.json()) as {
      code: number
      message?: string
      data?: Array<{ id?: string }>
    }
    if (salesOrderSearchJson.code !== 0) {
      throw new Error(
        `sales-order search failed: code=${salesOrderSearchJson.code}, message=${String(
          salesOrderSearchJson.message || '',
        )}`,
      )
    }
    return String(salesOrderSearchJson.data?.[0]?.id || '')
  }

  await expect
    .poll(fetchSalesOrderId, {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe('')

  const salesOrderId = await fetchSalesOrderId()
  const currentToken = await getCurrentAccessToken(page)

  const salesOrderDetailRes = await page.request.get(
    `${API_BASE_URL}/sales-order/${salesOrderId}`,
    { headers: { Authorization: `Bearer ${currentToken}` } },
  )
  const salesOrderDetailJson = (await salesOrderDetailRes.json()) as {
    code: number
    data?: { status?: string; deliveryDate?: string }
  }
  expect(salesOrderDetailJson.code).toBe(0)
  expect(['待完善', '完成销售']).toContain(
    String(salesOrderDetailJson.data?.status || ''),
  )
  const actualDeliveryDate = String(
    salesOrderDetailJson.data?.deliveryDate || deliveryDate,
  )

  await page.goto('/customer-statement')
  await page.getByRole('button', { name: '生成对账单' }).click()
  const statementModal = page.getByRole('dialog', { name: '生成客户对账单' })
  await expect(statementModal).toBeVisible()
  await selectAntOption(
    statementModal.locator('.ant-select').first(),
    '浙江大东吴杭萧绿建科技有限公司',
  )
  const rangeInputs = statementModal.locator('.ant-picker-input input')
  await fillDateInput(rangeInputs.nth(0), actualDeliveryDate)
  await fillDateInput(rangeInputs.nth(1), actualDeliveryDate)
  await statementModal.getByRole('button', { name: '生成对账单' }).click()

  const fetchCustomerStatementByKeyword = async () => {
    const currentToken = await getCurrentAccessToken(page)
    const customerStatementSearch = await page.request.get(
      `${API_BASE_URL}/customer-statement/search?keyword=${encodeURIComponent(salesOrderNo)}&limit=10`,
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const customerStatementSearchJson =
      (await customerStatementSearch.json()) as {
        code: number
        data?: Array<{
          id?: string
          statementNo?: string
          closingAmount?: number
          customerName?: string
          projectName?: string
        }>
      }
    expect(customerStatementSearchJson.code).toBe(0)
    return (
      (customerStatementSearchJson.data || [])
        .filter((item) => String(item.statementNo || item.id || '').length > 0)
        .sort(compareRecordIds)[0] || null
    )
  }

  await expect
    .poll(
      async () => String((await fetchCustomerStatementByKeyword())?.id || ''),
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe('')

  const statement = await fetchCustomerStatementByKeyword()

  expect(statement).toBeTruthy()
  const statementId = String(statement?.id || '')
  expect(statementId).toBeTruthy()

  await page.goto('/receipt')
  const receiptOverlay = await openCreateOverlay(page)
  await receiptOverlay.locator('#receiptNo').fill(receiptNo)
  await selectAntOption(
    receiptOverlay.locator('#customerName'),
    String(statement?.customerName || '浙江大东吴杭萧绿建科技有限公司'),
  )
  await receiptOverlay
    .locator('#projectName')
    .fill(String(statement?.projectName || ''))
  await selectAntOption(
    receiptOverlay.locator('#sourceStatementId'),
    String(statement?.statementNo || ''),
  )
  await fillDateInput(
    receiptOverlay.locator('#receiptDate'),
    actualDeliveryDate,
  )
  await selectAntOption(receiptOverlay.locator('#payType'), '银行转账')
  await receiptOverlay
    .locator('#amount')
    .fill(String(Number(statement?.closingAmount || 0).toFixed(2)))
  await selectAntOption(receiptOverlay.locator('#status'), '已收款')
  await receiptOverlay.locator('#operatorName').fill('test9')
  await saveOverlay(page, receiptOverlay, receiptNo)

  const latestToken = await getCurrentAccessToken(page)
  const receiptSearch = await page.request.get(
    `${API_BASE_URL}/receipt/search?keyword=${encodeURIComponent(receiptNo)}&limit=5`,
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const receiptSearchJson = (await receiptSearch.json()) as {
    code: number
    data?: Array<{ id?: string }>
  }
  expect(receiptSearchJson.code).toBe(0)
  const receiptId = String(receiptSearchJson.data?.[0]?.id || '')
  expect(receiptId).toBeTruthy()

  const receiptDetailRes = await page.request.get(
    `${API_BASE_URL}/receipt/${receiptId}`,
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const receiptDetailJson = (await receiptDetailRes.json()) as {
    code: number
    data?: {
      receiptNo?: string
      status?: string
      sourceStatementId?: string | number | null
      amount?: number
      items?: Array<{
        allocatedAmount?: number
        sourceStatementId?: string | number
      }>
    }
  }
  expect(receiptDetailJson.code).toBe(0)
  expect(String(receiptDetailJson.data?.receiptNo || '')).toBe(receiptNo)
  expect(String(receiptDetailJson.data?.status || '')).toBe('已收款')
  expect(String(receiptDetailJson.data?.sourceStatementId || '')).toBe(
    statementId,
  )
  expect(Number(receiptDetailJson.data?.amount || 0)).toBeGreaterThan(0)
  expect(
    Number(receiptDetailJson.data?.items?.[0]?.allocatedAmount || 0),
  ).toBeGreaterThan(0)

  const refreshedStatementDetailRes = await page.request.get(
    `${API_BASE_URL}/customer-statement/${statementId}`,
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const refreshedStatementDetailJson =
    (await refreshedStatementDetailRes.json()) as {
      code: number
      data?: {
        receiptAmount?: number
        closingAmount?: number
        salesAmount?: number
      }
    }
  expect(refreshedStatementDetailJson.code).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.receiptAmount || 0),
  ).toBeGreaterThan(0)
  expect(Number(refreshedStatementDetailJson.data?.closingAmount || 0)).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.salesAmount || 0),
  ).toBeGreaterThan(0)

  await assertNoFatalUiErrors()
})
