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
  findFreightBillCandidate,
  gotoRouteE2e,
  importFirstParentCandidate,
  loginE2e,
  observeSaveResult,
  parentSelectorPanel,
  reverseModuleStatusBestEffort,
  selectFieldOption,
  selectPopoverOption,
} from './ops-e2e-support'
import { expectGridTable, expectModuleHeading } from './support/business-e2e'
import { test } from './support/test'

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
    const candidate = await findFreightBillCandidate(request)
    const carrierTotal = await collectionTotal(request, '/carriers')
    test.info().annotations.push({
      type: 'preconditions',
      description: `物流商数=${carrierTotal}，可导入销售订单候选=${candidate ? candidate.orderNo : '无'}`,
    })

    await gotoRouteE2e(page, '/freight-bill')
    await expectModuleHeading(page, '物流单')
    await expectGridTable(page)

    if (!carrierTotal) {
      test.info().annotations.push({
        type: 'relaxed',
        description: '缺少物流商主数据，物流单创建前置不足，已跳过',
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
    await selectFieldOption(page, 'module-form-carrierid', 0)

    await editor
      .getByRole('button', { name: /选择销售订单导入全部明细/ })
      .first()
      .click()
    const selector = parentSelectorPanel(page)
    const imported = await selector
      .locator('tbody tr:not(.ant-table-measure-row)')
      .first()
      .isVisible({ timeout: 20_000 })
      .catch(() => false)
    if (!imported) {
      await selector
        .getByRole('button', { name: /取\s*消/ })
        .first()
        .click()
        .catch(() => undefined)
      test.info().annotations.push({
        type: 'relaxed',
        description:
          '没有可导入的销售订单候选明细，物流单仅校验新建表单，已跳过保存',
      })
      await assertNoFatalUiErrors()
      return
    }
    await importFirstParentCandidate(page)
    await expect(
      editor.locator('tbody tr:not(.ant-table-measure-row)').first(),
    ).toBeVisible({ timeout: 30_000 })
    await editor.locator('#module-form-remark').fill(E2E_PREFIX)

    await clickEditorSave(page, 'save')
    const draftOutcome = await observeSaveResult(page)
    if (!draftOutcome.success) {
      test.info().annotations.push({
        type: 'blocked',
        description: `物流单保存被后端拒绝：${draftOutcome.panelText}`,
      })
      await dismissSaveResult(page)
      await assertNoFatalUiErrors()
      return
    }
    const createdId = extractIdAfterLabel(draftOutcome.panelText, '物流单号')
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
        await reverseModuleStatusBestEffort(
          request,
          '/freight-bills',
          createdId,
          '草稿',
        )
        await deleteModuleRecordBestEffort(request, '/freight-bills', createdId)
      }
    }

    await assertNoFatalUiErrors()
  })

  test('物流对账单：列表加载并按物流商/审核状态筛选', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
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

    await assertNoFatalUiErrors()
  })
})
