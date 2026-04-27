import { expect, test } from '@playwright/test'
import { getModuleDetail, listModuleRecords } from './support/live-helpers'
import { primeRealAuthSession } from './support/real-session'

const readOnlyCases = [
  {
    route: '/purchase-contracts',
    apiPath: 'purchase-contracts',
    placeholder: '输入采购合同号',
    key: 'contractNo',
    supportsDetailApi: true,
    detailTitle: '采购合同详情',
    detailFields: ['contractNo', 'supplierName', 'status'],
  },
  {
    route: '/sales-contracts',
    apiPath: 'sales-contracts',
    placeholder: '输入销售合同号',
    key: 'contractNo',
    supportsDetailApi: true,
    detailTitle: '销售合同详情',
    detailFields: ['contractNo', 'customerName', 'projectName'],
  },
  {
    route: '/inventory-report',
    apiPath: 'inventory-report',
    placeholder: '商品编码 / 品牌 / 规格',
    key: 'materialCode',
    supportsDetailApi: false,
    detailTitle: '商品库存报表详情',
    detailFields: ['materialCode', 'warehouseName', 'batchNo'],
  },
  {
    route: '/io-report',
    apiPath: 'io-report',
    placeholder: '输入来源单号',
    key: 'sourceNo',
    supportsDetailApi: false,
    detailTitle: '出入库报表详情',
    detailFields: ['sourceNo', 'businessType', 'materialCode'],
  },
] as const

test.describe('contracts and reports flows', () => {
  for (const scenario of readOnlyCases) {
    test(`filters and opens detail for ${scenario.apiPath}`, async ({ page }) => {
      const session = await primeRealAuthSession(page)
      const rows = await listModuleRecords(page.request, session.accessToken, scenario.apiPath, { size: 3 })
      const firstRow = rows[0]
      const secondRow = rows[1]
      const primaryValue = String(firstRow?.[scenario.key] || '').trim()
      const secondValue = String(secondRow?.[scenario.key] || '').trim()
      const detail = scenario.supportsDetailApi && firstRow?.id
        ? await getModuleDetail(page.request, session.accessToken, scenario.apiPath, String(firstRow.id))
        : null

      test.skip(!primaryValue, `${scenario.apiPath} 没有可用真实数据`)

      await page.goto(scenario.route)
      await page.getByPlaceholder(scenario.placeholder).fill(primaryValue)
      await page.getByRole('button', { name: /查\s*询/ }).click()

      await expect(page.locator('table')).toContainText(primaryValue)
      if (secondValue) {
        await expect(page.locator('table')).not.toContainText(secondValue)
      }

      const row = page.locator('tr', { hasText: primaryValue }).first()
      await expect(row).toBeVisible()
      await row.getByText('查看').click()

      const detailTitle = page.locator('.workspace-overlay-title', { hasText: scenario.detailTitle })
      await expect(detailTitle).toBeVisible()

      const detailBody = page.locator('.bill-detail-body')
      for (const field of scenario.detailFields) {
        const value = String(detail?.[field] || firstRow?.[field] || '').trim()
        if (value) {
          await expect(detailBody).toContainText(value)
        }
      }
    })
  }
})
