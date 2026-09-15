import { expect } from '@playwright/test'
import {
  closeTopOverlay,
  expectGridTable,
  expectModuleHeading,
  firstDataRow,
  firstRowPrimaryNo,
  gotoRoute,
  loginAsE2eUser,
  moduleKeywordInput,
  openFirstRowEditor,
} from './support/business-e2e'
import { test } from './support/test'

interface OperationCase {
  path: string
  heading: string
  resourcePath: string
}

const PURCHASE_CASES: OperationCase[] = [
  {
    path: '/purchase-order',
    heading: '采购订单',
    resourcePath: 'purchase-orders',
  },
  {
    path: '/purchase-inbound',
    heading: '采购入库',
    resourcePath: 'purchase-inbounds',
  },
]

test.describe('采购模块', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  for (const operationCase of PURCHASE_CASES) {
    test(`${operationCase.heading} 列表加载 + 关键字筛选 + 编辑器浮层`, async ({
      page,
      assertNoFatalUiErrors,
    }) => {
      await gotoRoute(page, operationCase.path)
      await expectModuleHeading(page, operationCase.heading)
      await expectGridTable(page)

      const keywordInput = moduleKeywordInput(page)
      await expect(keywordInput).toBeVisible()

      const keyword = await firstRowPrimaryNo(page)
      if (keyword) {
        const responsePromise = page
          .waitForResponse(
            (response) =>
              response.request().method() === 'GET' &&
              response.url().includes(operationCase.resourcePath),
            { timeout: 30_000 },
          )
          .catch(() => null)
        await keywordInput.fill(keyword)
        await keywordInput.press('Enter')
        await responsePromise
        await expect(await firstDataRow(page)).not.toBeNull()
      }

      const overlay = await openFirstRowEditor(page)
      if (overlay) {
        await closeTopOverlay(page)
      } else {
        await expect(
          page.getByText(/没有匹配的记录|还没有任何数据|暂无/).first(),
        ).toBeVisible({ timeout: 30_000 })
      }

      await assertNoFatalUiErrors()
    })
  }

  test('采购订单 新建浮层可打开并取消', async ({ page }) => {
    await gotoRoute(page, '/purchase-order')
    await expectModuleHeading(page, '采购订单')
    await page
      .getByRole('button', { name: /新增|新建/ })
      .first()
      .click()
    await expect(
      page.locator('.workspace-overlay-panel').first(),
    ).toBeVisible({ timeout: 30_000 })
    await closeTopOverlay(page)
  })
})
