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
  loginAsE2eUser,
  openCreateOverlay,
  saveAndAuditOverlay,
  saveOverlay,
  selectAntOption,
  waitForFirstDetailRow,
} from './support/business-e2e'
import { E2E_LOGIN_NAME } from './support/e2e-credentials'
import { expect, test } from './support/test'

async function createPurchaseOrder(page: Page, expectedOrderNo: string) {
  const orderDate = isoToday()
  let orderNo = expectedOrderNo
  await page.goto('/purchase-order')
  const overlay = await openCreateOverlay(page)
  const supplierField = formField(overlay, 'supplierId')
  const supplierName = await selectAntOption(supplierField)
  expect(supplierName, '采购订单未选中供应商').toBeTruthy()
  orderNo = await fillOrReadFormField(formField(overlay, 'orderNo'), orderNo)
  await fillDateInput(formField(overlay, 'orderDate'), orderDate)
  const row = await waitForFirstDetailRow(overlay)
  const token = await getCurrentAccessToken(page)
  const materialResponse = await page.request.get(
    e2eApiUrl(
      'material',
      `search?keyword=${encodeURIComponent('盘螺')}&limit=100`,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  expect(materialResponse.ok()).toBeTruthy()
  const materialPayload = (await materialResponse.json()) as {
    code: number
    data?: Array<{
      materialCode?: string
      pieceWeightTon?: number
    }>
  }
  expect(materialPayload.code).toBe(0)
  const material = materialPayload.data?.find(
    (item) =>
      String(item.materialCode || '').trim() &&
      Number(item.pieceWeightTon || 0) > 0,
  )
  expect(material, '隔离库没有带件重的盘螺商品').toBeTruthy()
  await fillPurchaseOrderLineItem(row, {
    materialCode: String(material?.materialCode || '').trim(),
  })
  await saveAndAuditOverlay(page, overlay, orderNo)
  return { orderDate, orderNo, supplierName }
}

async function completeInvoiceReceipt(page: Page, invoiceNo: string) {
  const token = await getCurrentAccessToken(page)
  const searchResponse = await page.request.get(
    e2eApiUrl(
      'invoice-receipt',
      `search?keyword=${encodeURIComponent(invoiceNo)}&limit=5`,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  expect(searchResponse.ok()).toBeTruthy()
  const searchPayload = (await searchResponse.json()) as {
    code: number
    data?: Array<{ id?: string | number; invoiceNo?: string }>
  }
  expect(searchPayload.code).toBe(0)
  const receipt = searchPayload.data?.find(
    (record) => String(record.invoiceNo || '') === invoiceNo,
  )
  const receiptId = String(receipt?.id || '')
  expect(receiptId, `未找到收票单 ${invoiceNo}`).toBeTruthy()

  const statusResponse = await page.request.patch(
    e2eApiUrl('invoice-receipt', `${receiptId}/status`),
    {
      data: { status: '已收票' },
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  expect(statusResponse.ok()).toBeTruthy()
  const statusPayload = (await statusResponse.json()) as {
    code: number
    data?: { status?: string }
  }
  expect(statusPayload.code).toBe(0)
  expect(String(statusPayload.data?.status || '')).toBe('已收票')
}

test('pending invoice receipt report shrinks after invoice receipt is created', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsE2eUser(page)

  const suffix = buildSuffix()
  let purchaseOrderNo = `PO-PIR-${suffix}`
  const invoiceNo = `INV-PIR-${suffix}`

  const purchaseOrder = await createPurchaseOrder(page, purchaseOrderNo)
  const { orderDate, supplierName } = purchaseOrder
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
      data?: {
        records?: Array<Record<string, unknown>>
        content?: Array<Record<string, unknown>>
      }
    }
    expect(json.code).toBe(0)
    const records = json.data?.records || json.data?.content || []
    return records.filter((row) =>
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
  await fillOrReadFormField(formField(overlay, 'invoiceNo'), invoiceNo)
  await selectAntOption(formField(overlay, 'supplierId'), supplierName)
  await formField(overlay, 'invoiceTitle').fill(supplierName)
  await fillDateInput(formField(overlay, 'invoiceDate'), orderDate)
  await selectAntOption(formField(overlay, 'invoiceType'), '增值税专票')
  await formField(overlay, 'operatorName').fill(E2E_LOGIN_NAME)
  await importParentByKeyword(
    page,
    overlay,
    '导入采购订单明细',
    purchaseOrderNo,
  )
  await saveOverlay(page, overlay, invoiceNo)
  await completeInvoiceReceipt(page, invoiceNo)

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
