import { expect, test } from '@playwright/test'
import { loginAsE2eUser } from './support/business-e2e'

/**
 * 面包屑显示开关（个人设置 → 外观）。
 *
 * <p>面包屑是导航辅助，不是业务数据：小屏或已用多标签页导航时，用户可以把它关掉换纵向空间。
 * 这条 e2e 锁的是「开关 → 布局真的隐藏 → 刷新后仍然隐藏 → 再打开能恢复」这条完整链路，
 * 因为 jsdom 无法验证布局里那处条件渲染是否真的生效。</p>
 */
test.describe('个人设置 · 导航面包屑开关', () => {
  test.use({ viewport: { width: 1473, height: 800 } })

  const breadcrumbCount = (page: import('@playwright/test').Page) =>
    page.locator('.leo-breadcrumb').count()

  const openPersonalSettings = async (
    page: import('@playwright/test').Page,
  ) => {
    await page
      .locator('.app-top-user-trigger, .app-user-settings-trigger')
      .first()
      .click()
    await page.getByRole('menuitem', { name: /个人设置/ }).click()
    // 弹窗里的「导航面包屑」开关是 lazy 加载的，等它出现再操作
    await page.locator('.ant-switch[aria-label="导航面包屑"]').waitFor({
      state: 'visible',
      timeout: 15_000,
    })
  }

  const saveDisplay = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: '保存显示设置' }).click()
    // 弹窗关闭即保存完成
    await expect(page.getByRole('button', { name: '保存显示设置' })).toBeHidden(
      { timeout: 10_000 },
    )
  }

  test('关闭后隐藏、刷新仍隐藏，重新打开可恢复', async ({ page }) => {
    await loginAsE2eUser(page)
    await page.goto('/sales-order', { waitUntil: 'domcontentloaded' })
    await page
      .locator('.module-table-shell table')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 })
    await expect.poll(() => breadcrumbCount(page), { timeout: 15_000 }).toBe(1)

    // 关闭
    await openPersonalSettings(page)
    const toggle = page.locator('.ant-switch[aria-label="导航面包屑"]')
    await expect(toggle).toBeChecked()
    await toggle.click()
    await saveDisplay(page)
    await expect.poll(() => breadcrumbCount(page), { timeout: 15_000 }).toBe(0)

    // 刷新后依然是关闭状态（持久化生效）
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page
      .locator('.module-table-shell table')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 })
    await expect.poll(() => breadcrumbCount(page), { timeout: 15_000 }).toBe(0)

    // 重新打开恢复默认显示，避免污染后续用例
    await openPersonalSettings(page)
    await page.locator('.ant-switch[aria-label="导航面包屑"]').click()
    await saveDisplay(page)
    await expect.poll(() => breadcrumbCount(page), { timeout: 15_000 }).toBe(1)
  })
})
