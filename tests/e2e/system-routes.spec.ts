import { fetchFirstApiKeyRecord, primeApiKeySession } from './support/api-key'
import { systemRoutes } from './support/route-manifest'
import { expect, test } from './support/test'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test.describe('system route coverage with API key', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  for (const route of systemRoutes) {
    test(`loads ${route.title} at ${route.path}`, async ({ page, assertNoFatalUiErrors }) => {
      await page.goto(route.path)

      await expect(page).toHaveURL(new RegExp(`${escapeRegex(route.path)}(?:\\?|$)`))
      await expect(page.locator('main')).toContainText(route.title)
      await expect(page.locator('main')).toContainText(route.marker)
      await assertNoFatalUiErrors()
    })
  }

  test('loads API Key detail route for a live record', async ({ page, assertNoFatalUiErrors }) => {
    const firstApiKey = await fetchFirstApiKeyRecord(page.request)
    expect(firstApiKey, 'auth/api-keys 没有可用于详情页测试的记录').toBeTruthy()

    await page.goto(`/api-key-management/${encodeURIComponent(String(firstApiKey?.id || ''))}`)

    await expect(page.locator('main')).toContainText('API Key 详情')
    await expect(page.locator('main')).toContainText('密钥名称')
    if (firstApiKey?.keyName) {
      await expect(page.locator('main')).toContainText(String(firstApiKey.keyName))
    }
    await assertNoFatalUiErrors()
  })
})
