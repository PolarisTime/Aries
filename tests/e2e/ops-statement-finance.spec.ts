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
  searchAndSelectAriaLabelOption,
  searchAndSelectFieldOption,
  selectAriaLabelOption,
  selectFieldOption,
} from './ops-e2e-support'
import { expectGridTable, expectModuleHeading } from './support/business-e2e'
import { createE2eFixtures } from './support/data-fixtures'
import { test } from './support/test'

/**
 * 对账与财务真实操作（hermetic）。
 *
 * <p>前置数据由 {@link createE2eFixtures} 经真实 API 自建：稳定主数据（结算主体/客户/供应商/
 * 仓库/项目/商品）跨 run 复用；客户对账单候选来自 fixture 维护的「完成销售 + 已审核出库」销售链；
 * 用例自建的单据在 finally 里回退状态并删除。数据缺失一律让用例红，不再 relaxed/blocked 提前返回。</p>
 *
 * <p><b>已知不可清理项（后端产品规则，不是测试偷懒）</b>：已审核收款单/付款单没有回退迁移、
 * DELETE 又被保护状态拦截，无法清理；用例会显式标注 `cleanup-uncleanable` 并保留 `E2E-C-` 备注便于识别。
 * 详见 `tests/e2e/README.md`「数据前置与清理」。</p>
 */
test.describe('对账与财务真实操作', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
  })

  const annotate = (type: string, description: string) => {
    test.info().annotations.push({ type, description })
  }

  test('客户对账单：从候选销售订单生成 → 保存 → 确认，并校验蓝字/红字筛选', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    let statementId: string | null = null
    try {
      const { candidates } = await fixtures.ensureCustomerStatementCandidates()
      const candidate = candidates[0]
      expect(candidate, 'fixture 必须能造出客户对账候选').toBeDefined()

      await gotoRouteE2e(page, '/customer-statement')
      await expectModuleHeading(page, '客户对账单')
      await expectGridTable(page)

      await page
        .getByRole('button', { name: /生成对账单/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })

      await searchAndSelectFieldOption(
        page,
        'module-form-customerid',
        candidate.customerName,
      )
      await searchAndSelectFieldOption(
        page,
        'module-form-projectid',
        candidate.projectName,
      )

      await editor
        .getByRole('button', { name: /选择销售订单生成明细/ })
        .first()
        .click()
      // 只导入 fixture 的销售订单：先按单号过滤候选，避免命中共享库历史数据。
      const selector = parentSelectorPanel(page)
      const selectorKeyword = selector.getByRole('textbox').first()
      await selectorKeyword.fill(candidate.orderNo)
      await selectorKeyword.press('Enter')
      await importFirstParentCandidate(page)

      const itemRows = editor.locator('tbody tr:not(.ant-table-measure-row)')
      await expect(itemRows.first()).toBeVisible({ timeout: 30_000 })
      expect(await itemRows.count()).toBeGreaterThan(0)

      await editor.locator('#module-form-remark').fill(E2E_PREFIX)

      await clickEditorSave(page, 'save')
      const draftOutcome = await expectSaveSuccess(page)
      statementId = extractIdAfterLabel(draftOutcome.panelText, '对账单号')
      await closeSaveResult(page)

      expect(statementId).toBeTruthy()
      // 列表不会自动刷新到新生成的单据：重新进入列表（fixture 已保证候选日期在默认
      // 账期窗口内，新单据按 id 倒序应在第一页）后按单号定位本 run 的记录。
      await gotoRouteE2e(page, '/customer-statement')
      await expectModuleHeading(page, '客户对账单')
      await expectGridTable(page)
      const statementRow = page
        .locator('tbody tr.ant-table-row[data-row-key]')
        .filter({ hasText: statementId as string })
        .first()
      await expect(statementRow).toBeVisible({ timeout: 30_000 })
      await expect(statementRow).toContainText('待确认')

      await statementRow.dblclick()
      await expect(editorPanel(page).last()).toBeVisible({ timeout: 30_000 })
      await clickEditorSave(page, 'audit')
      await confirmStatusDialog(page, '确认')
      await expectSaveSuccess(page)
      await closeSaveResult(page)

      await expect(statementRow).toContainText('已确认', { timeout: 30_000 })

      const directionTrigger = page
        .getByRole('button', { name: /^方向/ })
        .first()
      await expect(directionTrigger).toBeVisible({ timeout: 30_000 })
      await directionTrigger.click()
      await expect(
        page.getByRole('radio', { name: '蓝字' }).first(),
      ).toBeVisible({ timeout: 15_000 })
      const blueRequest = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('customer-statements') &&
            response.url().includes('billDirection'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await page.getByRole('radio', { name: '蓝字' }).first().click()
      await blueRequest
      await expectGridTable(page)

      await directionTrigger.click()
      const redRequest = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('customer-statements') &&
            response.url().includes('billDirection'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await page.getByRole('radio', { name: '红字' }).first().click()
      await redRequest
      await expectGridTable(page)
    } finally {
      if (statementId) {
        const failures = await fixtures.deleteDocument(
          '/customer-statements',
          statementId,
          '客户对账单',
        )
        if (failures.length > 0) {
          annotate('cleanup-failure', failures.join('; '))
        }
      }
      const fixtureFailures = await fixtures.cleanup()
      if (fixtureFailures.length > 0) {
        annotate('cleanup-failure', fixtureFailures.join('; '))
      }
    }

    await assertNoFatalUiErrors()
  })

  test('收款单：新建 → 保存 → 审核并校验列表状态', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    let receiptId: string | null = null
    try {
      // 稳定主数据：结算主体 + 账户、客户都由 fixture 保证存在（不再 relaxed 跳过）。
      const { company } = await fixtures.ensureStableMasterData()

      await gotoRouteE2e(page, '/receipt')
      await expectModuleHeading(page, '收款单')
      await expectGridTable(page)

      await page
        .getByRole('button', { name: /新增|新建/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })

      const { customer } = await fixtures.ensureStableMasterData()
      await selectFieldOption(page, 'module-form-counterpartytype', '客户')
      await searchAndSelectFieldOption(
        page,
        'module-form-counterpartyid',
        customer.customerName,
      )
      await searchAndSelectFieldOption(
        page,
        'module-form-settlementcompanyid',
        company.companyName,
      )
      await selectFieldOption(page, 'module-form-paytype', '银行转账')
      await selectFieldOption(page, 'module-form-accountid', 0)
      await editor.locator('#module-form-amount').fill('1000')
      await editor.locator('#module-form-remark').fill(E2E_PREFIX)

      await clickEditorSave(page, 'save')
      const draftOutcome = await expectSaveSuccess(page)
      receiptId = extractIdAfterLabel(draftOutcome.panelText, '收款单号')
      await closeSaveResult(page)
      expect(receiptId).toBeTruthy()

      const row = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: receiptId as string })
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
      if (receiptId) {
        const failures = await fixtures.deleteDocument(
          '/receipts',
          receiptId,
          '收款单',
        )
        if (failures.length > 0) {
          // 后端产品规则：已审核收款单无回退迁移且 DELETE 受保护，无法清理；
          // 显式标注（不静默），并保留 E2E 前缀便于人工识别。
          annotate('cleanup-uncleanable', failures.join('; '))
        }
      }
      const fixtureFailures = await fixtures.cleanup()
      if (fixtureFailures.length > 0) {
        annotate('cleanup-failure', fixtureFailures.join('; '))
      }
    }

    await assertNoFatalUiErrors()
  })

  test('付款单：新建 → 保存 → 审核并校验列表状态', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    let paymentId: string | null = null
    try {
      const { company, supplier } = await fixtures.ensureStableMasterData()

      await gotoRouteE2e(page, '/payment')
      await expectModuleHeading(page, '付款单')
      await expectGridTable(page)

      await page
        .getByRole('button', { name: /新增|新建/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })

      await selectFieldOption(page, 'module-form-counterpartytype', '供应商')
      await searchAndSelectFieldOption(
        page,
        'module-form-counterpartyid',
        supplier.supplierName,
      )
      await searchAndSelectFieldOption(
        page,
        'module-form-settlementcompanyid',
        company.companyName,
      )
      await selectFieldOption(page, 'module-form-paytype', '银行转账')
      await selectFieldOption(page, 'module-form-accountid', 0)
      await editor.locator('#module-form-amount').fill('500')
      await editor.locator('#module-form-remark').fill(E2E_PREFIX)

      await clickEditorSave(page, 'save')
      const draftOutcome = await expectSaveSuccess(page)
      paymentId = extractIdAfterLabel(draftOutcome.panelText, '付款单号')
      await closeSaveResult(page)
      expect(paymentId).toBeTruthy()

      const row = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: paymentId as string })
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
      if (paymentId) {
        const failures = await fixtures.deleteDocument(
          '/payments',
          paymentId,
          '付款单',
        )
        if (failures.length > 0) {
          annotate('cleanup-uncleanable', failures.join('; '))
        }
      }
      const fixtureFailures = await fixtures.cleanup()
      if (fixtureFailures.length > 0) {
        annotate('cleanup-failure', fixtureFailures.join('; '))
      }
    }

    await assertNoFatalUiErrors()
  })

  test('资金流水：选择结算主体查询、流水类型筛选与分页', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    try {
      const { company } = await fixtures.ensureStableMasterData()
      await gotoRouteE2e(page, '/cash-ledger')
      await expectModuleHeading(page, '资金流水')

      const ledgerResponse = page
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
      await ledgerResponse

      await expect(page.getByText('期初余额').first()).toBeVisible({
        timeout: 30_000,
      })
      await expect(page.getByText('期末余额').first()).toBeVisible({
        timeout: 30_000,
      })
      await expectGridTable(page)

      await page
        .getByRole('button', { name: /高级筛选/ })
        .first()
        .click()
      const flowResponse = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('cash-ledger'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await searchAndSelectAriaLabelOption(page, '流水类型', '收款')
      await flowResponse
      await expectGridTable(page)

      const pageSizeSelect = page.locator('.ant-pagination-options .ant-select')
      if ((await pageSizeSelect.count()) > 0) {
        const pageSizeResponse = page
          .waitForResponse(
            (response) =>
              response.request().method() === 'GET' &&
              response.url().includes('cash-ledger'),
            { timeout: 30_000 },
          )
          .catch(() => null)
        await selectAriaLabelOption(page, 'Page Size', '50')
        await pageSizeResponse
        await expectGridTable(page)
      }
    } finally {
      const failures = await fixtures.cleanup()
      if (failures.length > 0) {
        annotate('cleanup-failure', failures.join('; '))
      }
    }

    await assertNoFatalUiErrors()
  })

  test('财务概览：选择结算主体查询应收与应付区', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const fixtures = await createE2eFixtures(request)
    try {
      await fixtures.ensureStableMasterData()
      const overviewResponse = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('finance-overview'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await gotoRouteE2e(page, '/finance-overview')
      await expectModuleHeading(page, '财务概览')
      await overviewResponse

      await expect(page.getByText('应收', { exact: true }).first()).toBeVisible(
        { timeout: 30_000 },
      )
      await expect(page.getByText('未收', { exact: true }).first()).toBeVisible(
        { timeout: 30_000 },
      )
      await expect(page.getByText('预收', { exact: true }).first()).toBeVisible(
        { timeout: 30_000 },
      )

      const payableResponse = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes('finance-overview') &&
            response.url().includes('PAYABLE'),
          { timeout: 30_000 },
        )
        .catch(() => null)
      await page
        .locator('.ant-segmented-item-label')
        .filter({ hasText: '应付' })
        .first()
        .click()
      await payableResponse

      await expect(page.getByText('应付', { exact: true }).first()).toBeVisible(
        { timeout: 30_000 },
      )
      await expect(page.getByText('未付', { exact: true }).first()).toBeVisible(
        { timeout: 30_000 },
      )
      await expect(page.getByText('预付', { exact: true }).first()).toBeVisible(
        { timeout: 30_000 },
      )
    } finally {
      const failures = await fixtures.cleanup()
      if (failures.length > 0) {
        annotate('cleanup-failure', failures.join('; '))
      }
    }

    await assertNoFatalUiErrors()
  })
})
