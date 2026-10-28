import { expect, test } from '@playwright/test'
import { loginAsE2eUser } from './support/business-e2e'

/**
 * 行右键菜单里的批量动作（个人设置 → 右键菜单）。
 *
 * <p>勾选多行后右键其中一行，菜单末尾应追加「批量操作（已选 N 项）」分组 ——
 * 与顶部「已选择 N 项」横幅是同一批动作定义、同一个处理函数。这里锁链路的可见结果，
 * 因为 jsdom 验证不了"菜单真的多出这几项"。</p>
 *
 * <p>同时验证个人设置的开关：关掉「批量操作」后该分组不再出现，且行操作仍在。</p>
 */
test.describe('行右键菜单 · 批量动作', () => {
  test.use({ viewport: { width: 1473, height: 800 } })

  const checkbox = (page: import('@playwright/test').Page, index: number) =>
    page.locator('tbody tr[data-row-key] input.ant-checkbox-input').nth(index)

  const openRowMenu = async (page: import('@playwright/test').Page) => {
    await page
      .locator('tbody tr[data-row-key]')
      .first()
      .locator('td')
      .nth(2)
      .click({ button: 'right' })
    // 用 ant-dropdown-hidden 而不是 :visible 排除已关闭的弹层：
    // antd 关闭后会把弹层留在 DOM 里，:visible 在过渡瞬间仍可能命中上一份菜单，
    // 导致读到"上一轮的 items"。
    const menu = page
      .locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu')
      .last()
    await menu.waitFor({ state: 'visible', timeout: 10_000 })
    return menu
  }

  const closeMenu = async (page: import('@playwright/test').Page) => {
    await page.keyboard.press('Escape')
    await expect(
      page.locator(
        '.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu',
      ),
    ).toHaveCount(0, { timeout: 5_000 })
  }

  const openPersonalSettings = async (
    page: import('@playwright/test').Page,
  ) => {
    await page
      .locator('.app-top-user-trigger, .app-user-settings-trigger')
      .first()
      .click()
    await page.getByRole('menuitem', { name: /个人设置/ }).click()
    await page.getByRole('tab', { name: '右键菜单' }).click()
    await page.locator('.ant-switch[aria-label="批量操作"]').waitFor({
      state: 'visible',
      timeout: 10_000,
    })
  }

  test('未勾选→只有行操作；勾选多行→追加批量分组；关掉开关→不再追加', async ({
    page,
  }) => {
    await loginAsE2eUser(page)
    await page.goto('/sales-order', { waitUntil: 'domcontentloaded' })
    await page
      .locator('.module-table-shell table')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 })

    // ① 未勾选：菜单里没有批量分组
    let menu = await openRowMenu(page)
    await expect(menu).toContainText('复制单号')
    await expect(menu).not.toContainText('批量操作')
    await closeMenu(page)

    // ② 勾选两行后右键其中一行：出现「批量操作（已选 2 项）」与批量动作
    await checkbox(page, 0).check()
    await checkbox(page, 1).check()
    await expect(page.locator('.module-selection-alert')).toContainText(
      '已选择 2 项',
    )
    menu = await openRowMenu(page)
    await expect(menu).toContainText('批量操作（已选 2 项）')
    // 销售订单的批量动作之一：导出选中 N 条（文案随勾选数量变化）
    await expect(menu).toContainText('导出选中 2 条')
    await closeMenu(page)

    // ③ 个人设置里关掉「批量操作」→ 分组消失，行操作保留
    await openPersonalSettings(page)
    await page.locator('.ant-switch[aria-label="批量操作"]').click()
    await page.getByRole('button', { name: '保存显示设置' }).click()
    await expect(page.getByRole('button', { name: '保存显示设置' })).toBeHidden(
      { timeout: 10_000 },
    )

    menu = await openRowMenu(page)
    await expect(menu).not.toContainText('批量操作')
    await expect(menu).toContainText('复制单号')
    await closeMenu(page)

    // 恢复默认，避免污染后续用例
    await openPersonalSettings(page)
    await page.locator('.ant-switch[aria-label="批量操作"]').click()
    await page.getByRole('button', { name: '保存显示设置' }).click()
    await expect(page.getByRole('button', { name: '保存显示设置' })).toBeHidden(
      { timeout: 10_000 },
    )
  })
})
