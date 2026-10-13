import { expect } from '@playwright/test'
import {
  expectModuleHeading,
  firstDataRow,
  gotoRoute,
  loginAsE2eUser,
  moduleKeywordInput,
  openFirstRowEditor,
} from './support/business-e2e'
import { test } from './support/test'

/**
 * 交付核定状态下的可编辑字段端到端回归。
 *
 * <p>业务要求：交付核定单据允许调整送货日期、报单日期（取价基准 ORDER 的锚点）与备注，
 * 其余字段仍锁定。此前报单日期不在白名单里，交付核定下无法修改。</p>
 */

/** 开发库中处于交付核定状态、且落在列表默认时间窗内的销售订单。 */
const DELIVERY_VERIFICATION_ORDER_NO = '358756731158790144'

test.describe('销售订单 交付核定可编辑字段', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('报单日期可编辑, 客户等字段仍锁定', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/sales-order')
    await expectModuleHeading(page, '销售订单')

    const keywordInput = moduleKeywordInput(page)
    await keywordInput.fill(DELIVERY_VERIFICATION_ORDER_NO)
    await keywordInput.press('Enter')
    await expect(await firstDataRow(page)).not.toBeNull()

    const overlay = await openFirstRowEditor(page)
    expect(overlay).not.toBeNull()

    const formItem = (label: string) =>
      overlay!.locator('.ant-form-item').filter({ hasText: label }).first()

    const orderDateItem = formItem('报单日期')
    await expect(orderDateItem).toBeVisible({ timeout: 15_000 })
    await expect(orderDateItem.locator('input').first()).toBeEnabled()

    // 白名单之外的字段必须仍然锁定：客户下拉呈禁用态。
    const customerItem = formItem('客户名称')
    await expect(customerItem.locator('.ant-select-disabled')).toHaveCount(1)

    await assertNoFatalUiErrors()
  })
})
