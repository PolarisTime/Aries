import { expect } from '@playwright/test'
import {
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
  openFilterChip,
} from './support/business-e2e'
import { test } from './support/test'

test.describe('财务模块', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('财务概览加载并展示应收汇总', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/finance-overview')
    await expectModuleHeading(page, '财务概览')
    await expectGridTable(page)
    await expect(page.getByText('应收').first()).toBeVisible()
    await assertNoFatalUiErrors()
  })

  test('收款单列表加载并可打开状态筛选', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/receipt')
    await expectModuleHeading(page, '收款单')
    await expectGridTable(page)
    await openFilterChip(page, '单据状态')
    await expect(
      page.locator('.ant-popover:visible [aria-label="单据状态"]').first(),
    ).toBeVisible({ timeout: 30_000 })
    await page.keyboard.press('Escape')
    await assertNoFatalUiErrors()
  })

  test('付款单列表加载并可打开业务类型筛选', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/payment')
    await expectModuleHeading(page, '付款单')
    await expectGridTable(page)
    await openFilterChip(page, '业务类型')
    await expect(
      page.locator('.ant-popover:visible [aria-label="业务类型"]').first(),
    ).toBeVisible({ timeout: 30_000 })
    await page.keyboard.press('Escape')
    await assertNoFatalUiErrors()
  })

  test('资金流水选择结算主体后可查询', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/cash-ledger')
    await expectModuleHeading(page, '资金流水')

    const companySelect = page
      .locator('.ant-select')
      .filter({ hasText: /结算主体|请选择结算主体/ })
      .first()
    await expect(companySelect).toBeVisible({ timeout: 30_000 })
    await companySelect.click()

    const option = page
      .locator('.ant-select-dropdown:visible .ant-select-item-option')
      .first()
    if ((await option.count()) > 0) {
      const responsePromise = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('cash-ledger'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await option.click()
      await responsePromise
      await expectGridTable(page)
    } else {
      await expect(page.getByText('请选择结算主体').first()).toBeVisible()
    }

    await assertNoFatalUiErrors()
  })
})
