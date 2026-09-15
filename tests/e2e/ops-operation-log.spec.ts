import { expect } from '@playwright/test'
import { gotoRouteE2e, loginE2e, selectPopoverOption } from './ops-e2e-support'
import {
  expectGridTable,
  expectModuleHeading,
  firstRowPrimaryNo,
  moduleKeywordInput,
} from './support/business-e2e'
import { test } from './support/test'

test.describe('操作日志真实操作', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
  })

  test('列表加载 + 模块筛选 + 关键字搜索', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/operation-log')
    await expectModuleHeading(page, '操作日志')
    await expectGridTable(page)

    const moduleResponse = page
      .waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('operation-logs') &&
          response.url().includes('moduleName'),
        { timeout: 30_000 },
      )
      .catch(() => null)
    await selectPopoverOption(page, '模块', '身份认证')
    await moduleResponse
    await expectGridTable(page)

    const input = moduleKeywordInput(page)
    await expect(input).toBeVisible({ timeout: 30_000 })

    let keyword = await firstRowPrimaryNo(page)
    if (!keyword) {
      const firstRowText =
        (await page
          .locator('tbody tr:not(.ant-table-measure-row)')
          .first()
          .textContent()
          .catch(() => '')) || ''
      keyword = firstRowText.match(/OP\d{4,}/)?.[0] || '登录'
    }

    const searchResponse = page
      .waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('operation-logs') &&
          response.url().includes('keyword'),
        { timeout: 30_000 },
      )
      .catch(() => null)
    await input.fill(keyword)
    await input.press('Enter')
    await searchResponse
    await expectGridTable(page)

    await assertNoFatalUiErrors()
  })
})
