import { expect } from '@playwright/test'
import {
  expectGridTable,
  gotoRoute,
  loginAsE2eUser,
} from './support/business-e2e'
import { test } from './support/test'

/**
 * 列表页「按住行拖拽 = 批量勾选」（Windows 资源管理器式）的回归保护。
 *
 * <p>覆盖用户实际反馈的两个点：① 拖拽应当按范围勾选行；② 拖拽不应再把单元格文字
 * 拖成一片蓝色选区。行为实现见 `use-table-row-range-select.ts`。</p>
 */
test.describe('列表页拖拽框选', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('按住行向下拖: 按范围勾选, 且不再选中文字', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/sales-order')
    await expectGridTable(page)

    const rows = page.locator('tbody tr[data-row-key]')
    // 表格骨架先到、数据后到：等首行出现再决定是否跳过（直接 count() 会拿到 0 行）
    await rows
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .catch(() => undefined)
    const rowCount = await rows.count()
    test.skip(rowCount < 3, '列表数据不足 3 行，跳过拖拽框选用例')

    const first = await rows.nth(0).boundingBox()
    if (!first) test.skip(true, '行位置不可测，跳过拖拽框选用例')
    const x = Math.round(first.x + first.width * 0.55)

    await page.mouse.move(x, first.y + first.height / 2)
    await page.mouse.down()
    /*
     * 逐行移动 + 小停顿：勾选从 0 变 1 时「已选择 N 项」横幅会插入工具栏与表格之间，
     * 表格整体下移，一次性跳到终点会按旧布局命中（少一行）。真实拖动是连续的，
     * 每移动一行都会按新布局重新命中。
     */
    for (const index of [1, 2]) {
      const row = await rows.nth(index).boundingBox()
      if (!row) continue
      await page.mouse.move(x, row.y + row.height / 2, { steps: 3 })
      await page.waitForTimeout(60)
    }
    await page.mouse.up()

    // 3 行被勾选：页脚「已选 N 项」口径 + 行选中态一致（勾选横幅已移除）
    await expect(page.getByTestId('pagination-summary')).toContainText(
      '已选 3 项',
    )
    await expect(page.locator('tbody tr.ant-table-row-selected')).toHaveCount(3)
    // 拖拽过程中不能留下"划词"选区
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? ''),
    ).toBe('')

    // 拖拽之后的一次普通点击仍然生效（抑制窗口只覆盖拖拽收尾的那一下）：
    // 点第一行勾选框把它取消勾选，选中数应从 3 变 2。
    await rows
      .nth(0)
      .locator('input[type="checkbox"]')
      .first()
      .click({ force: true })
    await expect(page.locator('tbody tr.ant-table-row-selected')).toHaveCount(2)
    await expect(page.getByTestId('pagination-summary')).toContainText(
      '已选 2 项',
    )

    await assertNoFatalUiErrors()
  })
})
