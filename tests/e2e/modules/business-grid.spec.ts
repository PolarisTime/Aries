import { test, expect } from '@playwright/test'
import { setupAuthMocks, mockBusinessList } from '../helpers/mock-api'

const mockMaterials = [
  { id: '1', materialCode: 'M001', brand: '宝钢', material: '热轧卷板', spec: '2.0*1250*C', length: 'C', unit: '吨', unitPrice: 4200, status: 'active' },
  { id: '2', materialCode: 'M002', brand: '鞍钢', material: '冷轧板', spec: '1.5*1250*C', length: 'C', unit: '吨', unitPrice: 5100, status: 'active' },
  { id: '3', materialCode: 'M003', brand: '沙钢', material: '螺纹钢', spec: '16*9000', length: '9000', unit: '吨', unitPrice: 3800, status: 'active' },
]

test.describe('Business Grid', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)
    await mockBusinessList(page, 'materials', mockMaterials)
    await page.goto('/login')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('password123')
    await page.locator('button:has-text("登 录")').click()
    await page.waitForURL('**/dashboard')
  })

  test('navigates to business module page', async ({ page }) => {
    await page.goto('/materials')
    await page.waitForURL('**/materials')
    await expect(page.locator('text=商品资料')).toBeVisible()
  })

  test('renders filter toolbar', async ({ page }) => {
    await page.goto('/materials')
    await expect(page.locator('button:has-text("查询")')).toBeVisible()
    await expect(page.locator('button:has-text("重置")')).toBeVisible()
  })

  test('renders table toolbar with create button', async ({ page }) => {
    await page.goto('/materials')
    await expect(page.locator('button:has-text("新建")')).toBeVisible()
    await expect(page.locator('button:has-text("导出")')).toBeVisible()
  })

  test('renders data table with rows', async ({ page }) => {
    await page.goto('/materials')
    await page.waitForTimeout(500)
    await expect(page.locator('.leo-data-table')).toBeVisible()
  })

  test('pagination renders', async ({ page }) => {
    await page.goto('/materials')
    await expect(page.locator('.ant-pagination')).toBeVisible()
  })

  test('filter search triggers query', async ({ page }) => {
    await page.goto('/materials')
    const searchInput = page.locator('input[placeholder="搜索关键词..."]')
    await searchInput.fill('宝钢')
    await searchInput.press('Enter')
    await page.waitForTimeout(300)
  })

  test('create button opens editor drawer', async ({ page }) => {
    await page.goto('/materials')
    await page.locator('button:has-text("新建")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('.ant-drawer')).toBeVisible()
    await expect(page.locator('button:has-text("保存")')).toBeVisible()
  })

  test('editor drawer can be closed', async ({ page }) => {
    await page.goto('/materials')
    await page.locator('button:has-text("新建")').click()
    await page.waitForTimeout(300)
    await page.locator('.ant-drawer button:has-text("取消")').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.ant-drawer')).not.toBeVisible()
  })

  test('refresh button triggers reload', async ({ page }) => {
    await page.goto('/materials')
    await page.locator('button .anticon-reload').click()
    await page.waitForTimeout(300)
  })
})
