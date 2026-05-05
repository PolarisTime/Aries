import { test, expect } from '@playwright/test'
import { setupAuthMocks } from '../helpers/mock-api'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await page.waitForURL('**/dashboard')
  })

  test('sidebar renders with brand', async ({ page }) => {
    await expect(page.locator('text=Leo ERP')).toBeVisible()
  })

  test('sidebar collapse toggle works', async ({ page }) => {
    const sider = page.locator('.leo-sider')
    await expect(sider).toBeVisible()
    await page.locator('.app-trigger').click()
    await page.waitForTimeout(300)
    await page.locator('.app-trigger').click()
    await page.waitForTimeout(300)
  })

  test('user name visible in header', async ({ page }) => {
    await expect(page.locator('text=管理员')).toBeVisible()
  })

  test('clock is ticking in header', async ({ page }) => {
    const clock = page.locator('.tabular-nums')
    await expect(clock).toBeVisible()
    const text1 = await clock.textContent()
    await page.waitForTimeout(2000)
    const text2 = await clock.textContent()
    expect(text1).not.toBe(text2)
  })

  test('personal settings modal opens', async ({ page }) => {
    await page.locator('.anticon-setting').last().click()
    await page.locator('text=个人设置').click()
    await expect(page.locator('text=显示设置')).toBeVisible()
    await expect(page.locator('text=账户安全')).toBeVisible()
  })

  test('font size change in personal settings', async ({ page }) => {
    await page.locator('.anticon-setting').last().click()
    await page.locator('text=个人设置').click()
    await page.locator('.ant-select').click()
    await page.locator('.ant-select-item-option[title="14px"]').click()
    await page.locator('.ant-modal-close').click()
  })

  test('logout from header dropdown', async ({ page }) => {
    await page.locator('.anticon-setting').last().click()
    await page.locator('text=退出登录').click()
    await page.locator('.ant-modal-confirm-btns button:has-text("确定")').click()
    await page.waitForURL('**/login')
  })
})
