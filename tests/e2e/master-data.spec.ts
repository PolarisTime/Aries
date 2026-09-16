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
  searchModule,
} from './support/business-e2e'
import { test } from './support/test'

interface MasterCase {
  path: string
  heading: string
  resourcePath: string
}

const MASTER_CASES: MasterCase[] = [
  { path: '/material', heading: '商品资料', resourcePath: 'materials' },
  {
    path: '/material-categories',
    heading: '商品类别',
    resourcePath: 'material-categories',
  },
  { path: '/supplier', heading: '供应商资料', resourcePath: 'suppliers' },
  { path: '/customer', heading: '客户资料', resourcePath: 'customers' },
  { path: '/project', heading: '项目资料', resourcePath: 'projects' },
  { path: '/carrier', heading: '物流方资料', resourcePath: 'carriers' },
  { path: '/warehouse', heading: '仓库资料', resourcePath: 'warehouses' },
]

test.describe('基础资料模块', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  for (const masterCase of MASTER_CASES) {
    test(`${masterCase.heading} 列表加载 + 搜索 + 详情`, async ({
      page,
      assertNoFatalUiErrors,
    }) => {
      await gotoRoute(page, masterCase.path)
      await expectModuleHeading(page, masterCase.heading)
      await expectGridTable(page)

      const keyword = await firstRowPrimaryNo(page)
      if (keyword) {
        await searchModule(page, keyword, masterCase.resourcePath)
      } else {
        await expect(moduleKeywordInput(page)).toBeVisible()
      }

      // 打开首行内联详情
      const detailToggle = page
        .locator(
          'button.table-detail-toggle-btn[aria-label="查看明细"]:visible',
        )
        .first()
      if ((await detailToggle.count()) > 0) {
        await detailToggle.click()
        await expect(
          page
            .locator(
              '[id^="master-detail-"]:visible, .module-record-detail-inline:visible',
            )
            .first(),
        ).toBeVisible({ timeout: 30_000 })
      }

      await assertNoFatalUiErrors()
    })
  }

  test('商品资料 双击行可打开编辑浮层（不保存）', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/material')
    await expectModuleHeading(page, '商品资料')
    await expectGridTable(page)
    await expect(await firstDataRow(page)).not.toBeNull()

    const overlay = await openFirstRowEditor(page)
    expect(overlay).not.toBeNull()
    await closeTopOverlay(page)

    await assertNoFatalUiErrors()
  })
})
