import { expect } from '@playwright/test'
import {
  auditRecordFromList,
  buildRemark,
  createCompletedPurchaseOrder,
  createSalesOrderDraft,
  createSalesOutboundFromOrder,
  findByField,
  gridRow,
  searchList,
  spaGoto,
  waitForStatus,
} from './ops-chain-harness'
import { loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

const CREATE_FROM_OUTBOUND = '从销售出库创建退货'

test.describe('销售退货真实业务链', () => {
  test.describe.configure({ retries: 2 })

  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('已审核销售出库→创建退货→保存并审核→校验状态与列表', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    test.setTimeout(600_000)

    // 前置：采购链 + 销售订单 + 全额出库审核，得到已审核销售出库。
    const purchaseOrder = await createCompletedPurchaseOrder(
      page,
      buildRemark('RETURN-PO'),
    )
    const salesOrder = await createSalesOrderDraft(
      page,
      purchaseOrder.no,
      buildRemark('RETURN-SO'),
    )
    await auditRecordFromList(page, 'sales-order', salesOrder.no)
    await waitForStatus(page.request, 'sales-order', salesOrder.id, '已审核')
    const outbound = await createSalesOutboundFromOrder(
      page,
      salesOrder.no,
      buildRemark('RETURN-OUT'),
    )
    await waitForStatus(page.request, 'sales-outbound', outbound.id, '已审核')

    // 1. 从已审核销售出库创建退货单草稿。
    await spaGoto(page, '/sales-return')
    await page.getByRole('button', { name: CREATE_FROM_OUTBOUND }).click()
    const modal = page.locator('.ant-modal:visible').last()
    await expect(modal).toBeVisible({ timeout: 30_000 })

    const outboundSelect = modal.locator('.ant-select').first()
    await outboundSelect.click()
    await page.waitForTimeout(400)
    const searchInput = outboundSelect.locator('input').first()
    await searchInput.fill(outbound.no)
    await page.waitForTimeout(1_200)
    const option = page
      .locator('.ant-select-dropdown:visible .ant-select-item-option')
      .filter({ hasText: outbound.no })
      .first()
    await expect(option).toBeVisible({ timeout: 15_000 })
    await option.click()

    const candidateRow = modal
      .locator('tbody tr:not(.ant-table-measure-row)')
      .first()
    await expect(candidateRow).toBeVisible({ timeout: 15_000 })
    const quantityInputs = modal.locator('input[id^="sales-return-quantity-"]')
    const inputCount = await quantityInputs.count()
    expect(inputCount).toBeGreaterThan(0)
    for (let index = 0; index < inputCount; index += 1) {
      const input = quantityInputs.nth(index)
      await input.fill(index === 0 ? '1' : '0')
      await input.press('Enter')
    }
    await modal.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(modal).toBeHidden({ timeout: 30_000 })

    // 2. 后端应生成退货单草稿且列表可见。
    const salesReturn = await findByField(
      page.request,
      'sales-return',
      'salesOrderNo',
      salesOrder.no,
      'returnNo',
    )
    expect(salesReturn, '应能按销售订单号检索到退货单').not.toBeNull()
    if (!salesReturn) throw new Error('未检索到退货单')
    await waitForStatus(page.request, 'sales-return', salesReturn.id, '草稿')
    await spaGoto(page, '/sales-return')
    await searchList(page, salesReturn.no)
    await expect(gridRow(page, salesReturn.no)).toContainText('草稿', {
      timeout: 30_000,
    })

    // 3. 打开退货单编辑器保存并审核。
    await auditRecordFromList(page, 'sales-return', salesReturn.no)
    await waitForStatus(page.request, 'sales-return', salesReturn.id, '已审核')
    await spaGoto(page, '/sales-return')
    await searchList(page, salesReturn.no)
    await expect(gridRow(page, salesReturn.no)).toContainText('已审核', {
      timeout: 30_000,
    })

    await assertNoFatalUiErrors()
  })
})
