import { expect, test } from '@playwright/test'

const LOGIN_NAME = process.env.E2E_LOGIN_NAME || 'admin_prod'
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || '123456'

test.describe('harness smoke', () => {
  test('redirects anonymous to login and signs in', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 })

    await page.locator('#loginName').fill(LOGIN_NAME)
    await page.locator('#password').fill(LOGIN_PASSWORD)
    await page.getByRole('button', { name: /登录|Sign In/i }).click()

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 })
  })
})
