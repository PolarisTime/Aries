import { expect } from '@playwright/test'
import { loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

const LOGIN_NAME = process.env.E2E_LOGIN_NAME || 'admin_prod'
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || '123456'

test.describe('认证与外壳', () => {
  test('匿名访问受保护路由时跳转登录页', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 })
    await expect(page.locator('#loginName')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await assertNoFatalUiErrors()
  })

  test('UI 登录后进入工作台并渲染应用外壳', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#loginName').fill(LOGIN_NAME)
    await page.locator('#password').fill(LOGIN_PASSWORD)
    await page.getByRole('button', { name: /登录|Sign In/i }).click()

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 })
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })
    // 顶部全局搜索与应用外壳存在
    await expect(page.locator('#header-search-keyword').first()).toBeVisible()
    // 登录态写入 localStorage
    const token = await page.evaluate(() => localStorage.getItem('aries-token'))
    expect(token).toBeTruthy()
    await assertNoFatalUiErrors()
  })

  test('已登录会话可直达受保护业务路由', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await loginAsE2eUser(page)
    await page.goto('/material', { waitUntil: 'domcontentloaded' })
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
    await expect(
      page.getByRole('heading', { name: '商品资料' }).first(),
    ).toBeVisible({ timeout: 30_000 })
    await assertNoFatalUiErrors()
  })
})
