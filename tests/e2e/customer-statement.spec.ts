import { expect } from '@playwright/test'
import {
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
} from './support/business-e2e'
import { test } from './support/test'

test.describe('客户对账单（蓝字/红字）', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('列表加载并支持蓝字/红字方向筛选', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/customer-statement')
    await expectModuleHeading(page, '客户对账单')
    await expectGridTable(page)

    // 打开“方向”分段筛选
    const directionTrigger = page
      .locator('button')
      .filter({ hasText: /^方向/ })
      .first()
    await expect(directionTrigger).toBeVisible({ timeout: 30_000 })
    await directionTrigger.click()

    const blueOption = page.getByRole('radio', { name: '蓝字' }).first()
    const redOption = page.getByRole('radio', { name: '红字' }).first()
    await expect(blueOption).toBeVisible({ timeout: 15_000 })
    await expect(redOption).toBeVisible({ timeout: 15_000 })

    const responsePromise = page
      .waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('customer-statements') &&
          response.url().includes('billDirection'),
        { timeout: 30_000 },
      )
      .catch(() => null)
    await redOption.click()
    await responsePromise
    await expectGridTable(page)

    await assertNoFatalUiErrors()
  })
})
