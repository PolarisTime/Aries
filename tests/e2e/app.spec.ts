import { expect, test } from '@playwright/test'

test('login page loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  await expect(page.getByRole('button', { name: '登录 Aries' })).toBeVisible()
})
