import type { Page } from '@playwright/test'
import {
  buildSuffix,
  e2eApiUrl,
  fillDateInput,
  fillOrReadFormField,
  fillPurchaseOrderLineItem,
  formField,
  getCurrentAccessToken,
  importParentByKeyword,
  isoToday,
  loginAsTest9,
  openCreateOverlay,
  saveOverlay,
  selectAntOption,
  waitForFirstDetailRow,
} from './support/business-e2e'
import { expect, test } from './support/test'

async function createPurchaseOrder(page: Page, expectedOrderNo: string) {
  const orderDate = isoToday()
  let orderNo = expectedOrderNo
  await page.goto('/purchase-order')
  const overlay = await openCreateOverlay(page)
  await selectAntOption(
    formField(overlay, 'supplierName'),
    '益海（浙江）物联网科技有限公司',
  )
  orderNo = await fillOrReadFormField(formField(overlay, 'orderNo'), orderNo)
  await fillDateInput(formField(overlay, 'orderDate'), orderDate)
  const row = await waitForFirstDetailRow(overlay)
  await fillPurchaseOrderLineItem(row)
  await saveOverlay(page, overlay, orderNo)
  return { orderDate, orderNo }
}

test('pending invoice receipt report shrinks after invoice receipt is created', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  let purchaseOrderNo = `PO-PIR-${suffix}`
  let receiveNo = `SP-PIR-${suffix}`
  let invoiceNo = `INV-PIR-${suffix}`

  const purchaseOrder = await createPurchaseOrder(page, purchaseOrderNo)
  const { orderDate } = purchaseOrder
  purchaseOrderNo = purchaseOrder.orderNo

  const fetchPendingRows = async () => {
    const token = await getCurrentAccessToken(page)
    const response = await page.request.get(
      e2eApiUrl('pending-invoice-receipt-report'),
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          keyword: purchaseOrderNo,
          page: 0,
          size: 20,
          sortBy: 'orderNo',
          sortDirection: 'asc',
        },
      },
    )
    const json = (await response.json()) as {
      code: number
      data?: { records?: Array<Record<string, unknown>> }
    }
    expect(json.code).toBe(0)
    return (json.data?.records || []).filter((row) =>
      String(row.orderNo || '').includes(purchaseOrderNo),
    )
  }

  await expect
    .poll(async () => (await fetchPendingRows()).length, {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .toBeGreaterThan(0)

  const pendingBefore = await fetchPendingRows()
  const pendingBeforeRow = pendingBefore[0] || {}
  const pendingBeforeAmount = Number(pendingBeforeRow.pendingInvoiceAmount || 0)
  const pendingBeforeWeight = Number(
    pendingBeforeRow.pendingInvoiceWeightTon || 0,
  )
  expect(pendingBeforeAmount).toBeGreaterThan(0)
  expect(pendingBeforeWeight).toBeGreaterThan(0)

  await page.goto('/invoice-receipt')
  const overlay = await openCreateOverlay(page)
  receiveNo = await fillOrReadFormField(
    formField(overlay, 'receiveNo'),
    receiveNo,
  )
  invoiceNo = await fillOrReadFormField(
    formField(overlay, 'invoiceNo'),
    invoiceNo,
  )
  await selectAntOption(
    formField(overlay, 'supplierName'),
    '益海（浙江）物联网科技有限公司',
  )
  await formField(overlay, 'invoiceTitle').fill(
    '益海（浙江）物联网科技有限公司',
  )
  await fillDateInput(formField(overlay, 'invoiceDate'), orderDate)
  await selectAntOption(formField(overlay, 'invoiceType'), '增值税专票')
  await selectAntOption(formField(overlay, 'status'), '已收票')
  await formField(overlay, 'operatorName').fill('test9')
  await importParentByKeyword(
    page,
    overlay,
    '导入采购订单明细',
    purchaseOrderNo,
  )
  await saveOverlay(page, overlay, receiveNo)

  await expect
    .poll(async () => (await fetchPendingRows()).length, {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .toBe(0)

  const pendingAfter = await fetchPendingRows()
  expect(pendingAfter).toHaveLength(0)

  await page.goto('/pending-invoice-receipt-report')
  const keywordInput = page.getByPlaceholder(
    '采购单号 / 供应商 / 商品编码 / 规格',
  )
  await keywordInput.fill(purchaseOrderNo)
  await keywordInput.press('Enter')
  const row = page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: purchaseOrderNo })
    .first()
  await expect(row).toHaveCount(0)

  await assertNoFatalUiErrors()
})
