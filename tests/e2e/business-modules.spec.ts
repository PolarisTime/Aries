import {
  fetchCollection,
  pickSearchTerm,
  primeApiKeySession,
} from './support/api-key'
import { businessRoutes } from './support/route-manifest'
import { expect, test } from './support/test'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test.describe('business module coverage', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  for (const route of businessRoutes) {
    test(`covers ${route.title}`, async ({ page, assertNoFatalUiErrors }) => {
      const collection = await fetchCollection(page.request, route.apiPath)

      await page.goto(route.path)

      await expect(page).toHaveURL(
        new RegExp(`${escapeRegex(route.path)}(?:\\?|$)`),
      )
      await expect(page.locator('main')).toContainText(route.title)
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
          const firstDataRow = page
            .locator('.ant-table-tbody tr:not(.ant-table-measure-row)')
            .first()
          await expect(firstDataRow).toBeVisible()
          await firstDataRow.dblclick()
          const overlay = page.locator('.workspace-overlay-panel').last()
          await expect(overlay).toBeVisible()
          await expect(overlay.locator('.workspace-overlay-title')).toHaveText(
            new RegExp(`.*(编辑|详情).*${escapeRegex(route.title)}.*`),
          )
        }
      }

      await assertNoFatalUiErrors()
    })
  }
})
