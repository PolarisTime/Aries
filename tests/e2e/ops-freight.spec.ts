import { expect } from '@playwright/test'
import {
  clickEditorSave,
  closeSaveResult,
  confirmStatusDialog,
  E2E_PREFIX,
  editorPanel,
  expectSaveSuccess,
  extractIdAfterLabel,
  gotoRouteE2e,
  importFirstParentCandidate,
  loginE2e,
  parentSelectorPanel,
  searchAndSelectFieldOption,
  selectPopoverOption,
} from './ops-e2e-support'
import { expectGridTable, expectModuleHeading } from './support/business-e2e'
import { createE2eFixtures } from './support/data-fixtures'
import { test } from './support/test'

/**
 * 物流单与物流对账单（hermetic）。
 *
 * <p>前置数据由 fixture 自建：稳定物流方 + 「完成销售 + 已审核出库」销售链（物流单候选池要求
 * 销售订单处于已审核/交付核定/完成销售）。数据不足时直接让用例红，不再 relaxed/blocked 跳过。</p>
 */
test.describe('物流单与物流对账单真实操作', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
  })

  test('物流单：从销售订单导入明细 → 保存 → 审核', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    let freightBillId: string | null = null
    try {
      const master = await fixtures.ensureStableMasterData()
      // 保证候选池里有本 fixture 的销售订单（不存在就补一条常驻销售链）。
      await fixtures.ensureCustomerStatementCandidates()
      const candidates = await fixtures.findFreightBillCandidates()
      expect(
        candidates.length,
        'fixture 必须能提供物流单候选销售订单（完成销售 + 已审核出库）',
      ).toBeGreaterThan(0)
      const candidate = candidates[0]

      await gotoRouteE2e(page, '/freight-bill')
      await expectModuleHeading(page, '物流单')
      await expectGridTable(page)

      await page
        .getByRole('button', { name: /新增|新建/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })
      await searchAndSelectFieldOption(
        page,
        'module-form-carrierid',
        master.carrier.carrierName,
      )

      await editor
        .getByRole('button', { name: /选择销售订单导入/ })
        .first()
        .click()
      // 只导入 fixture 的销售订单：先按单号过滤，避免命中共享库历史候选。
      const selector = parentSelectorPanel(page)
      const selectorKeyword = selector.getByRole('textbox').first()
      await selectorKeyword.fill(candidate.orderNo)
      await selectorKeyword.press('Enter')
      await importFirstParentCandidate(page)

      await expect(
        editor.locator('tbody tr:not(.ant-table-measure-row)').first(),
      ).toBeVisible({ timeout: 30_000 })
      await editor.locator('#module-form-remark').fill(E2E_PREFIX)

      await clickEditorSave(page, 'save')
      const draftOutcome = await expectSaveSuccess(page)
      freightBillId = extractIdAfterLabel(draftOutcome.panelText, '物流单号')
      await closeSaveResult(page)
      expect(freightBillId).toBeTruthy()

      const row = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: freightBillId as string })
        .first()
      await expect(row).toBeVisible({ timeout: 30_000 })
      await expect(row).toContainText('草稿')

      await row.dblclick()
      await expect(editorPanel(page).last()).toBeVisible({ timeout: 30_000 })
      await clickEditorSave(page, 'audit')
      await confirmStatusDialog(page, '审核')
      await expectSaveSuccess(page)
      await closeSaveResult(page)

      await expect(row).toContainText('已审核', { timeout: 30_000 })
    } finally {
      if (freightBillId) {
        const failures = await fixtures.deleteDocument(
          '/freight-bills',
          freightBillId,
          '物流单',
        )
        if (failures.length > 0) {
          test.info().annotations.push({
            type: 'cleanup-failure',
            description: failures.join('; '),
          })
        }
      }
      const fixtureFailures = await fixtures.cleanup()
      if (fixtureFailures.length > 0) {
        test.info().annotations.push({
          type: 'cleanup-failure',
          description: fixtureFailures.join('; '),
        })
      }
    }

    await assertNoFatalUiErrors()
  })

  test('物流对账单：列表加载并按物流商/审核状态筛选', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    try {
      await fixtures.ensureStableMasterData()
      await gotoRouteE2e(page, '/freight-statement')
      await expectModuleHeading(page, '物流对账单')
      await expectGridTable(page)

      const carrierResponse = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('freight-statements'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await selectPopoverOption(page, '物流商', 0)
      await carrierResponse
      await expectGridTable(page)

      const statusResponse = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('freight-statements'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await selectPopoverOption(page, '审核状态', '已审核')
      await statusResponse
      await expectGridTable(page)

      const rows = page.locator('tbody tr:not(.ant-table-measure-row)')
      const count = await rows.count()
      if (count > 0) {
        await expect(rows.first()).toBeVisible({ timeout: 30_000 })
      } else {
        await expect(
          page.getByText(/没有匹配的记录|暂无|还没有任何数据/).first(),
        ).toBeVisible({ timeout: 30_000 })
      }
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
})
