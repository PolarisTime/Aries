import { expect, test } from '@playwright/test'
import { setupAndEnable2fa, disable2fa } from './support/live-helpers'
import { loginWithBackend, realAdminCredentials } from './support/real-session'
import { generateTotpCode } from './support/totp'

test.describe('auth flows', () => {
  test('redirects unauthenticated users to login for protected routes', async ({ page }) => {
    await page.goto('/materials')

    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)materials/)
    await expect(page.getByRole('heading', { name: '用户登录' })).toBeVisible()
  })

  test('logs in with account and password, then lands on dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill(realAdminCredentials.loginName)
    await page.getByPlaceholder('请输入密码').fill(realAdminCredentials.password)
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('.dashboard-title')).toHaveText(/^(Dashboard|系统首页)$/)
    await expect(page.locator('.dashboard-stat-card strong').first()).toHaveText('系统管理员')
  })

  test('supports two-factor login flow against the real backend', async ({ page, request }) => {
    test.setTimeout(120_000)
    const session = await loginWithBackend(request)
    const userId = String(session.user.id)

    const secret = await setupAndEnable2fa(request, session.accessToken, userId)

    try {
      await page.goto('/login')
      await page.getByPlaceholder('请输入账号').fill(realAdminCredentials.loginName)
      await page.getByPlaceholder('请输入密码').fill(realAdminCredentials.password)
      await page.getByRole('button', { name: /登\s*录/ }).click()

      await expect(page.getByText('二次验证')).toBeVisible({ timeout: 15_000 })
      await page.getByPlaceholder('请输入 6 位验证码').fill(generateTotpCode(secret))
      await page.getByRole('button', { name: '验证并登录' }).click()

      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
      await expect(page.locator('.dashboard-title')).toHaveText(/^(Dashboard|系统首页)$/, { timeout: 15_000 })
    } finally {
      await disable2fa(request, session.accessToken, userId)
    }
  })
})
