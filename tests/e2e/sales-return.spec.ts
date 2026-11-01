import { expect } from '@playwright/test'
import {
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
} from './support/business-e2e'
import { createE2eFixtures } from './support/data-fixtures'
import { test } from './support/test'

const CREATE_FROM_OUTBOUND = '从销售出库创建退货'

test.describe('销售退货单', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('列表加载并展示从销售出库创建入口', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/sales-return')
    await expectModuleHeading(page, '销售退货单')
    await expectGridTable(page)
    await expect(
      page.getByRole('button', { name: CREATE_FROM_OUTBOUND }),
    ).toBeVisible({ timeout: 30_000 })
    await assertNoFatalUiErrors()
  })

  test('从销售出库创建退货单并审核', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    // hermetic：fixture 保证至少有一条「已审核销售出库」（不存在就补常驻销售链），
    // 数据不足直接红，不再 skip-reason 假跳过。
    const fixtures = await createE2eFixtures(request)
    try {
      await fixtures.ensureCustomerStatementCandidates()
      await gotoRoute(page, '/sales-return')
      await expectModuleHeading(page, '销售退货单')

      await page.getByRole('button', { name: CREATE_FROM_OUTBOUND }).click()
      const modal = page.locator('.ant-modal:visible').last()
      await expect(modal).toBeVisible({ timeout: 30_000 })

      // 选择首个已审核销售出库
      await modal.locator('.ant-select').first().click()
      const firstOption = page
        .locator('.ant-select-dropdown:visible .ant-select-item-option')
        .first()
      // 下拉选项是异步加载的：必须先等首项出现，再断言存在
      // （否则会把"还没加载"当成"没有数据"，正是旧 skip-reason 假绿的原因）。
      await expect(firstOption, 'fixture 必须能造出已审核销售出库').toBeVisible(
        { timeout: 20_000 },
      )
      await firstOption.click()

      const candidateRow = modal
        .locator('tbody tr:not(.ant-table-measure-row)')
        .first()
      await expect(
        candidateRow,
        '选中的已审核出库单必须带可退明细',
      ).toBeVisible({ timeout: 15_000 })

      // 只退第一行 1 件，避免整单退货耗尽可退数量
      const quantityInputs = modal.locator(
        'input[id^="sales-return-quantity-"]',
      )
      const inputCount = await quantityInputs.count()
      for (let index = 0; index < inputCount; index += 1) {
        await quantityInputs.nth(index).fill(index === 0 ? '1' : '0')
        await quantityInputs.nth(index).press('Enter')
      }

      await modal.locator('.ant-modal-footer button.ant-btn-primary').click()
      await expect(modal).toBeHidden({ timeout: 30_000 })

      // 重新加载列表，确认草稿已生成
      await gotoRoute(page, '/sales-return')
      await expectModuleHeading(page, '销售退货单')
      const firstRow = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .first()
      await expect(firstRow).toBeVisible({ timeout: 30_000 })
      await expect(firstRow).toContainText('草稿')

      // 双击草稿行打开编辑器并审核
      await firstRow.dblclick()
      await expect(
        page.locator('.workspace-overlay-panel').first(),
      ).toBeVisible({
        timeout: 30_000,
      })

      const auditButton = page
        .getByRole('button', { name: '保存并审核' })
        .first()
      await expect(auditButton).toBeVisible({ timeout: 30_000 })
      await auditButton.click()

      const confirmAudit = page
        .getByRole('button', { name: '确定审核' })
        .first()
      await expect(confirmAudit).toBeVisible({ timeout: 30_000 })
      await confirmAudit.click()

      const saveResult = page.locator('.save-result-overlay').first()
      await expect(saveResult).toBeVisible({ timeout: 30_000 })
      await saveResult
        .getByRole('button', { name: /关\s*闭/ })
        .first()
        .click()
      await expect(saveResult).toBeHidden({ timeout: 30_000 })

      // 审核后列表首行应为已审核
      await expect(firstRow).toContainText('已审核', { timeout: 30_000 })
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
