import type { Page } from '@playwright/test'
import { clearCachedAuthSession, primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

const loginHeadingName = /登录系统|Sign In/i
const serverTimeText = /服务(?:器)?时间|Server Time/i
const personalSettingsName = /个人设置|Personal Settings/i
const saveDisplaySettingsName = /保存显示设置|Save Display Settings/i
const signOutName = /退出登录|Sign Out/i
const confirmLogoutName = /确认退出|Confirm Logout/i

async function openUserMenu(page: Page) {
  await page.locator('.app-top-user-trigger').click()
}

test.describe('auth and shell', () => {
  test('redirects anonymous users to login', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
    await expect(
      page.getByRole('heading', { name: loginHeadingName }),
    ).toBeVisible()
    await assertNoFatalUiErrors()
  })

  test('loads dashboard and top-level menus with authenticated session', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await primeApiKeySession(page)

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    await expect(page.locator('.dashboard-flow-card')).toContainText(
      /业务流程|Business Flow/,
    )
    await expect(page.locator('.dashboard-flow-card')).toContainText(
      /商品资料|Material/,
    )
    await expect(page.getByText(serverTimeText)).toBeVisible()
    await expect(page.locator('.leo-top-menu')).toContainText('基础数据')
    await expect(page.locator('.leo-top-menu')).toContainText('采购')
    await expect(page.locator('.leo-top-menu')).toContainText('设置')
    await assertNoFatalUiErrors()
  })

  test('persists personal settings and logs out cleanly', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await primeApiKeySession(page)
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)

    await openUserMenu(page)
    await page.getByRole('menuitem', { name: personalSettingsName }).click()

    const dialog = page.getByRole('dialog', { name: personalSettingsName })
    await expect(dialog).toBeVisible()
    await dialog.locator('.ant-select').first().click()
    await page
      .locator(
        '.ant-select-dropdown:visible .ant-select-item-option[title="16px"]',
      )
      .click()
    await page.getByRole('button', { name: saveDisplaySettingsName }).click()

    await expect(dialog).not.toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const rawSettings = localStorage.getItem('aries-personal-settings')
          let persistedSettings: unknown
          try {
            persistedSettings = rawSettings ? JSON.parse(rawSettings) : null
          } catch {
            persistedSettings = null
          }

          if (
            persistedSettings &&
            typeof persistedSettings === 'object' &&
            'state' in persistedSettings &&
            persistedSettings.state &&
            typeof persistedSettings.state === 'object' &&
            'settings' in persistedSettings.state
          ) {
            persistedSettings = persistedSettings.state.settings
          }

          return {
            fontSize: document.documentElement.style
              .getPropertyValue('--app-font-size')
              .trim(),
            settings: persistedSettings,
          }
        }),
      )
      .toEqual({
        fontSize: '16px',
        settings: {
          fontSize: 16,
          layoutMode: 'top',
          themeMode: 'system',
        },
      })

    await openUserMenu(page)
    await page.getByRole('menuitem', { name: signOutName }).click()
    await page.getByRole('button', { name: confirmLogoutName }).click()
    clearCachedAuthSession()

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole('heading', { name: loginHeadingName }),
    ).toBeVisible()
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
