import { expect, test } from '@playwright/test'
import { getModuleDetail, listModuleRecords } from './support/live-helpers'
import { primeRealAuthSession } from './support/real-session'

const statementCases = [
  {
    route: '/customer-statements',
    apiPath: 'customer-statements',
    key: 'statementNo',
    detailTitle: '客户对账单详情',
    detailFields: ['statementNo', 'customerName', 'projectName', 'status'],
  },
  {
    route: '/supplier-statements',
    apiPath: 'supplier-statements',
    key: 'statementNo',
    detailTitle: '供应商对账单详情',
    detailFields: ['statementNo', 'supplierName', 'status'],
  },
  {
    route: '/freight-statements',
    apiPath: 'freight-statements',
    key: 'statementNo',
    detailTitle: '物流对账单详情',
    detailFields: ['statementNo', 'carrierName', 'status', 'signStatus'],
  },
] as const

test.describe('finance linked statement flows', () => {
  for (const scenario of statementCases) {
    test(`opens real detail for ${scenario.apiPath}`, async ({ page }) => {
      const session = await primeRealAuthSession(page)
      const rows = await listModuleRecords(page.request, session.accessToken, scenario.apiPath, { size: 3 })
      const firstRow = rows[0]
      const statementNo = String(firstRow?.[scenario.key] || '').trim()
      const detail = firstRow?.id
        ? await getModuleDetail(page.request, session.accessToken, scenario.apiPath, String(firstRow.id))
        : null

      test.skip(!statementNo, `${scenario.apiPath} 没有可用真实数据`)

      await page.goto(scenario.route)

      await expect(page.locator('table')).toContainText(statementNo)

      const row = page.locator('tr', { hasText: statementNo }).first()
      await expect(row).toBeVisible()
      await row.getByText('查看').click()

      const detailOverlay = page.locator('.workspace-overlay:visible').last()
      await expect(detailOverlay).toBeVisible()
      const detailBody = detailOverlay.locator('.bill-detail-body')
      for (const field of scenario.detailFields) {
        const value = String(detail?.[field] || firstRow?.[field] || '').trim()
        if (value) {
          await expect(detailBody).toContainText(value)
        }
      }
      if (Array.isArray(detail?.items) && detail.items.length > 0) {
        const sourceNo = String((detail.items[0] as Record<string, unknown>).sourceNo || '').trim()
        if (sourceNo) {
          await expect(detailOverlay.locator('.module-detail-table')).toContainText(sourceNo)
        }
      }
    })
  }
})
