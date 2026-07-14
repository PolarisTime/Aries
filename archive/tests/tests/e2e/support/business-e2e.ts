import type { Locator, Page } from '@playwright/test'
import { e2eApiUrl, getPasswordSession } from './api-key'
import { expect } from './test'

export const API_BASE_URL = 'http://127.0.0.1:11211/api'
export const APP_BASE_URL = 'http://127.0.0.1:3100'
export { e2eApiUrl }

const CONTROL_ACTION_TIMEOUT_MS = 5_000
const SAVE_RESULT_TIMEOUT_MS = 20_000
const SELECT_ATTEMPTS = 3
const REFRESH_COOKIE_NAME = 'leo_refresh_token'

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

function normalizeFormKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formField(overlay: Locator, key: string) {
  const normalizedKey = normalizeFormKey(key)
  const controlSelector = [
    `#module-form-${normalizedKey}`,
    `#${key}`,
    `[name="${key}"]`,
  ].join(', ')

  return overlay
    .locator(`.ant-select:has(${controlSelector}), ${controlSelector}`)
    .first()
}

export async function fillOrReadFormField(target: Locator, value: string) {
  await expect(target).toBeVisible()
  const overlay = target.locator(
    'xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " workspace-overlay-panel ")][1]',
  )
  const preallocatedId = overlay.locator('input[aria-label="Preallocated ID"]')
  if ((await preallocatedId.count()) > 0) {
    await expect(preallocatedId).toHaveValue(/^\d+$/, {
      timeout: CONTROL_ACTION_TIMEOUT_MS,
    })
  }

  let fillError: unknown
  if (
    (await target.isEnabled().catch(() => false)) &&
    (await target.isEditable().catch(() => false))
  ) {
    try {
      await target.fill(value, { timeout: 2_000 })
      return value
    } catch (error) {
      fillError = error
    }
  }

  try {
    await expect
      .poll(() => target.inputValue().catch(() => ''), {
        timeout: 5_000,
        intervals: [100, 250, 500],
      })
      .not.toBe('')
  } catch (error) {
    throw fillError || error
  }

  return target.inputValue()
}

export async function loginAsE2eUser(page: Page) {
  const session = await getPasswordSession(page.request)
  // Business E2E uses the short-lived access token only. Removing the cookie
  // prevents the app bootstrap restoreSession call from racing every test's
  // first API request; auth-shell tests install and exercise refresh cookies
  // through their dedicated session helper instead.
  await page.context().clearCookies({ name: REFRESH_COOKIE_NAME })
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
      token: session.accessToken,
      currentUser: session.user,
      ttl: session.expiresIn,
    },
  )
  await page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
}

export async function getCurrentAccessToken(page: Page) {
  const token = await page.evaluate(
    () => localStorage.getItem('aries-token') || '',
  )
  expect(token).toBeTruthy()
  return token
}

export async function openCreateOverlay(page: Page) {
  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await page.getByRole('button', { name: /新建|新增/ }).click()
  const overlay = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(overlay).toBeVisible()
  return overlay
}

export async function openCreateEditor(page: Page, actionName: string) {
  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await page.getByRole('button', { name: actionName }).click()
  const overlay = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(overlay).toBeVisible()
  return overlay
}

function normalizeOptionText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export async function readAntSelectSelectionText(target: Locator) {
  const select = target.first()
  if ((await select.count()) === 0) {
    return ''
  }

  const selection = select.locator('.ant-select-selection-item').first()
  if ((await selection.count()) === 0) {
    return ''
  }

  const text = await selection
    .textContent({ timeout: CONTROL_ACTION_TIMEOUT_MS })
    .catch(() => '')
  return normalizeOptionText(text || '')
}

export async function selectAntOption(
  target: Locator,
  optionText?: string,
): Promise<string> {
  const select = target.first()
  await expect(select).toHaveCount(1, {
    timeout: CONTROL_ACTION_TIMEOUT_MS,
  })
  await expect(select).toBeVisible({ timeout: CONTROL_ACTION_TIMEOUT_MS })

  const desiredText = normalizeOptionText(optionText || '')
  let selectedText = await readAntSelectSelectionText(select)
  if (
    selectedText &&
    (!desiredText || normalizeOptionText(selectedText) === desiredText)
  ) {
    return selectedText
  }

  let lastFailure = ''
  for (let attempt = 0; attempt < SELECT_ATTEMPTS; attempt += 1) {
    try {
      const combobox = select.getByRole('combobox').first()
      await expect(combobox).toBeVisible({
        timeout: CONTROL_ACTION_TIMEOUT_MS,
      })
      await combobox.click({ timeout: CONTROL_ACTION_TIMEOUT_MS })
      let dropdown = target
        .page()
        .locator('.ant-select-dropdown:visible')
        .last()
      await expect(dropdown).toBeVisible({
        timeout: CONTROL_ACTION_TIMEOUT_MS,
      })

      if (desiredText) {
        const input = select.locator('input').last()
        if (
          (await input.count()) > 0 &&
          (await input.isVisible().catch(() => false))
        ) {
          await input.fill(desiredText, {
            timeout: CONTROL_ACTION_TIMEOUT_MS,
          })
          // Searching can replace the popup node; always resolve it again.
          dropdown = target
            .page()
            .locator('.ant-select-dropdown:visible')
            .last()
          await expect(dropdown).toBeVisible({
            timeout: CONTROL_ACTION_TIMEOUT_MS,
          })
        }
      }

      const enabledOptions = dropdown.locator(
        '.ant-select-item-option:not(.ant-select-item-option-disabled)',
      )
      const textMatchedOption = desiredText
        ? enabledOptions.filter({ hasText: desiredText }).first()
        : enabledOptions.first()
      await expect(enabledOptions.first()).toBeVisible({
        timeout: CONTROL_ACTION_TIMEOUT_MS,
      })
      const matchedOption = (await textMatchedOption
        .isVisible()
        .catch(() => false))
        ? textMatchedOption
        : enabledOptions.first()
      if ((await matchedOption.count()) === 0) {
        throw new Error(`未找到选项「${desiredText || '首个可用选项'}」`)
      }
      if (!(await matchedOption.isVisible().catch(() => false))) {
        throw new Error('候选项在点击前已被下拉重渲染移除')
      }

      // AntD may render the current value as the first option. Re-clicking it
      // closes and recreates the popup, so treat it as already selected.
      if ((await matchedOption.getAttribute('aria-selected')) === 'true') {
        selectedText = await readAntSelectSelectionText(select)
        if (selectedText) {
          return selectedText
        }
      }

      const matchedOptionText = normalizeOptionText(
        (await matchedOption.textContent()) || desiredText,
      )
      await matchedOption.click({ timeout: CONTROL_ACTION_TIMEOUT_MS })
      selectedText = await readAntSelectSelectionText(select)
      return selectedText || matchedOptionText
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error)
      selectedText = await readAntSelectSelectionText(select)
      if (
        selectedText &&
        (!desiredText || normalizeOptionText(selectedText) === desiredText)
      ) {
        return selectedText
      }

      const visibleDropdown = target
        .page()
        .locator('.ant-select-dropdown:visible')
      if ((await visibleDropdown.count()) > 0) {
        await target
          .page()
          .keyboard.press('Escape')
          .catch(() => undefined)
      }
      if (attempt + 1 < SELECT_ATTEMPTS) {
        await target.page().waitForTimeout(100)
      }
    }
  }

  throw new Error(
    `AntD 下拉选择失败「${desiredText || '首个可用选项'}」: ${lastFailure}`,
  )
}

export async function fillDateInput(target: Locator, value: string) {
  await target.fill(value)
  await target.press('Enter')
}

export async function setSpinbuttonValue(target: Locator, value: string) {
  const count = await target.count()
  if (count === 0) {
    throw new Error(`未找到数字输入框，无法填写「${value}」`)
  }

  const input = target.first()
  await expect(input).toBeVisible({ timeout: CONTROL_ACTION_TIMEOUT_MS })
  await expect(input).toBeEnabled({ timeout: CONTROL_ACTION_TIMEOUT_MS })
  await input.click({ timeout: CONTROL_ACTION_TIMEOUT_MS })
  await input.press('ControlOrMeta+A')
  await input.pressSequentially(value)
  await input.press('Enter')
  await input.blur()
}

export async function detailRowSpinbuttonByColumn(
  row: Locator,
  columnTitle: string,
) {
  const table = row.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " module-detail-table ")][1]',
  )
  const normalizedTitle = normalizeOptionText(columnTitle)
  const headerTexts = await table.locator('thead th').allTextContents()
  const columnIndex = headerTexts.findIndex(
    (headerText) => normalizeOptionText(headerText) === normalizedTitle,
  )
  if (columnIndex < 0) {
    throw new Error(
      `明细表缺少「${columnTitle}」列，当前列为：${headerTexts
        .map(normalizeOptionText)
        .filter(Boolean)
        .join('、')}`,
    )
  }

  return row
    .locator('td')
    .nth(columnIndex)
    .locator('input[role="spinbutton"]:visible')
    .first()
}

export async function detailRowCellByColumn(row: Locator, columnTitle: string) {
  const table = row.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " module-detail-table ")][1]',
  )
  const normalizedTitle = normalizeOptionText(columnTitle)
  const headerTexts = await table.locator('thead th').allTextContents()
  const columnIndex = headerTexts.findIndex(
    (headerText) => normalizeOptionText(headerText) === normalizedTitle,
  )
  if (columnIndex < 0) {
    throw new Error(`明细表缺少「${columnTitle}」列`)
  }
  return row.locator('td').nth(columnIndex)
}

export async function completePurchaseInboundFromOrder(
  page: Page,
  purchaseOrderNo: string,
  inboundDate: string,
) {
  await page.goto('/purchase-inbound')
  const overlay = await openCreateOverlay(page)
  await fillDateInput(formField(overlay, 'inboundDate'), inboundDate)
  await importParentByKeyword(
    page,
    overlay,
    '导入采购订单明细',
    purchaseOrderNo,
  )

  const row = await waitForFirstDetailRow(overlay)
  const weighInput = await detailRowSpinbuttonByColumn(row, '过磅重量')
  if ((await weighInput.count()) > 0) {
    const weightCell = await detailRowCellByColumn(row, '重量(吨)')
    const weightText = (await weightCell.textContent()) || ''
    const weight = Number(
      weightText.replace(/,/g, '').match(/[0-9]+(?:\.[0-9]+)?/)?.[0] || 0,
    )
    if (!(weight > 0)) {
      throw new Error(`无法从采购入库明细读取理算重量：${weightText}`)
    }
    await setSpinbuttonValue(weighInput, weight.toFixed(3))
  }
  await saveAndAuditOverlay(page, overlay)
}

export async function fillPurchaseOrderLineItem(
  row: Locator,
  options: {
    materialCode?: string
    warehouseName?: string
    quantity?: string
    unitPrice?: string
  } = {},
) {
  const {
    materialCode,
    warehouseName = '升华物流',
    quantity = '10',
    unitPrice = '3200',
  } = options

  await selectAntOption(row.locator('.ant-select').nth(0), materialCode)
  await selectAntOption(row.locator('.ant-select').nth(1), warehouseName)
  await setSpinbuttonValue(
    await detailRowSpinbuttonByColumn(row, '数量'),
    quantity,
  )
  await setSpinbuttonValue(
    await detailRowSpinbuttonByColumn(row, '单价'),
    unitPrice,
  )
}

export async function waitForFirstDetailRow(overlay: Locator) {
  const row = overlay
    .locator('.module-detail-table tbody tr:not(.ant-table-measure-row)')
    .first()
  await expect(row).toBeVisible()
  await expect(row.locator('td').nth(3)).toBeVisible()
  return row
}

async function waitForPreallocatedIdentity(overlay: Locator) {
  const preallocatedId = overlay.locator('input[aria-label="Preallocated ID"]')
  if ((await preallocatedId.count()) === 0) {
    return
  }

  await expect(preallocatedId).toHaveValue(/^\d+$/, {
    timeout: CONTROL_ACTION_TIMEOUT_MS,
  })
}

export async function waitForSaveOutcome(
  page: Page,
  overlay: Locator,
  saveResultCountBefore: number,
  expectedNo?: string,
) {
  const saveResult = page
    .locator('.save-result-overlay')
    .nth(saveResultCountBefore)
  const validationErrors = overlay.locator('.ant-form-item-explain-error')

  await expect
    .poll(
      async () => {
        const firstError = validationErrors.first()
        if ((await firstError.count()) > 0 && (await firstError.isVisible())) {
          const text = (await firstError.textContent())?.trim()
          return text ? `validation:${text}` : 'validation'
        }
        if (await saveResult.isVisible().catch(() => false)) {
          return 'result'
        }
        return 'pending'
      },
      {
        timeout: SAVE_RESULT_TIMEOUT_MS,
        intervals: [200, 500, 1000],
      },
    )
    .toBe('result')

  const failureResult = saveResult.locator(
    '.ant-result-error, .ant-result-warning',
  )
  if ((await failureResult.count()) > 0) {
    const text =
      (
        await saveResult.locator('.app-result__subtitle').textContent()
      )?.trim() ||
      (await saveResult.textContent())?.trim() ||
      '保存失败'
    throw new Error(text)
  }
  await expect(saveResult.locator('.ant-result-success')).toBeVisible()
  if (expectedNo) {
    await expect(saveResult).toContainText(expectedNo)
  }

  await saveResult.getByRole('button', { name: '关闭' }).click()
  await expect(saveResult).toBeHidden()
  await expect(overlay).toBeHidden()
}

export async function saveOverlay(
  page: Page,
  overlay: Locator,
  expectedNo?: string,
) {
  await waitForPreallocatedIdentity(overlay)
  const saveResultCountBefore = await page
    .locator('.save-result-overlay')
    .count()
  await overlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存$/ })
    .click()
  await waitForSaveOutcome(page, overlay, saveResultCountBefore, expectedNo)
}

export async function saveAndAuditOverlay(
  page: Page,
  overlay: Locator,
  expectedNo?: string,
) {
  await waitForPreallocatedIdentity(overlay)
  const saveResultCountBefore = await page
    .locator('.save-result-overlay')
    .count()
  await overlay
    .locator('button.overlay-action-button')
    .filter({ hasText: /^保存并审核$/ })
    .click()
  const confirm = page
    .locator('.ant-modal-confirm')
    .filter({ hasText: '保存并审核' })
    .last()
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: '确定审核' }).click()
  await waitForSaveOutcome(page, overlay, saveResultCountBefore, expectedNo)
}

export async function confirmSalesOrderDelivery(
  page: Page,
  salesOrderNo: string,
) {
  await page.goto('/sales-order')
  const collapsedFilter = page.locator(
    'form.module-filter-toolbar button[aria-expanded="false"]',
  )
  if ((await collapsedFilter.count()) > 0) {
    await collapsedFilter.first().click()
  }

  const deliveryDateRange = page.locator('.ant-picker-range').first()
  if (await deliveryDateRange.isVisible().catch(() => false)) {
    await deliveryDateRange.hover()
    const clearButton = deliveryDateRange.locator('.ant-picker-clear')
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click()
    }
  }

  const keyword = page.locator('input[name="keyword"]').first()
  await expect(keyword).toBeVisible()
  const listResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/sales-orders' &&
      url.searchParams.get('keyword') === salesOrderNo &&
      !url.searchParams.has('startDate') &&
      !url.searchParams.has('endDate')
    )
  })
  await keyword.fill(salesOrderNo)
  await keyword.press('Enter')
  expect((await listResponse).ok()).toBeTruthy()

  const row = page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: salesOrderNo })
    .first()
  await expect(row).toBeVisible()
  await row.click()

  const confirmDelivery = page.getByRole('button', {
    name: '确认无需调整',
  })
  await expect(confirmDelivery).toBeVisible()
  await confirmDelivery.click()
}

export async function importParentByKeyword(
  page: Page,
  overlay: Locator,
  buttonName: string,
  keyword: string,
  confirmMultipleSelection = false,
) {
  const previousImportMessage = page
    .locator('.ant-message-notice:visible')
    .filter({ hasText: '已导入' })
    .last()
  if ((await previousImportMessage.count()) > 0) {
    await expect(previousImportMessage).toBeHidden()
  }

  const beforeCount = await page.locator('.workspace-overlay-panel').count()
  await overlay.getByRole('button', { name: buttonName }).click()
  const selector = page.locator('.workspace-overlay-panel').nth(beforeCount)
  await expect(selector).toBeVisible()
  const searchInput = selector.locator('input[name="keyword"]').first()
  await expect(searchInput).toBeVisible()
  await searchInput.fill(keyword)
  await searchInput.press('Enter')
  const row = selector
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: keyword })
    .first()
  await expect(row).toBeVisible()
  await row.click()
  if (confirmMultipleSelection) {
    await selector.getByRole('button', { name: '确认导入' }).click()
  }
  await expect(selector).toBeHidden()

  let importOutcome = 'pending'
  await expect
    .poll(
      async () => {
        const notice = page.locator('.ant-message-notice:visible').last()
        if ((await notice.count()) > 0) {
          const text = (await notice.textContent())?.trim() || ''
          importOutcome = text.includes('已导入')
            ? 'imported'
            : `error:${text || '导入失败'}`
          return importOutcome
        }
        return 'pending'
      },
      {
        timeout: SAVE_RESULT_TIMEOUT_MS,
        intervals: [200, 500, 1000],
      },
    )
    .not.toBe('pending')

  if (importOutcome.startsWith('error:')) {
    throw new Error(importOutcome.slice('error:'.length))
  }
}
