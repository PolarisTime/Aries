import { test, expect } from '@playwright/test'

const mockLoginSuccess = {
  code: 0,
  message: 'ok',
  data: {
    accessToken: 'test-access-token',
    tokenType: 'Bearer',
    expiresIn: 1800,
    refreshExpiresIn: 604800,
    user: {
      id: 1,
      loginName: 'admin',
      userName: '管理员',
      status: 'active',
      roleName: 'admin',
      totpEnabled: false,
      permissions: [{ resource: 'dashboard', actions: ['read'] }],
    },
  },
}

const mockMenus = {
  code: 0,
  data: [
    { id: 1, code: 'dashboard', title: '工作台', icon: 'HomeOutlined', path: '/dashboard', children: [] },
  ],
}

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ json: mockLoginSuccess })
    })
    await page.route('**/api/auth/captcha', async (route) => {
      await route.fulfill({ json: { code: 0, data: { captchaId: 'test', captchaImage: '', required: false } } })
    })
    await page.route('**/api/auth/ping', async (route) => {
      await route.fulfill({ json: { code: 0, data: 'pong' } })
    })
    await page.route('**/api/system/menus/tree', async (route) => {
      await route.fulfill({ json: mockMenus })
    })
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ json: { status: 'UP' } })
    })
    await page.route('**/api/company-settings/current', async (route) => {
      await route.fulfill({ json: { code: 0, data: { companyName: 'Test Company' } } })
    })
  })

  test('renders login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=账号登录')).toBeVisible()
    await expect(page.locator('input[placeholder="用户名"]')).toBeVisible()
    await expect(page.locator('input[placeholder="密码"]')).toBeVisible()
    await expect(page.locator('button:has-text("登 录")')).toBeVisible()
  })

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button:has-text("登 录")').click()
    await expect(page.locator('text=请输入用户名')).toBeVisible()
    await expect(page.locator('text=请输入密码')).toBeVisible()
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({ json: { code: 0, data: {} } })
    })
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await page.waitForURL('**/dashboard')
    await expect(page.locator('text=工作台')).toBeVisible()
  })

  test('shows error on login failure', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ json: { code: 4000, message: '用户名或密码错误' } })
    })
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('wrong')
    await page.locator('input[placeholder="密码"]').fill('wrong')
    await page.locator('button:has-text("登 录")').click()
    await expect(page.locator('.ant-message-error')).toBeVisible()
  })

  test('logout redirects to login', async ({ page }) => {
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({ json: { code: 0 } })
    })
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await page.waitForURL('**/dashboard')
    await page.locator('.anticon-setting').click()
    await page.locator('text=退出登录').click()
    await page.locator('.ant-modal-confirm-btns button:has-text("确定")').click()
    await page.waitForURL('**/login')
    await expect(page.locator('text=账号登录')).toBeVisible()
  })

  test('redirects to login when accessing protected page unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login')
    await expect(page.locator('text=账号登录')).toBeVisible()
  })
})

test.describe('2FA Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/captcha', async (route) => {
      await route.fulfill({ json: { code: 0, data: { captchaId: 'test', captchaImage: '', required: false } } })
    })
  })

  test('shows TOTP input when 2FA required', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        json: { code: 0, data: { requires2fa: true, tempToken: 'temp-token-123' } },
      })
    })
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await expect(page.locator('text=二次验证')).toBeVisible()
    await expect(page.locator('input[placeholder="6位TOTP验证码"]')).toBeVisible()
  })

  test('completes 2FA and redirects', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        json: { code: 0, data: { requires2fa: true, tempToken: 'temp-token-123' } },
      })
    })
    await page.route('**/api/auth/login-2fa', async (route) => {
      await route.fulfill({ json: mockLoginSuccess })
    })
    await page.route('**/api/system/menus/tree', async (route) => {
      await route.fulfill({ json: mockMenus })
    })
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ json: { status: 'UP' } })
    })
    await page.route('**/api/company-settings/current', async (route) => {
      await route.fulfill({ json: { code: 0, data: {} } })
    })
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({ json: { code: 0, data: {} } })
    })
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await page.locator('input[placeholder="6位TOTP验证码"]').fill('123456')
    await page.locator('button:has-text("验证并登录")').click()
    await page.waitForURL('**/dashboard')
  })
})
