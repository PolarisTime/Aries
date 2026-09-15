import { expect } from '@playwright/test'
import {
  auditRecordFromList,
  buildRemark,
  confirmDeliveryVerification,
  createCompletedPurchaseOrder,
  createSalesOrderDraft,
  createSalesOutboundFromOrder,
  gridRow,
  openRowEditor,
  readStatus,
  searchList,
  spaGoto,
  waitForStatus,
} from './ops-chain-harness'
import { loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

test.describe('销售真实业务链', () => {
  // 共享账号并发会话上限为 3，其他测试进程登录可能驱逐当前会话；失败时重试整条链。
  test.describe.configure({ retries: 2 })

  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('销售订单→部分出库→补足出库→交付核定→完成销售', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    test.setTimeout(480_000)

    // 前置：真实 UI 走完采购链，取得“完成采购”的采购订单作为销售来源。
    const purchaseOrder = await createCompletedPurchaseOrder(
      page,
      buildRemark('SALES-PO'),
    )
    expect(purchaseOrder.status).toBe('完成采购')

    // 1. 新建销售订单（选客户/项目/交货日期，导入采购订单明细），保存为草稿。
    const salesOrder = await createSalesOrderDraft(
      page,
      purchaseOrder.no,
      buildRemark('SO'),
    )
    expect(salesOrder.no).toMatch(/^\d{15,20}$/)
    expect(salesOrder.status).toBe('草稿')
    await searchList(page, salesOrder.no)
    await expect(gridRow(page, salesOrder.no)).toContainText('草稿', {
      timeout: 30_000,
    })

    // 2. 审核销售订单 → 已审核。
    await auditRecordFromList(page, 'sales-order', salesOrder.no)
    await waitForStatus(page.request, 'sales-order', salesOrder.id, '已审核')

    // 3. 部分出库（2/5）：出库审核后销售订单仍应为已审核，不进入交付核定。
    await createSalesOutboundFromOrder(
      page,
      salesOrder.no,
      buildRemark('SO-OUT-1'),
      2,
    )
    await expect
      .poll(() => readStatus(page.request, 'sales-order', salesOrder.id), {
        timeout: 20_000,
      })
      .toBe('已审核')

    // 4. 补足剩余出库（3/5）：出库审核后销售订单进入交付核定。
    await createSalesOutboundFromOrder(
      page,
      salesOrder.no,
      buildRemark('SO-OUT-2'),
      3,
    )
    await waitForStatus(page.request, 'sales-order', salesOrder.id, '交付核定')
    await spaGoto(page, '/sales-order')
    await searchList(page, salesOrder.no)
    await expect(gridRow(page, salesOrder.no)).toContainText('交付核定', {
      timeout: 30_000,
    })

    // 5. 交付核定编辑器确认核定 → 完成销售。
    const overlay = await openRowEditor(page, salesOrder.no)
    await confirmDeliveryVerification(page, overlay)
    await waitForStatus(page.request, 'sales-order', salesOrder.id, '完成销售')
    await searchList(page, salesOrder.no)
    await expect(gridRow(page, salesOrder.no)).toContainText('完成销售', {
      timeout: 30_000,
    })

    await assertNoFatalUiErrors()
  })
})
