import { fetchCollection, pickSearchTerm, primeApiKeySession } from './support/api-key'
import { businessRoutes } from './support/route-manifest'
import { expect, test } from './support/test'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test.describe('business module coverage with API key', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  for (const route of businessRoutes) {
    test(`covers ${route.title}`, async ({ page, assertNoFatalUiErrors }) => {
      const collection = await fetchCollection(page.request, route.apiPath)

      await page.goto(route.path)

      await expect(page).toHaveURL(new RegExp(`${escapeRegex(route.path)}(?:\\?|$)`))
      await expect(page.locator('.leo-header')).toContainText(route.title)
      await expect(page.getByPlaceholder('搜索关键词...')).toBeVisible()

      if (collection.ok && collection.records.length > 0) {
        const firstRecord = collection.records[0]
        const searchTerm = pickSearchTerm(firstRecord, route.searchKeys)

        if (searchTerm) {
          await page.getByPlaceholder('搜索关键词...').fill(searchTerm)
          await page.getByRole('button', { name: '查询' }).click()
          await expect(page.locator('table')).toContainText(searchTerm)
        }

        if (route.supportsDetail) {
          await page.locator('table').getByRole('button', { name: '详情' }).first().click()
          const drawer = page.locator('.ant-drawer:visible').last()
          await expect(drawer).toBeVisible()
          await expect(drawer.locator('.ant-drawer-title')).toContainText('记录详情')
        }
      }

      await assertNoFatalUiErrors()
    })
  }
})
