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
      await expect(
        page.getByRole('button', { name: route.title }).first(),
      ).toBeVisible()
      await expect(page.locator('table').first()).toBeVisible()

      const keywordInput = searchInput(page)
      const hasSearchInput = (await keywordInput.count()) > 0
      if (hasSearchInput) {
        await expect(keywordInput).toBeVisible()
      }

      if (collection.ok && collection.records.length > 0) {
        const firstRecord = collection.records[0]
        const searchTerm = pickSearchTerm(firstRecord, route.searchKeys)

        if (searchTerm && hasSearchInput) {
          await keywordInput.fill(searchTerm)
          await applySearch(page, keywordInput)
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
