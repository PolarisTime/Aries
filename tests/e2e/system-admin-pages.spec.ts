import { primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

const APP_BASE_URL = 'http://127.0.0.1:3100'

test.describe('system admin pages', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('database status page loads', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await page.goto(`${APP_BASE_URL}/database`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/database/)
    await assertNoFatalUiErrors()
  })

  test('security key page loads', async ({ page, assertNoFatalUiErrors }) => {
    await page.goto(`${APP_BASE_URL}/security-key`, {
      waitUntil: 'networkidle',
    })
    await expect(page).toHaveURL(/\/security-key/)
    await assertNoFatalUiErrors()
  })

  test('access control page loads', async ({ page, assertNoFatalUiErrors }) => {
    await page.goto(`${APP_BASE_URL}/access-control`, {
      waitUntil: 'networkidle',
    })
    await expect(page).toHaveURL(/\/access-control/)
    await assertNoFatalUiErrors()
  })
})
