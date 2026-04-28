import { expect, test } from '@playwright/test'
import { installMockApi } from './support/mock-api'

test.describe('CRUD lifecycle', () => {
  test('materials: create → verify table → edit → delete', async ({ page }) => {
    await installMockApi(page, {
      user: {
        menuCodes: ['/dashboard', '/materials', '/warehouses', '/purchase-orders'],
        actionMap: {
          materials: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
          warehouses: ['VIEW'],
          'purchase-orders': ['VIEW'],
        },
      },
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('any')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    // ── Create ──
    await page.goto('/materials')
    await page.getByRole('button', { name: '新增' }).click()
    await expect(page.locator('.workspace-overlay-title')).toContainText('新增商品资料')

    await page.locator('#editor-field-materials-materialCode').fill('E2E-NEW')
    await page.locator('#editor-field-materials-brand').fill('E2E品牌')
    await page.locator('#editor-field-materials-material').fill('E2E材质')
    await page.locator('#editor-field-materials-spec').fill('20')
    await page.locator('#editor-field-materials-unit').fill('吨')
    await page.locator('#editor-field-materials-unitPrice').fill('5000')

    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.locator('.workspace-overlay-title')).not.toBeVisible()

    // ── Verify table ──
    await expect(page.locator('table')).toContainText('E2E-NEW')

    // ── Edit ──
    const row = page.locator('tr', { hasText: 'E2E-NEW' }).first()
    await row.getByText('编辑').click()
    await expect(page.locator('.workspace-overlay-title')).toContainText('编辑商品资料')
    await expect(page.locator('#editor-field-materials-materialCode')).toHaveValue('E2E-NEW')

    await page.locator('#editor-field-materials-brand').fill('E2E品牌-已修改')
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.locator('table')).toContainText('E2E品牌-已修改')

    // ── Delete ──
    const updatedRow = page.locator('tr', { hasText: 'E2E-NEW' }).first()
    await updatedRow.getByText('删除').click()
    await page.getByRole('button', { name: '确定' }).click()

    await expect(page.locator('table')).not.toContainText('E2E-NEW')
  })

  test('materials: cancel discards editor changes', async ({ page }) => {
    await installMockApi(page)

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('any')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await page.goto('/materials')
    const beforeText = await page.locator('table tbody').textContent()

    await page.getByRole('button', { name: '新增' }).click()
    await page.locator('#editor-field-materials-materialCode').fill('SHOULD-NOT-SAVE')
    await page.getByRole('button', { name: '取消' }).click()

    await expect(page.locator('table')).not.toContainText('SHOULD-NOT-SAVE')
    const afterText = await page.locator('table tbody').textContent()
    expect(afterText).toBe(beforeText)
  })

  test('warehouses: read-only module shows no edit controls', async ({ page }) => {
    await installMockApi(page, {
      user: {
        menuCodes: ['/dashboard', '/warehouses'],
        actionMap: {
          warehouses: ['VIEW'],
        },
      },
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('any')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await page.goto('/warehouses')
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByRole('button', { name: '新增' })).not.toBeVisible()
  })
})
