import { primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

const APP_BASE_URL = 'http://127.0.0.1:3100'

async function gotoAuthenticated(
  page: import('@playwright/test').Page,
  path: string,
) {
  await page.goto(`${APP_BASE_URL}${path}`, { waitUntil: 'networkidle' })
  if (!/\/login(?:\?|$)/.test(page.url())) {
    return
  }

  await primeApiKeySession(page)
  await page.goto(`${APP_BASE_URL}${path}`, { waitUntil: 'networkidle' })
}

test.describe('system admin pages', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('database status page loads', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoAuthenticated(page, '/database')
    await expect(page).toHaveURL(/\/database/)
    await assertNoFatalUiErrors()
  })

  test('security key page loads', async ({ page, assertNoFatalUiErrors }) => {
    await gotoAuthenticated(page, '/security-key')
    await expect(page).toHaveURL(/\/security-key/)
    await assertNoFatalUiErrors()
  })

  test('access control page loads', async ({ page, assertNoFatalUiErrors }) => {
    await gotoAuthenticated(page, '/access-control')
    await expect(page).toHaveURL(/\/access-control/)
    await assertNoFatalUiErrors()
  })

  test('access control roles and permissions tabs load', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoAuthenticated(page, '/access-control?tab=roles')
    await expect(page).toHaveURL(/\/access-control\?tab=roles/)
    await expect(page.getByRole('tab', { name: '角色权限' })).toBeVisible()
    await expect(page.locator('main')).toContainText(/角色列表|暂无角色/)
    await expect(page.locator('main')).toContainText(/权限配置|请选择角色/)

    const firstRole = page
      .locator('.ant-card')
      .filter({ hasText: '角色列表' })
      .getByRole('button')
      .filter({ hasText: /用户/ })
      .first()
    if ((await firstRole.count()) > 0) {
      await firstRole.click()
      await expect(page.locator('main')).toContainText('附件权限说明')
      await page.getByRole('radiogroup').getByText('矩阵').click()
      await expect(page.locator('main')).toContainText(/查看|新增|编辑/)
    }

    await gotoAuthenticated(page, '/access-control?tab=permissions')
    await expect(page).toHaveURL(/\/access-control\?tab=permissions/)
    await expect(page.getByRole('tab', { name: '权限目录' })).toBeVisible()
    await expect(page.locator('table').first()).toBeVisible()
    await expect(page.locator('main')).toContainText(/权限编码|权限名称/)

    await assertNoFatalUiErrors()
  })
})
