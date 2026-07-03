import { primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

async function gotoAuthenticatedDashboard(
  page: import('@playwright/test').Page,
) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  if (!/\/login(?:\?|$)/.test(page.url())) {
    return
  }

  await primeApiKeySession(page)
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
}

test.describe('coverage probes', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('renders lazy overlay components in the real browser app', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoAuthenticatedDashboard(page)
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/)

    await page.evaluate(async () => {
      const probePath = '/src/test/e2e-coverage-probe.tsx'
      const probe = await import(probePath)
      await probe.runE2eCoverageProbe()
    })

    await assertNoFatalUiErrors()
  })
})
