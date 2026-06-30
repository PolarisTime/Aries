import type { Page } from '@playwright/test'
import {
  buildSuffix,
  e2eApiUrl,
  fillDateInput,
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

async function createPurchaseOrder(page: Page, orderNo: string) {
  const orderDate = isoToday()
  await page.goto('/purchase-order')
  const overlay = await openCreateOverlay(page)
  await selectAntOption(
    overlay.locator('#supplierName'),
    '益海（浙江）物联网科技有限公司',
  )
  await overlay.locator('#orderNo').fill(orderNo)
  await fillDateInput(overlay.locator('#orderDate'), orderDate)
  const row = await waitForFirstDetailRow(overlay)
  await row.locator('td').nth(3).locator('input').fill('HZ-YG-PL8')
  await page.waitForTimeout(1200)
  await selectAntOption(
    row.locator('td').nth(10).locator('.ant-select'),
    '升华物流',
  )
  await row.locator('td').nth(12).locator('input').fill('10')
  await row.locator('td').nth(16).locator('input').fill('3200')
  await saveOverlay(page, overlay, orderNo)
  return { orderDate }
}

test('pending invoice receipt report shrinks after invoice receipt is created', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  const purchaseOrderNo = `PO-PIR-${suffix}`
  const receiveNo = `SP-PIR-${suffix}`
  const invoiceNo = `INV-PIR-${suffix}`

  const { orderDate } = await createPurchaseOrder(page, purchaseOrderNo)

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
  await overlay.locator('#receiveNo').fill(receiveNo)
  await overlay.locator('#invoiceNo').fill(invoiceNo)
  await selectAntOption(
    overlay.locator('#supplierName'),
    '益海（浙江）物联网科技有限公司',
  )
  await overlay.locator('#invoiceTitle').fill('益海（浙江）物联网科技有限公司')
  await fillDateInput(overlay.locator('#invoiceDate'), orderDate)
  await selectAntOption(overlay.locator('#invoiceType'), '增值税专票')
  await selectAntOption(overlay.locator('#status'), '已收票')
  await overlay.locator('#operatorName').fill('test9')
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
