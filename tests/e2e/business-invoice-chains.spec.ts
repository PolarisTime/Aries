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
  isoNextDay,
  isoToday,
  loginAsTest9,
  openCreateOverlay,
  saveOverlay,
  selectAntOption,
  setSpinbuttonValue,
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

async function createSalesOrder(
  page: Page,
  expectedOrderNo: string,
  sourcePurchaseOrderNo: string,
) {
  const deliveryDate = isoNextDay()
  let orderNo = expectedOrderNo
  await page.goto('/sales-order')
  const overlay = await openCreateOverlay(page)
  orderNo = await fillOrReadFormField(formField(overlay, 'orderNo'), orderNo)
  await selectAntOption(
    formField(overlay, 'customerName'),
    '浙江大东吴杭萧绿建科技有限公司',
  )
  await selectAntOption(
    formField(overlay, 'projectName'),
    '恒力(大连)船厂有限公司-绿色高端装备制造项目6#曲面分段车间',
  )
  await fillDateInput(formField(overlay, 'deliveryDate'), deliveryDate)
  await importParentByKeyword(
    page,
    overlay,
    '导入采购订单明细',
    sourcePurchaseOrderNo,
  )
  const row = await waitForFirstDetailRow(overlay)
  await setSpinbuttonValue(row.locator('input[role="spinbutton"]').nth(0), '6')
  await setSpinbuttonValue(
    row.locator('input[role="spinbutton"]').nth(1),
    '3600',
  )
  await saveOverlay(page, overlay, orderNo)
  return { deliveryDate, orderNo }
}

test('creates invoice receipt from imported purchase order items', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  let purchaseOrderNo = `PO-IR-${suffix}`
  let receiveNo = `SP-${suffix}`
  let invoiceNo = `INV-R-${suffix}`

  const purchaseOrder = await createPurchaseOrder(page, purchaseOrderNo)
  const { orderDate } = purchaseOrder
  purchaseOrderNo = purchaseOrder.orderNo

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

  const detailRows = overlay.locator(
    '.module-detail-table tbody tr:not(.ant-table-measure-row)',
  )
  await expect(detailRows).toHaveCount(1)

  const amountInput = overlay.getByRole('spinbutton', { name: '* 金额' })
  await expect
    .poll(async () => Number((await amountInput.inputValue()) || '0'), {
      timeout: 10_000,
      intervals: [200, 500, 1000],
    })
    .toBeGreaterThan(0)
  const draftAmount = Number((await amountInput.inputValue()) || '0')

  await saveOverlay(page, overlay, receiveNo)

  const token = await getCurrentAccessToken(page)
  const fetchInvoiceReceiptId = async () => {
    const searchRes = await page.request.get(
      e2eApiUrl(
        'invoice-receipt',
        `search?keyword=${encodeURIComponent(receiveNo)}&limit=5`,
      ),
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const searchJson = (await searchRes.json()) as {
      code: number
      data?: Array<{ id?: string | number }>
    }
    expect(searchJson.code).toBe(0)
    return String(searchJson.data?.[0]?.id || '')
  }
  await expect
    .poll(fetchInvoiceReceiptId, {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe('')
  const invoiceReceiptId = await fetchInvoiceReceiptId()

  const detailRes = await page.request.get(
    e2eApiUrl('invoice-receipt', invoiceReceiptId),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const detailJson = (await detailRes.json()) as {
    code: number
    data?: {
      receiveNo?: string
      invoiceNo?: string
      sourcePurchaseOrderNos?: string
      supplierName?: string
      amount?: number
      status?: string
      items?: Array<{
        sourceNo?: string
        sourcePurchaseOrderItemId?: string | number
        materialCode?: string
        amount?: number
      }>
    }
  }
  expect(detailJson.code).toBe(0)
  expect(String(detailJson.data?.receiveNo || '')).toBe(receiveNo)
  expect(String(detailJson.data?.invoiceNo || '')).toBe(invoiceNo)
  expect(String(detailJson.data?.sourcePurchaseOrderNos || '')).toContain(
    purchaseOrderNo,
  )
  expect(String(detailJson.data?.supplierName || '')).toBe(
    '益海（浙江）物联网科技有限公司',
  )
  expect(Number(detailJson.data?.amount || 0)).toBe(draftAmount)
  expect(String(detailJson.data?.status || '')).toBe('已收票')
  expect(detailJson.data?.items?.length || 0).toBeGreaterThan(0)
  expect(String(detailJson.data?.items?.[0]?.sourceNo || '')).toBe(
    purchaseOrderNo,
  )
  expect(String(detailJson.data?.items?.[0]?.materialCode || '')).toBe(
    'HZ-YG-PL8',
  )
  expect(
    String(detailJson.data?.items?.[0]?.sourcePurchaseOrderItemId || ''),
  ).toBeTruthy()
  expect(Number(detailJson.data?.items?.[0]?.amount || 0)).toBeGreaterThan(0)

  await assertNoFatalUiErrors()
})

test('creates invoice issue from imported sales order items', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  let purchaseOrderNo = `PO-II-${suffix}`
  let salesOrderNo = `SO-II-${suffix}`
  let issueNo = `KP-${suffix}`
  let invoiceNo = `INV-I-${suffix}`

  const purchaseOrder = await createPurchaseOrder(page, purchaseOrderNo)
  purchaseOrderNo = purchaseOrder.orderNo
  const salesOrder = await createSalesOrder(page, salesOrderNo, purchaseOrderNo)
  const { deliveryDate } = salesOrder
  salesOrderNo = salesOrder.orderNo

  await page.goto('/invoice-issue')
  const overlay = await openCreateOverlay(page)
  issueNo = await fillOrReadFormField(formField(overlay, 'issueNo'), issueNo)
  invoiceNo = await fillOrReadFormField(
    formField(overlay, 'invoiceNo'),
    invoiceNo,
  )
  await selectAntOption(
    formField(overlay, 'customerName'),
    '浙江大东吴杭萧绿建科技有限公司',
  )
  await formField(overlay, 'projectName').fill(
    '恒力(大连)船厂有限公司-绿色高端装备制造项目6#曲面分段车间',
  )
  await fillDateInput(formField(overlay, 'invoiceDate'), deliveryDate)
  await selectAntOption(formField(overlay, 'invoiceType'), '增值税专票')
  await selectAntOption(formField(overlay, 'status'), '已开票')
  await formField(overlay, 'operatorName').fill('test9')
  await importParentByKeyword(page, overlay, '导入销售订单明细', salesOrderNo)

  const detailRows = overlay.locator(
    '.module-detail-table tbody tr:not(.ant-table-measure-row)',
  )
  await expect(detailRows).toHaveCount(1)

  const amountInput = overlay.getByRole('spinbutton', { name: '* 金额' })
  await expect
    .poll(async () => Number((await amountInput.inputValue()) || '0'), {
      timeout: 10_000,
      intervals: [200, 500, 1000],
    })
    .toBeGreaterThan(0)
  const draftAmount = Number((await amountInput.inputValue()) || '0')

  await saveOverlay(page, overlay, issueNo)

  const token = await getCurrentAccessToken(page)
  const fetchInvoiceIssueId = async () => {
    const searchRes = await page.request.get(
      e2eApiUrl(
        'invoice-issue',
        `search?keyword=${encodeURIComponent(issueNo)}&limit=5`,
      ),
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const searchJson = (await searchRes.json()) as {
      code: number
      data?: Array<{ id?: string | number }>
    }
    expect(searchJson.code).toBe(0)
    return String(searchJson.data?.[0]?.id || '')
  }
  await expect
    .poll(fetchInvoiceIssueId, {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe('')
  const invoiceIssueId = await fetchInvoiceIssueId()

  const detailRes = await page.request.get(
    e2eApiUrl('invoice-issue', invoiceIssueId),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const detailJson = (await detailRes.json()) as {
    code: number
    data?: {
      issueNo?: string
      invoiceNo?: string
      sourceSalesOrderNos?: string
      customerName?: string
      projectName?: string
      amount?: number
      status?: string
      items?: Array<{
        sourceNo?: string
        sourceSalesOrderItemId?: string | number
        materialCode?: string
        amount?: number
      }>
    }
  }
  expect(detailJson.code).toBe(0)
  expect(String(detailJson.data?.issueNo || '')).toBe(issueNo)
  expect(String(detailJson.data?.invoiceNo || '')).toBe(invoiceNo)
  expect(String(detailJson.data?.sourceSalesOrderNos || '')).toContain(
    salesOrderNo,
  )
  expect(String(detailJson.data?.customerName || '')).toBe(
    '浙江大东吴杭萧绿建科技有限公司',
  )
  expect(String(detailJson.data?.projectName || '')).toContain('恒力')
  expect(Number(detailJson.data?.amount || 0)).toBe(draftAmount)
  expect(String(detailJson.data?.status || '')).toBe('已开票')
  expect(detailJson.data?.items?.length || 0).toBeGreaterThan(0)
  expect(String(detailJson.data?.items?.[0]?.sourceNo || '')).toBe(salesOrderNo)
  expect(String(detailJson.data?.items?.[0]?.materialCode || '')).toBe(
    'HZ-YG-PL8',
  )
  expect(
    String(detailJson.data?.items?.[0]?.sourceSalesOrderItemId || ''),
  ).toBeTruthy()
  expect(Number(detailJson.data?.items?.[0]?.amount || 0)).toBeGreaterThan(0)

  await assertNoFatalUiErrors()
})
