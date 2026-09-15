import { expect } from '@playwright/test'
import {
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
  openFilterChip,
  searchModule,
} from './support/business-e2e'
import { test } from './support/test'

test.describe('操作日志', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('列表加载 + 模块筛选 + 关键字搜索', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/operation-log')
    await expectModuleHeading(page, '操作日志')
    await expectGridTable(page)

    await openFilterChip(page, '模块')
    await expect(
      page.locator('.ant-popover:visible [aria-label="模块"]').first(),
    ).toBeVisible({ timeout: 30_000 })
    await page.keyboard.press('Escape')

    const firstRow = page
      .locator('tbody tr:not(.ant-table-measure-row)')
      .first()
    if ((await firstRow.count()) > 0) {
      const logNo = ((await firstRow.textContent()) || '').match(
        /OP\d{6,}/,
      )?.[0]
      if (logNo) {
        await searchModule(page, logNo, 'operation-logs')
      }
    }

    await assertNoFatalUiErrors()
  })
})
