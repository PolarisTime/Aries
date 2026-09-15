import { expect } from '@playwright/test'
import {
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
} from './support/business-e2e'
import { test } from './support/test'

test.describe('库存查询（余额/流水）', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('库存余额与库存流水页签均可加载', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/inventory')
    await expectModuleHeading(page, '库存查询')
    await expectGridTable(page)

    const balanceTab = page.getByRole('tab', { name: '库存余额' }).first()
    const transactionTab = page.getByRole('tab', { name: '库存流水' }).first()
    await expect(balanceTab).toBeVisible({ timeout: 30_000 })
    await expect(transactionTab).toBeVisible({ timeout: 30_000 })

    const responsePromise = page
      .waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('inventory/transactions'),
        { timeout: 30_000 },
      )
      .catch(() => null)
    await transactionTab.click()
    await responsePromise
    await expectGridTable(page)

    await assertNoFatalUiErrors()
  })
})
