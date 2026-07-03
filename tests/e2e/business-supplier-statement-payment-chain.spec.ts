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
      localStorage.setItem('leo-locale', 'zh-CN')
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
  await page.getByRole('button', { name: /新建|新增/ }).click()
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
  const saveResultText = page.getByText(
    /保存成功|创建成功|更新成功|对账单已生成/,
  )

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

async function createPurchaseInboundAuditedChain(page: Page, suffix: string) {
  const orderDate = isoToday()
  let purchaseOrderNo = `PO-SP-${suffix}`
  let purchaseInboundNo = `PI-SP-${suffix}`

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

  const purchaseInboundRow = await waitForFirstDetailRow(purchaseInboundOverlay)
  const inboundWeightInput = purchaseInboundRow
    .locator('input[role="spinbutton"]')
    .nth(1)
  await setSpinbuttonValue(inboundWeightInput, '23.550')
  await expect(inboundWeightInput).toHaveValue('23.550')

  await saveAndAuditOverlay(page, purchaseInboundOverlay, purchaseInboundNo)

  const token = await getCurrentAccessToken(page)
  const inboundSearch = await page.request.get(
    e2eApiUrl(
      'purchase-inbound',
      `search?keyword=${encodeURIComponent(purchaseInboundNo)}&limit=5`,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const inboundSearchJson = (await inboundSearch.json()) as {
    code: number
    data?: Array<{ id?: string }>
  }
  expect(inboundSearchJson.code).toBe(0)
  const purchaseInboundId = String(inboundSearchJson.data?.[0]?.id || '')
  expect(purchaseInboundId).toBeTruthy()

  const inboundDetailRes = await page.request.get(
    e2eApiUrl('purchase-inbound', purchaseInboundId),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const inboundDetailJson = (await inboundDetailRes.json()) as {
    code: number
    data?: { inboundDate?: string; status?: string }
  }
  expect(inboundDetailJson.code).toBe(0)
  expect(String(inboundDetailJson.data?.status || '')).toBe('已审核')
  const actualInboundDate = String(
    inboundDetailJson.data?.inboundDate || orderDate,
  )

  return { purchaseInboundNo, orderDate: actualInboundDate }
}

test('creates supplier statement and payment from audited purchase inbound flow', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  let paymentNo = `FK-SP-${suffix}`

  const { purchaseInboundNo, orderDate } =
    await createPurchaseInboundAuditedChain(page, suffix)

  await page.goto('/supplier-statement')
  await page.getByRole('button', { name: '生成对账单' }).click()
  const statementModal = page.getByRole('dialog', { name: '生成供应商对账单' })
  await expect(statementModal).toBeVisible()
  await selectAntOption(
    statementModal.locator('.ant-select').first(),
    '益海（浙江）物联网科技有限公司',
  )
  const rangeInputs = statementModal.locator('.ant-picker-input input')
  await fillDateInput(rangeInputs.nth(0), orderDate)
  await fillDateInput(rangeInputs.nth(1), orderDate)
  await statementModal.getByRole('button', { name: '生成对账单' }).click()

  const fetchSupplierStatementByKeyword = async () => {
    const currentToken = await getCurrentAccessToken(page)
    const response = await page.request.get(
      e2eApiUrl(
        'supplier-statement',
        `search?keyword=${encodeURIComponent(purchaseInboundNo)}&limit=10`,
      ),
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const json = (await response.json()) as {
      code: number
      data?: Array<{
        id?: string
        statementNo?: string
        closingAmount?: number
        supplierName?: string
      }>
    }
    expect(json.code).toBe(0)
    return (
      (json.data || [])
        .filter((item) => String(item.statementNo || item.id || '').length > 0)
        .sort(compareRecordIds)[0] || null
    )
  }

  await expect
    .poll(
      async () => String((await fetchSupplierStatementByKeyword())?.id || ''),
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe('')

  const statement = await fetchSupplierStatementByKeyword()
  expect(statement).toBeTruthy()
  const statementId = String(statement?.id || '')
  expect(statementId).toBeTruthy()

  await page.goto('/payment')
  const paymentOverlay = await openCreateOverlay(page)
  paymentNo = await fillOrReadFormField(
    formField(paymentOverlay, 'paymentNo'),
    paymentNo,
  )
  await selectAntOption(formField(paymentOverlay, 'businessType'), '供应商')
  await formField(paymentOverlay, 'counterpartyName').fill(
    String(statement?.supplierName || '益海（浙江）物联网科技有限公司'),
  )
  await selectAntOption(
    formField(paymentOverlay, 'sourceStatementId'),
    String(statement?.statementNo || ''),
  )
  await fillDateInput(formField(paymentOverlay, 'paymentDate'), orderDate)
  await selectAntOption(formField(paymentOverlay, 'payType'), '银行转账')
  await formField(paymentOverlay, 'amount').fill(
    String(Number(statement?.closingAmount || 0).toFixed(2)),
  )
  await selectAntOption(formField(paymentOverlay, 'status'), '已付款')
  await formField(paymentOverlay, 'operatorName').fill('test9')
  await saveOverlay(page, paymentOverlay, paymentNo)

  const latestToken = await getCurrentAccessToken(page)
  const paymentSearch = await page.request.get(
    e2eApiUrl(
      'payment',
      `search?keyword=${encodeURIComponent(paymentNo)}&limit=5`,
    ),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const paymentSearchJson = (await paymentSearch.json()) as {
    code: number
    data?: Array<{ id?: string }>
  }
  expect(paymentSearchJson.code).toBe(0)
  const paymentId = String(paymentSearchJson.data?.[0]?.id || '')
  expect(paymentId).toBeTruthy()

  const paymentDetailRes = await page.request.get(
    e2eApiUrl('payment', paymentId),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const paymentDetailJson = (await paymentDetailRes.json()) as {
    code: number
    data?: {
      paymentNo?: string
      status?: string
      businessType?: string
      sourceStatementId?: string | number | null
      amount?: number
      items?: Array<{
        allocatedAmount?: number
        sourceStatementId?: string | number
      }>
    }
  }
  expect(paymentDetailJson.code).toBe(0)
  expect(String(paymentDetailJson.data?.paymentNo || '')).toBe(paymentNo)
  expect(String(paymentDetailJson.data?.status || '')).toBe('已付款')
  expect(String(paymentDetailJson.data?.businessType || '')).toBe('供应商')
  expect(String(paymentDetailJson.data?.sourceStatementId || '')).toBe(
    statementId,
  )
  expect(Number(paymentDetailJson.data?.amount || 0)).toBeGreaterThan(0)
  expect(
    Number(paymentDetailJson.data?.items?.[0]?.allocatedAmount || 0),
  ).toBeGreaterThan(0)

  const refreshedStatementDetailRes = await page.request.get(
    e2eApiUrl('supplier-statement', statementId),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const refreshedStatementDetailJson =
    (await refreshedStatementDetailRes.json()) as {
      code: number
      data?: {
        paymentAmount?: number
        closingAmount?: number
        purchaseAmount?: number
      }
    }
  expect(refreshedStatementDetailJson.code).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.paymentAmount || 0),
  ).toBeGreaterThan(0)
  expect(Number(refreshedStatementDetailJson.data?.closingAmount || 0)).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.purchaseAmount || 0),
  ).toBeGreaterThan(0)

  await assertNoFatalUiErrors()
})
