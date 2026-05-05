import { test, expect } from '@playwright/test'

test.describe('Initial Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        json: {
          code: 0,
          data: {
            setupRequired: true,
            adminConfigured: false,
            companyConfigured: false,
          },
        },
      })
    })
    await page.route('**/api/auth/captcha', async (route) => {
      await route.fulfill({ json: { code: 0, data: { captchaId: 'x', captchaImage: '', required: false } } })
    })
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ json: { status: 'UP' } })
    })
  })

  test('renders setup wizard', async ({ page }) => {
    await page.goto('/setup')
    await page.waitForTimeout(500)
    await expect(page.locator('text=系统初始化向导')).toBeVisible()
    await expect(page.locator('text=管理员配置')).toBeVisible()
    await expect(page.locator('text=公司主体配置')).toBeVisible()
  })

  test('admin step renders form fields', async ({ page }) => {
    await page.goto('/setup')
    await expect(page.locator('input[placeholder="管理员登录名"]')).toBeVisible()
    await expect(page.locator('input[placeholder="至少6位"]')).toBeVisible()
    await expect(page.locator('button:has-text("生成 TOTP 密钥")')).toBeVisible()
  })

  test('can generate TOTP', async ({ page }) => {
    await page.route('**/api/setup/admin/2fa/setup', async (route) => {
      await route.fulfill({
        json: { code: 0, data: { qrCodeBase64: 'data:image/png;base64,test', secret: 'TESTSECRET' } },
      })
    })
    await page.goto('/setup')
    await page.locator('input[placeholder="管理员登录名"]').fill('admin')
    await page.locator('button:has-text("生成 TOTP 密钥")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=TESTSECRET')).toBeVisible()
  })

  test('can submit admin and proceed to company step', async ({ page }) => {
    await page.route('**/api/setup/admin/2fa/setup', async (route) => {
      await route.fulfill({
        json: { code: 0, data: { qrCodeBase64: '', secret: 'TESTSECRET' } },
      })
    })
    await page.route('**/api/setup/admin', async (route) => {
      await route.fulfill({ json: { code: 0, message: '管理员创建成功', data: { adminLoginName: 'admin' } } })
    })
    await page.route('**/api/company-settings/current', async (route) => {
      await route.fulfill({ json: { code: 0, data: {} } })
    })
    await page.goto('/setup')
    await page.locator('input[placeholder="管理员登录名"]').fill('admin')
    await page.locator('input[placeholder="至少6位"]').fill('password123')
    const confirmInputs = page.locator('input[placeholder="再次输入密码"]')
    await confirmInputs.fill('password123')
    await page.locator('button:has-text("生成 TOTP 密钥")').click()
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="6位TOTP验证码"]').fill('123456')
    await page.locator('button:has-text("创建管理员并继续")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=公司名称')).toBeVisible()
  })

  test('company step renders form fields', async ({ page }) => {
    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        json: {
          code: 0,
          data: { setupRequired: true, adminConfigured: true, companyConfigured: false },
        },
      })
    })
    await page.goto('/setup')
    await page.waitForTimeout(500)
    // Should go to company step since admin is configured
    await expect(page.locator('text=公司名称')).toBeVisible()
  })

  test('redirects to login when setup not required', async ({ page }) => {
    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        json: { code: 0, data: { setupRequired: false, adminConfigured: true, companyConfigured: true } },
      })
    })
    await page.goto('/setup')
    await page.waitForTimeout(1000)
    await expect(page.locator('text=系统已完成初始化')).toBeVisible()
  })
})
