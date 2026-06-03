import { primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

const APP_BASE_URL = 'http://127.0.0.1:3100'

test.describe('purchase contract', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('page loads at correct URL', async ({ page, assertNoFatalUiErrors }) => {
    await page.goto(`${APP_BASE_URL}/purchase-contract`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/purchase-contract/)
    await assertNoFatalUiErrors()
  })
})

test.describe('sales contract', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('page loads at correct URL', async ({ page, assertNoFatalUiErrors }) => {
    await page.goto(`${APP_BASE_URL}/sales-contract`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/sales-contract/)
    await assertNoFatalUiErrors()
  })
})

test.describe('print template', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('page loads at correct URL', async ({ page, assertNoFatalUiErrors }) => {
    await page.goto(`${APP_BASE_URL}/print-template`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/print-template/)
    await assertNoFatalUiErrors()
  })
})
