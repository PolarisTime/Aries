import { test, expect } from '@playwright/test'
import { setupAuthMocks } from '../helpers/mock-api'

test.describe('System Views', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
    await page.route('**/api/user-accounts*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { rows: [] } } })
    })
    await page.route('**/api/role-settings*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { rows: [] } } })
    })
    await page.route('**/api/company-settings*', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ json: { code: 0 } })
      } else {
        await route.fulfill({ json: { code: 0, data: { companyName: 'Test', taxNo: '123', bankName: 'Bank', bankAccount: '456' } } })
      }
    })
    await page.route('**/api/general-settings/display-switches*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { weightOnlyView: false, showSnowflakeId: false } } })
    })
    await page.route('**/api/general-settings/number-rules*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { rows: [] } } })
    })
    await page.route('**/api/print-templates*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { rows: [] } } })
    })
    await page.route('**/api/system/database/export-tasks*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { rows: [] } } })
    })
    await page.route('**/api/system/database/status*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { status: 'UP' } } })
    })
    await page.route('**/api/auth/refresh-tokens*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { rows: [] } } })
    })
    await page.route('**/api/auth/api-keys*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { rows: [] } } })
    })
    await page.route('**/api/system/security-keys/overview*', async (route) => {
      await route.fulfill({ json: { code: 0, data: { jwtLastRotatedAt: '2024-01-01', totpLastRotatedAt: '2024-01-01' } } })
    })
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await page.waitForURL('**/dashboard')
  })

  const systemPages = [
    { path: '/user-accounts', title: '用户账户管理' },
    { path: '/role-action-editor', title: '角色权限配置' },
    { path: '/company-settings', title: '公司信息' },
    { path: '/general-settings', title: '通用设置' },
    { path: '/number-rules', title: '单号规则' },
    { path: '/print-templates', title: '打印模板' },
    { path: '/database-management', title: '数据库管理' },
    { path: '/session-management', title: '会话管理' },
    { path: '/api-key-management', title: 'API Key 管理' },
    { path: '/security-keys', title: '安全密钥管理' },
  ]

  for (const { path, title } of systemPages) {
    test(`navigates to ${title}`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(`**${path}`)
      await page.waitForTimeout(500)
      await expect(page.locator(`text=${title}`)).toBeVisible()
    })
  }

  test('company settings form works', async ({ page }) => {
    await page.goto('/company-settings')
    await page.waitForTimeout(500)
    await expect(page.locator('input')).toBeVisible()
  })

  test('general settings toggles exist', async ({ page }) => {
    await page.goto('/general-settings')
    await page.waitForTimeout(500)
    await expect(page.locator('button.ant-switch')).toBeVisible()
  })

  test('database export button works', async ({ page }) => {
    await page.goto('/database-management')
    await page.waitForTimeout(500)
    await expect(page.locator('button:has-text("导出")')).toBeVisible()
    await page.locator('button:has-text("导出")').click()
  })

  test('security key management renders', async ({ page }) => {
    await page.goto('/security-keys')
    await page.waitForTimeout(500)
    await expect(page.locator('text=JWT 密钥最后轮换')).toBeVisible()
    await expect(page.locator('text=TOTP 密钥最后轮换')).toBeVisible()
  })

  test('session management renders table', async ({ page }) => {
    await page.goto('/session-management')
    await page.waitForTimeout(500)
    await expect(page.locator('.ant-table')).toBeVisible()
  })

  test('api key management renders', async ({ page }) => {
    await page.goto('/api-key-management')
    await page.waitForTimeout(500)
    await expect(page.locator('button:has-text("创建 Key")')).toBeVisible()
  })

  test('user accounts management renders', async ({ page }) => {
    await page.goto('/user-accounts')
    await page.waitForTimeout(500)
    await expect(page.locator('button:has-text("新建用户")')).toBeVisible()
    await page.locator('button:has-text("新建用户")').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=登录名')).toBeVisible()
    await page.locator('.ant-modal-close').click()
  })

  test('print template management renders', async ({ page }) => {
    await page.goto('/print-templates')
    await page.waitForTimeout(500)
    await expect(page.locator('button:has-text("新建模板")')).toBeVisible()
  })
})
