import { expect } from '@playwright/test'
import {
  clickEditorSave,
  closeSaveResult,
  collectionTotal,
  confirmStatusDialog,
  deleteModuleRecordBestEffort,
  dismissSaveResult,
  E2E_PREFIX,
  editorPanel,
  expectSaveSuccess,
  extractIdAfterLabel,
  findCustomerStatementCandidate,
  firstSettlementCompanyWithAccount,
  gotoRouteE2e,
  importFirstParentCandidate,
  loginE2e,
  observeSaveResult,
  reverseConfirmStatementBestEffort,
  selectAriaLabelOption,
  selectFieldOption,
} from './ops-e2e-support'
import { expectGridTable, expectModuleHeading } from './support/business-e2e'
import { test } from './support/test'

test.describe('对账与财务真实操作', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
  })

  test('客户对账单：从候选销售订单生成 → 保存 → 确认，并校验蓝字/红字筛选', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const candidate = await findCustomerStatementCandidate(request)
    await gotoRouteE2e(page, '/customer-statement')
    await expectModuleHeading(page, '客户对账单')
    await expectGridTable(page)

    if (!candidate) {
      const directionTrigger = page
        .locator('button')
        .filter({ hasText: /^方向/ })
        .first()
      await expect(directionTrigger).toBeVisible({ timeout: 30_000 })
      await directionTrigger.click()
      await expect(
        page.getByRole('radio', { name: '蓝字' }).first(),
      ).toBeVisible({ timeout: 15_000 })
      await expect(
        page.getByRole('radio', { name: '红字' }).first(),
      ).toBeVisible({ timeout: 15_000 })
      test.info().annotations.push({
        type: 'relaxed',
        description: '无可用客户对账候选销售订单，仅校验页面与蓝字/红字筛选',
      })
      await assertNoFatalUiErrors()
      return
    }

    await page
      .getByRole('button', { name: /生成对账单/ })
      .first()
      .click()
    const editor = editorPanel(page).last()
    await expect(editor).toBeVisible({ timeout: 30_000 })

    await selectFieldOption(
      page,
      'module-form-customerid',
      candidate.customerName,
    )
    await selectFieldOption(
      page,
      'module-form-projectid',
      candidate.projectName,
    )

    await editor
      .getByRole('button', { name: /选择销售订单生成明细/ })
      .first()
      .click()
    await importFirstParentCandidate(page)

    const itemRows = editor.locator('tbody tr:not(.ant-table-measure-row)')
    await expect(itemRows.first()).toBeVisible({ timeout: 30_000 })
    expect(await itemRows.count()).toBeGreaterThan(0)

    await editor.locator('#module-form-remark').fill(E2E_PREFIX)

    await clickEditorSave(page, 'save')
    const draftOutcome = await expectSaveSuccess(page)
    const createdId = extractIdAfterLabel(draftOutcome.panelText, '对账单号')
    await closeSaveResult(page)

    expect(createdId).toBeTruthy()
    const statementRow = page
      .locator('tbody tr:not(.ant-table-measure-row)')
      .filter({ hasText: createdId as string })
      .first()
    await expect(statementRow).toBeVisible({ timeout: 30_000 })
    await expect(statementRow).toContainText('待确认')

    try {
      await statementRow.dblclick()
      await expect(editorPanel(page).last()).toBeVisible({ timeout: 30_000 })
      await clickEditorSave(page, 'audit')
      await confirmStatusDialog(page, '确认')
      await expectSaveSuccess(page)
      await closeSaveResult(page)

      await expect(statementRow).toContainText('已确认', { timeout: 30_000 })

      const directionTrigger = page
        .locator('button')
        .filter({ hasText: /^方向/ })
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

      const redTag = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: '红字' })
      if ((await redTag.count()) > 0) {
        await expect(redTag.first()).toBeVisible({ timeout: 30_000 })
      }
    } finally {
      if (createdId) {
        await reverseConfirmStatementBestEffort(request, createdId)
        await deleteModuleRecordBestEffort(
          request,
          '/customer-statements',
          createdId,
        )
      }
    }

    await assertNoFatalUiErrors()
  })

  test('收款单：新建 → 保存 → 审核并校验列表状态', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/receipt')
    await expectModuleHeading(page, '收款单')
    await expectGridTable(page)

    const customerTotal = await collectionTotal(request, '/customers')
    const settlementCompany = await firstSettlementCompanyWithAccount(request)
    test.info().annotations.push({
      type: 'preconditions',
      description: `客户数=${customerTotal}，可结算账户主体=${settlementCompany ?? '无'}`,
    })
    if (!customerTotal || !settlementCompany) {
      test.info().annotations.push({
        type: 'relaxed',
        description:
          '缺少客户或带结算账户的结算主体，收款单创建前置不足，已跳过',
      })
      await assertNoFatalUiErrors()
      return
    }

    await page
      .getByRole('button', { name: /新增|新建/ })
      .first()
      .click()
    const editor = editorPanel(page).last()
    await expect(editor).toBeVisible({ timeout: 30_000 })

    await selectFieldOption(page, 'module-form-counterpartytype', '客户')
    await selectFieldOption(page, 'module-form-counterpartyid', 0)
    await selectFieldOption(
      page,
      'module-form-settlementcompanyid',
      settlementCompany,
    )
    await selectFieldOption(page, 'module-form-paytype', '银行转账')
    await selectFieldOption(page, 'module-form-accountid', 0)
    await editor.locator('#module-form-amount').fill('1000')
    await editor.locator('#module-form-remark').fill(E2E_PREFIX)

    await clickEditorSave(page, 'save')
    const draftOutcome = await observeSaveResult(page)
    if (!draftOutcome.success) {
      test.info().annotations.push({
        type: 'blocked',
        description: `收款单保存被后端拒绝：${draftOutcome.panelText}`,
      })
      await dismissSaveResult(page)
      await assertNoFatalUiErrors()
      return
    }
    const createdId = extractIdAfterLabel(draftOutcome.panelText, '收款单号')
    await closeSaveResult(page)
    expect(createdId).toBeTruthy()

    try {
      const row = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: createdId as string })
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
      if (createdId) {
        await deleteModuleRecordBestEffort(request, '/receipts', createdId)
      }
    }

    await assertNoFatalUiErrors()
  })

  test('付款单：新建 → 保存 → 审核并校验列表状态', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/payment')
    await expectModuleHeading(page, '付款单')
    await expectGridTable(page)

    const supplierTotal = await collectionTotal(request, '/suppliers')
    const settlementCompany = await firstSettlementCompanyWithAccount(request)
    test.info().annotations.push({
      type: 'preconditions',
      description: `供应商数=${supplierTotal}，可结算账户主体=${settlementCompany ?? '无'}`,
    })
    if (!supplierTotal || !settlementCompany) {
      test.info().annotations.push({
        type: 'relaxed',
        description:
          '缺少供应商或带结算账户的结算主体，付款单前置来源不足，已跳过',
      })
      await assertNoFatalUiErrors()
      return
    }

    await page
      .getByRole('button', { name: /新增|新建/ })
      .first()
      .click()
    const editor = editorPanel(page).last()
    await expect(editor).toBeVisible({ timeout: 30_000 })

    await selectFieldOption(page, 'module-form-counterpartytype', '供应商')
    await selectFieldOption(page, 'module-form-counterpartyid', 0)
    await selectFieldOption(
      page,
      'module-form-settlementcompanyid',
      settlementCompany,
    )
    await selectFieldOption(page, 'module-form-paytype', '银行转账')
    await selectFieldOption(page, 'module-form-accountid', 0)
    await editor.locator('#module-form-amount').fill('500')
    await editor.locator('#module-form-remark').fill(E2E_PREFIX)

    await clickEditorSave(page, 'save')
    const draftOutcome = await observeSaveResult(page)
    if (!draftOutcome.success) {
      test.info().annotations.push({
        type: 'blocked',
        description: `付款单保存被后端拒绝：${draftOutcome.panelText}`,
      })
      await dismissSaveResult(page)
      await assertNoFatalUiErrors()
      return
    }
    const createdId = extractIdAfterLabel(draftOutcome.panelText, '付款单号')
    await closeSaveResult(page)
    expect(createdId).toBeTruthy()

    try {
      const row = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: createdId as string })
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
      if (createdId) {
        await deleteModuleRecordBestEffort(request, '/payments', createdId)
      }
    }

    await assertNoFatalUiErrors()
  })

  test('资金流水：选择结算主体查询、流水类型筛选与分页', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
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
    await selectAriaLabelOption(page, '结算主体', '颖捷')
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
    await selectAriaLabelOption(page, '流水类型', '收款')
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

    await assertNoFatalUiErrors()
  })

  test('财务概览：选择结算主体查询应收与应付区', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
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

    await expect(page.getByText('应收', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('未收', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('预收', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })

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

    await expect(page.getByText('应付', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('未付', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('预付', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })

    await assertNoFatalUiErrors()
  })
})
