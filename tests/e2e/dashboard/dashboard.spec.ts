import { test, expect } from '@playwright/test'
import { setupAuthMocks } from '../helpers/mock-api'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await page.waitForURL('**/dashboard')
  })

  test('renders dashboard title', async ({ page }) => {
    await expect(page.locator('text=欢迎使用钢材贸易业务中台')).toBeVisible()
  })

  test('renders statistics cards', async ({ page }) => {
    await page.waitForTimeout(500)
    await expect(page.locator('text=客户数量')).toBeVisible()
    await expect(page.locator('text=供应商数量')).toBeVisible()
    await expect(page.locator('text=商品种类')).toBeVisible()
  })

  test('statistics show correct values', async ({ page }) => {
    await page.waitForTimeout(500)
    await expect(page.locator('text=42')).toBeVisible()
    await expect(page.locator('text=18')).toBeVisible()
    await expect(page.locator('text=156')).toBeVisible()
  })

  test('tabs show dashboard tab as non-closable', async ({ page }) => {
    const tabs = page.locator('.ant-tabs-tab')
    await expect(tabs).toBeVisible()
  })

  test('root path redirects to dashboard', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/dashboard')
  })
})
