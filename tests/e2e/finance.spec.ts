import { expect } from '@playwright/test'
import { searchAndSelectAriaLabelOption } from './ops-e2e-support'
import {
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
  openFilterChip,
  searchModule,
} from './support/business-e2e'
import { createE2eFixtures } from './support/data-fixtures'
import { test } from './support/test'

/**
 * 财务模块列表/筛选（hermetic）。
 *
 * <p>用例经真实 API 自建前置数据：稳定主数据（结算主体/客户/供应商）跨 run 复用；
 * 列表/筛选只造**草稿**收付款单（可删）；资金流水需要已审核收款单才会产生流水，
 * 因此每 run 至多 1 条已审核收款单 —— 后端不允许回退/删除已审核收付款单，
 * 这是 README 中登记的**已知不可清理例外**（用例会显式标注）。</p>
 */
test.describe('财务模块', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('财务概览加载并展示应收汇总', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    try {
      await fixtures.ensureStableMasterData()
      await gotoRoute(page, '/finance-overview')
      await expectModuleHeading(page, '财务概览')
      await expectGridTable(page)
      await expect(page.getByText('应收').first()).toBeVisible()
    } finally {
      const failures = await fixtures.cleanup()
      if (failures.length > 0) {
        test.info().annotations.push({
          type: 'cleanup-failure',
          description: failures.join('; '),
        })
      }
    }
    await assertNoFatalUiErrors()
  })

  test('收款单列表加载并可打开状态筛选', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    try {
      const { customer, company } = await fixtures.ensureStableMasterData()
      const receipts = [
        await fixtures.createDraftReceipt({ customer, company, amount: 11 }),
        await fixtures.createDraftReceipt({ customer, company, amount: 12 }),
        await fixtures.createDraftReceipt({ customer, company, amount: 13 }),
      ]

      await gotoRoute(page, '/receipt')
      await expectModuleHeading(page, '收款单')
      await expectGridTable(page)

      // 造出 ≥一页可筛数据后，用本 run 单号定位到自己的记录（不假设共享库有数据）。
      await searchModule(page, receipts[0].receiptNo, 'receipts')
      await expect(
        page
          .locator('tbody tr:not(.ant-table-measure-row)')
          .filter({ hasText: receipts[0].receiptNo })
          .first(),
      ).toBeVisible({ timeout: 30_000 })

      await openFilterChip(page, '单据状态')
      await expect(
        page.locator('.ant-popover:visible [aria-label="单据状态"]').first(),
      ).toBeVisible({ timeout: 30_000 })
      await page.keyboard.press('Escape')
    } finally {
      const failures = await fixtures.cleanup()
      if (failures.length > 0) {
        test.info().annotations.push({
          type: 'cleanup-failure',
          description: failures.join('; '),
        })
      }
    }
    await assertNoFatalUiErrors()
  })

  test('付款单列表加载并可打开业务类型筛选', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    try {
      const { supplier, company } = await fixtures.ensureStableMasterData()
      const payments = [
        await fixtures.createDraftPayment({ supplier, company, amount: 21 }),
        await fixtures.createDraftPayment({ supplier, company, amount: 22 }),
      ]

      await gotoRoute(page, '/payment')
      await expectModuleHeading(page, '付款单')
      await expectGridTable(page)

      await searchModule(page, payments[0].paymentNo, 'payments')
      await expect(
        page
          .locator('tbody tr:not(.ant-table-measure-row)')
          .filter({ hasText: payments[0].paymentNo })
          .first(),
      ).toBeVisible({ timeout: 30_000 })

      await openFilterChip(page, '业务类型')
      await expect(
        page.locator('.ant-popover:visible [aria-label="业务类型"]').first(),
      ).toBeVisible({ timeout: 30_000 })
      await page.keyboard.press('Escape')
    } finally {
      const failures = await fixtures.cleanup()
      if (failures.length > 0) {
        test.info().annotations.push({
          type: 'cleanup-failure',
          description: failures.join('; '),
        })
      }
    }
    await assertNoFatalUiErrors()
  })

  test('资金流水选择结算主体后可查询', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    try {
      const { customer, company } = await fixtures.ensureStableMasterData()
      // 资金流水来自已审核收款单：每个 run 恰好造 1 条（不可清理例外，见文件头注释）。
      const receipt = await fixtures.createDraftReceipt({
        customer,
        company,
        amount: 234.56,
        audit: true,
      })

      await gotoRoute(page, '/cash-ledger')
      await expectModuleHeading(page, '资金流水')

      const responsePromise = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('cash-ledger'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await searchAndSelectAriaLabelOption(
        page,
        '结算主体',
        company.companyName,
      )
      await responsePromise
      await expectGridTable(page)

      // 本 run 的已审核收款单应出现在该结算主体的流水里（业务结果断言，非仅元素存在）。
      await expect(
        page
          .locator('tbody')
          .getByText(receipt.receiptNo, { exact: false })
          .first(),
      ).toBeVisible({ timeout: 30_000 })

      test.info().annotations.push({
        type: 'cleanup-uncleanable',
        description: `已审核收款单 ${receipt.receiptNo} 按后端状态机不可回退/删除（README 已知例外）`,
      })
    } finally {
      const failures = await fixtures.cleanup()
      if (failures.length > 0) {
        test.info().annotations.push({
          type: 'cleanup-uncleanable',
          description: failures.join('; '),
        })
      }
    }
    await assertNoFatalUiErrors()
  })
})
