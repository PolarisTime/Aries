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

const SALES_CASES: OperationCase[] = [
  { path: '/sales-order', heading: '销售订单', resourcePath: 'sales-orders' },
  {
    path: '/sales-outbound',
    heading: '销售出库',
    resourcePath: 'sales-outbounds',
  },
]

test.describe('销售模块', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  for (const operationCase of SALES_CASES) {
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
})
