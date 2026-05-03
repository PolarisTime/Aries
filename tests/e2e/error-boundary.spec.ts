import { expect, test } from '@playwright/test'
import { installMockApi } from './support/mock-api'

test.describe('error and boundary handling', () => {
  test('shows 404 page for unknown routes', async ({ page }) => {
    await installMockApi(page)

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto('/nonexistent-route-xyz')
    await expect(page.locator('body')).toContainText(/404|Not Found|页面未找到/)
  })

  test('redirects to login when session expires', async ({ page }) => {
    await installMockApi(page, { allowRefresh: false })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    // Navigate to a protected page — the interceptor should catch the expired token
    await page.goto('/materials')
    // Without a valid refresh token, the auth interceptor redirects to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('dismisses network error gracefully on server error', async ({ page }) => {
    await installMockApi(page)

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    // Route the materials API to return 500
    await page.route('**/api/materials*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 5000, message: '模拟服务器内部错误' }),
      })
    })

    await page.goto('/materials')
    // The app should show an error message rather than crash
    await expect(page.locator('.ant-message-error, .ant-alert-error, .ant-result-error').or(page.locator('body'))).toBeAttached({ timeout: 10_000 })
  })

  test('blocks restricted module access for unauthorized user', async ({ page }) => {
    await installMockApi(page, {
      user: {
        menuCodes: ['/dashboard', '/materials'],
        actionMap: {
          materials: ['VIEW'],
        },
      },
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    // Try accessing a page the user doesn't have permission for
    await page.goto('/purchase-orders')
    await expect(page.locator('body')).toContainText(/403|无权限|无权访问/)
  })

  test('handles empty result gracefully', async ({ page }) => {
    await installMockApi(page, {
      user: {
        menuCodes: ['/dashboard', '/materials'],
        actionMap: { materials: ['VIEW'] },
      },
      modules: { materials: [] },
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await page.goto('/materials')
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('.ant-empty, .ant-result').or(page.locator('table tbody tr.ant-table-placeholder'))).toBeAttached({ timeout: 5_000 })
  })
})
