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

function searchInput(page: import('@playwright/test').Page) {
  return page
    .getByRole('textbox', {
      name: /关键字|关键词|单据编号|入库单号|出库单号|合同编号|对账单号|收款单号|付款单号|收票单号|开票单号|调整单号|部门/,
    })
    .first()
}

async function applySearch(
  page: import('@playwright/test').Page,
  input: ReturnType<typeof searchInput>,
) {
  const queryButton = page.getByRole('button', { name: /查\s*询/ })
  if (
    (await queryButton.count()) > 0 &&
    (await queryButton.first().isVisible())
  ) {
    await queryButton.first().click()
    return
  }

  await input.press('Enter')
}

async function gotoBusinessRoute(
  page: import('@playwright/test').Page,
  path: string,
) {
  await page.goto(path, { waitUntil: 'networkidle' })
  if (!/\/login(?:\?|$)/.test(page.url())) {
    return
  }

  await primeApiKeySession(page)
  await page.goto(path, { waitUntil: 'networkidle' })
}

test.describe('business module coverage', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  for (const route of businessRoutes) {
    test(`covers ${route.title}`, async ({ page, assertNoFatalUiErrors }) => {
      const collection = await fetchCollection(page.request, route.apiPath)

      await gotoBusinessRoute(page, route.path)

      await expect(page).toHaveURL(
        new RegExp(`${escapeRegex(route.path)}(?:\\?|$)`),
      )
      await expect(page.locator('form[aria-label="筛选条件"]')).toBeVisible()
      await expect(page.locator('table').first()).toBeVisible()

      const keywordInput = searchInput(page)
      const hasSearchInput = (await keywordInput.count()) > 0
      if (hasSearchInput) {
        await expect(keywordInput).toBeVisible()
      }

      if (collection.ok && collection.records.length > 0) {
        const firstRecord = collection.records[0]
        const searchTerm = pickSearchTerm(firstRecord, route.searchKeys)
        const resultTable = page.locator('table').last()
        let hasSearchResults = true

        if (searchTerm && hasSearchInput) {
          await keywordInput.fill(searchTerm)
          await applySearch(page, keywordInput)
          await expect
            .poll(() => resultTable.innerText())
            .toMatch(new RegExp(`${escapeRegex(searchTerm)}|暂无数据`))
          hasSearchResults = !(await resultTable.getByText('暂无数据').count())
        }

        if (route.supportsDetail && hasSearchResults) {
          const firstDataRow = page
            .locator('.ant-table-tbody tr:not(.ant-table-measure-row)')
            .first()
          await expect(firstDataRow).toBeVisible()
          await firstDataRow.dblclick()
          const overlay = page.locator('.workspace-overlay-panel').last()
          await expect(overlay).toBeVisible()
          const overlayTitle = overlay.locator('.workspace-overlay-title')
          await expect(overlayTitle).toContainText(route.title)
          await expect(overlayTitle).toHaveText(/编辑|详情/)
        }
      }

      await assertNoFatalUiErrors()
    })
  }
})
