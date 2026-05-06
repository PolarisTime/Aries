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
    await expect(page.getByText('欢迎使用钢材贸易业务中台')).toBeVisible()
    await expect(page.locator('.leo-sider')).toContainText('工作台')
    await expect(page.locator('.leo-sider')).toContainText('主数据管理')
    await expect(page.locator('.leo-sider')).toContainText('采购管理')
    await expect(page.locator('.leo-sider')).toContainText('系统设置')
    await assertNoFatalUiErrors()
  })

  test('persists personal settings and logs out cleanly in API key mode', async ({ page, assertNoFatalUiErrors }) => {
    await primeApiKeySession(page)
    await page.goto('/materials')

    await openHeaderMenu(page)
    await page.getByText('个人设置', { exact: true }).click()

    const dialog = page.getByRole('dialog', { name: '个人设置' })
    await expect(dialog).toBeVisible()
    await dialog.locator('.ant-select').first().click()
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option[title="16px"]').click()
    await page.locator('.ant-modal-footer .ant-btn-primary').click()

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
        settings: JSON.stringify({ fontSize: 16 }),
      })

    await openHeaderMenu(page)
    await page.getByText('退出登录', { exact: true }).click()
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()

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
