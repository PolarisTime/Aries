import { fetchCollection, primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

test.describe('global search coverage with API key', () => {
  test('opens purchase order detail from header search', async ({ page, assertNoFatalUiErrors }) => {
    const collection = await fetchCollection(page.request, 'purchase-orders')

    await primeApiKeySession(page)
    await page.goto('/dashboard')
    await expect(page.getByText('欢迎使用钢材贸易业务中台')).toBeVisible()

    if (!collection.ok || collection.records.length === 0) {
      await expect(page.getByRole('combobox', { name: '搜索单号、合同号、对账单号' })).toBeVisible()
      await assertNoFatalUiErrors()
      return
    }

    const firstRecord = collection.records[0]
    const searchTerm = String(firstRecord.orderNo || '').trim()

    await expect(searchTerm, 'purchase-orders 缺少可用于全局搜索的文本').toBeTruthy()

    const searchBox = page.getByRole('combobox', { name: '搜索单号、合同号、对账单号' })
    await searchBox.fill(searchTerm)

    const targetOption = page
      .locator('.ant-select-dropdown .ant-select-item-option')
      .filter({ hasText: `采购订单 | ${searchTerm}` })
      .first()

    await expect(targetOption).toBeVisible()
    await targetOption.click()

    await expect(page).toHaveURL(/\/purchase-orders\?/)
    const drawer = page.locator('.ant-drawer:visible').last()
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('.ant-drawer-title')).toContainText('记录详情')
    await assertNoFatalUiErrors()
  })
})
