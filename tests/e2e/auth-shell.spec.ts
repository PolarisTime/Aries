import { openHeaderMenu, primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

test.describe('API key auth and shell', () => {
  test('redirects anonymous users to login', async ({ page, assertNoFatalUiErrors }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
    await expect(page.getByRole('heading', { name: '账号登录' })).toBeVisible()
    await assertNoFatalUiErrors()
  })

  test('loads dashboard and fallback menus with API key session', async ({ page, assertNoFatalUiErrors }) => {
    await primeApiKeySession(page)
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText('业务流程总览')).toBeVisible()
    await expect(page.getByText('服务器时间')).toBeVisible()
    await expect(page.locator('.leo-top-menu')).toContainText('基础数据')
    await expect(page.locator('.leo-top-menu')).toContainText('采购')
    await expect(page.locator('.leo-top-menu')).toContainText('设置')
    await assertNoFatalUiErrors()
  })

  test('persists personal settings and logs out cleanly in API key mode', async ({ page, assertNoFatalUiErrors }) => {
    await primeApiKeySession(page)
    await page.goto('/materials')

    await page.getByRole('button', { name: '个人设置' }).click()

    const dialog = page.getByRole('dialog', { name: '个人设置' })
    await expect(dialog).toBeVisible()
    await dialog.locator('.ant-select').first().click()
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option[title="16px"]').click()
    await page.getByRole('button', { name: '保存显示设置' }).click()

    await expect(dialog).not.toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          fontSize: document.documentElement.style.getPropertyValue('--app-font-size').trim(),
          settings: localStorage.getItem('aries-personal-settings'),
        })),
      )
      .toEqual({
        fontSize: '16px',
        settings: JSON.stringify({ fontSize: 16, layoutMode: 'top' }),
      })

    await page.getByRole('button', { name: '退出登录' }).click()
    await page.getByRole('button', { name: '确认退出' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: '账号登录' })).toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          token: localStorage.getItem('aries-token'),
          user: localStorage.getItem('aries-user'),
        })),
      )
      .toEqual({
        token: null,
        user: null,
      })
    await assertNoFatalUiErrors()
  })
})
