import type { Page } from '@playwright/test'
import { expect, test } from './support/test'

const API_BASE_URL = 'http://127.0.0.1:11211/api'
const APP_BASE_URL = 'http://127.0.0.1:3100'

async function loginAsTest9(page: Page) {
  const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      loginName: 'test9',
      password: '123456',
    },
  })
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as {
    code: number
    data?: {
      accessToken?: string
      expiresIn?: string | number
      user?: Record<string, unknown>
    }
  }
  expect(payload.code).toBe(0)

  const accessToken = String(payload.data?.accessToken || '')
  const user = payload.data?.user || null
  const expiresIn = Number(payload.data?.expiresIn || 1800)

  await page.addInitScript(
    ({
      token,
      currentUser,
      ttl,
    }: {
      token: string
      currentUser: unknown
      ttl: number
    }) => {
      const expiresAt = String(Date.now() + ttl * 1000)
      localStorage.setItem('aries-token', token)
      localStorage.setItem('aries-token-expires-at', expiresAt)
      localStorage.setItem('aries-user', JSON.stringify(currentUser))
      localStorage.setItem('aries-auth-persistence', 'local')
    },
    {
      token: accessToken,
      currentUser: user,
      ttl: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 1800,
    },
  )

  await page.goto(`${APP_BASE_URL}/purchase-order`, {
    waitUntil: 'networkidle',
  })
}

test('purchase order editor loads detail items from detail api', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await loginAsTest9(page)

  await page.getByPlaceholder('输入采购订单号').fill('PO-API-1778336854')
  await page.getByRole('button', { name: /查询/ }).click()

  const row = page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: 'PO-API-1778336854' })
    .first()
  await expect(row).toBeVisible()
  await row.dblclick()

  const overlay = page.locator('.workspace-overlay-panel').last()
  await expect(overlay).toBeVisible()

  await expect(
    overlay.locator(
      '.module-detail-table tbody tr:not(.ant-table-measure-row)',
    ),
  ).toHaveCount(1)
  await expect(
    overlay.locator('input[value="HZ-YG-PL8"]').first(),
  ).toBeVisible()
  await expect(overlay.locator('.module-detail-table')).toContainText('永钢')
})
