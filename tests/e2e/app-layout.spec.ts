import { expect, test, type Page } from '@playwright/test'
import { primeRealSessionWithUserOverrides } from './support/live-helpers'
import { listModuleRecords } from './support/live-helpers'
import { primeRealAuthSession } from './support/real-session'

function getSearchInput(page: Page) {
  return page.getByPlaceholder('搜索单号、合同号、对账单号')
}

async function chooseModalSelect(page: Page, optionText: string) {
  const modal = page.locator('.ant-modal:visible').last()
  const select = modal.locator('.ant-select').first()
  await select.click()
  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible()
  await dropdown.locator('.ant-select-item-option', { hasText: optionText }).first().click()
}

test.describe('app layout flows', () => {
  test('renders dashboard summary and opens purchase order detail from global search', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const purchaseOrders = await listModuleRecords(page.request, session.accessToken, 'purchase-orders')
    const purchaseOrder = purchaseOrders[0]
    const orderNo = String(purchaseOrder?.orderNo || '').trim()

    test.skip(!orderNo, '真实数据中没有采购订单')

    await page.goto('/dashboard')

    await expect(page.locator('.dashboard-title')).toHaveText(/^(Dashboard|系统首页)$/)
    await expect(page.locator('.action.user-name')).toHaveText(session.user.userName || session.user.loginName)

    await getSearchInput(page).fill(orderNo)
    const dropdown = page.locator('.ant-select-dropdown:visible').last()
    await expect(dropdown).toBeVisible()
    await dropdown.locator('.ant-select-item-option', { hasText: orderNo }).first().click()

    await expect(page).toHaveURL(new RegExp(`/purchase-orders\\?docNo=${orderNo}&openDetail=1$`))
    await expect(page.locator('.workspace-overlay-title', { hasText: '采购订单详情' })).toBeVisible()
    await expect(page.locator('.bill-detail-body')).toContainText(orderNo)
    if (purchaseOrder?.supplierName) {
      await expect(page.locator('.bill-detail-body')).toContainText(String(purchaseOrder.supplierName))
    }
  })

  test('persists personal settings and logs out', async ({ page }) => {
    await primeRealAuthSession(page)

    await page.goto('/materials')

    await page.getByText('个人设置', { exact: true }).click()
    const personalSettingsDialog = page.getByRole('dialog', { name: '个人设置' })
    await expect(personalSettingsDialog).toBeVisible()

    await chooseModalSelect(page, '16px')
    await personalSettingsDialog.getByRole('button', { name: /保\s*存/ }).click()

    await expect(personalSettingsDialog).not.toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          fontSize: document.documentElement.style.getPropertyValue('--app-font-size').trim(),
          settings: window.localStorage.getItem('aries-personal-settings'),
        })),
      )
      .toEqual({
        fontSize: '16px',
        settings: JSON.stringify({ fontSize: 16 }),
      })

    await page.getByText('退出登录', { exact: true }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: '用户登录' })).toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          token: window.localStorage.getItem('aries-token'),
          user: window.localStorage.getItem('aries-user'),
          authPersistence: window.localStorage.getItem('aries-auth-persistence'),
        })),
      )
      .toEqual({
        token: null,
        user: null,
        authPersistence: null,
      })
  })

  test('hides inaccessible menus and redirects unauthorized routes', async ({ page }) => {
    await primeRealSessionWithUserOverrides(page, {
      menuCodes: ['/dashboard', '/materials'],
      actionMap: {
        dashboard: ['VIEW'],
        materials: ['VIEW'],
      },
    })

    await page.goto('/dashboard')

    const appMenu = page.getByRole('menu')
    await expect(appMenu.getByText('工作台', { exact: true })).toBeVisible()
    await appMenu.getByText('主数据管理', { exact: true }).click()
    await expect(appMenu.getByText('商品资料', { exact: true })).toBeVisible()
    await expect(appMenu.getByText('采购管理', { exact: true })).not.toBeVisible()

    await page.goto('/purchase-orders')

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('.dashboard-title')).toHaveText(/^(Dashboard|系统首页)$/)
  })
})
