import { expect } from '@playwright/test'
import {
  auditRecordFromList,
  buildRemark,
  createPurchaseInboundFromOrder,
  createPurchaseOrderDraft,
  findByField,
  gridRow,
  searchList,
  spaGoto,
  waitForStatus,
} from './ops-chain-harness'
import { loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

test.describe('采购真实业务链', () => {
  test.describe.configure({ retries: 2 })

  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('采购订单新建→审核→采购入库→订单完成采购', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    test.setTimeout(240_000)
    const remark = buildRemark('PO')

    // 1. 新建采购订单（选供应商/商品/仓库 + 数量单价），保存为草稿。
    const order = await createPurchaseOrderDraft(page, {
      remark,
      quantity: 5,
      unitPrice: 100,
    })
    expect(order.no).toMatch(/^\d{15,20}$/)
    expect(order.status).toBe('草稿')
    await waitForStatus(page.request, 'purchase-order', order.id, '草稿')

    await searchList(page, order.no)
    await expect(gridRow(page, order.no)).toContainText('草稿', {
      timeout: 30_000,
    })

    // 2. 审核采购订单 → 已审核。
    await auditRecordFromList(page, 'purchase-order', order.no)
    await waitForStatus(page.request, 'purchase-order', order.id, '已审核')
    await searchList(page, order.no)
    await expect(gridRow(page, order.no)).toContainText('已审核', {
      timeout: 30_000,
    })

    // 3. 从采购订单新建采购入库并审核（全量入库自动完成入库）。
    await createPurchaseInboundFromOrder(page, order.no, buildRemark('PO-IN'))

    const inbound = await findByField(
      page.request,
      'purchase-inbound',
      'purchaseOrderNo',
      order.no,
      'inboundNo',
    )
    expect(inbound, '应能按来源采购订单号检索到采购入库').not.toBeNull()
    await waitForStatus(
      page.request,
      'purchase-inbound',
      (inbound as { id: string }).id,
      '完成入库',
    )

    // 4. 全量入库后采购订单自动进入完成采购。
    await waitForStatus(page.request, 'purchase-order', order.id, '完成采购')
    await spaGoto(page, '/purchase-order')
    await searchList(page, order.no)
    await expect(gridRow(page, order.no)).toContainText('完成采购', {
      timeout: 30_000,
    })

    // 5. 采购入库列表可见且状态为完成入库。
    await spaGoto(page, '/purchase-inbound')
    await searchList(page, (inbound as { no: string }).no)
    await expect(gridRow(page, (inbound as { no: string }).no)).toContainText(
      '完成入库',
      { timeout: 30_000 },
    )

    await assertNoFatalUiErrors()
  })
})
