import { expect, test } from './support/test'
import {
  API_BASE_URL,
  buildSuffix,
  fillDateInput,
  getCurrentAccessToken,
  importParentByKeyword,
  isoNextDay,
  isoToday,
  loginAsTest9,
  openCreateOverlay,
  saveAndAuditOverlay,
  saveOverlay,
  selectAntOption,
  setSpinbuttonValue,
  waitForFirstDetailRow,
} from './support/business-e2e'

async function createPurchaseOrder(page: Parameters<typeof test>[0]['page'], orderNo: string) {
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
  await selectAntOption(row.locator('td').nth(10).locator('.ant-select'), '升华物流')
  await row.locator('td').nth(12).locator('input').fill('10')
  await row.locator('td').nth(16).locator('input').fill('3200')
  await saveOverlay(page, overlay, orderNo)
  return { orderDate }
}

async function createSalesOrder(
  page: Parameters<typeof test>[0]['page'],
  orderNo: string,
  sourcePurchaseOrderNo: string,
) {
  const deliveryDate = isoNextDay()
  await page.goto('/sales-order')
  const overlay = await openCreateOverlay(page)
  await overlay.locator('#orderNo').fill(orderNo)
  await selectAntOption(
    overlay.locator('#customerName'),
    '浙江大东吴杭萧绿建科技有限公司',
  )
  await selectAntOption(
    overlay.locator('#projectName'),
    '恒力(大连)船厂有限公司-绿色高端装备制造项目6#曲面分段车间',
  )
  await fillDateInput(overlay.locator('#deliveryDate'), deliveryDate)
  await importParentByKeyword(page, overlay, '导入采购订单明细', sourcePurchaseOrderNo)
  const row = await waitForFirstDetailRow(overlay)
  await setSpinbuttonValue(row.locator('input[role="spinbutton"]').nth(0), '6')
  await setSpinbuttonValue(row.locator('input[role="spinbutton"]').nth(1), '3600')
  await saveOverlay(page, overlay, orderNo)
  return { deliveryDate }
}

test('creates invoice receipt from imported purchase order items', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsTest9(page)

  const suffix = buildSuffix()
  const purchaseOrderNo = `PO-IR-${suffix}`
  const receiveNo = `SP-${suffix}`
  const invoiceNo = `INV-R-${suffix}`

  const { orderDate } = await createPurchaseOrder(page, purchaseOrderNo)

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
  await importParentByKeyword(page, overlay, '导入采购订单明细', purchaseOrderNo)

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
      `${API_BASE_URL}/invoice-receipt/search?keyword=${encodeURIComponent(receiveNo)}&limit=5`,
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
    `${API_BASE_URL}/invoice-receipt/${invoiceReceiptId}`,
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
  expect(String(detailJson.data?.sourcePurchaseOrderNos || '')).toContain(purchaseOrderNo)
  expect(String(detailJson.data?.supplierName || '')).toBe(
    '益海（浙江）物联网科技有限公司',
  )
  expect(Number(detailJson.data?.amount || 0)).toBe(draftAmount)
  expect(String(detailJson.data?.status || '')).toBe('已收票')
  expect(detailJson.data?.items?.length || 0).toBeGreaterThan(0)
  expect(String(detailJson.data?.items?.[0]?.sourceNo || '')).toBe(purchaseOrderNo)
  expect(String(detailJson.data?.items?.[0]?.materialCode || '')).toBe('HZ-YG-PL8')
  expect(String(detailJson.data?.items?.[0]?.sourcePurchaseOrderItemId || '')).toBeTruthy()
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
  const purchaseOrderNo = `PO-II-${suffix}`
  const salesOrderNo = `SO-II-${suffix}`
  const issueNo = `KP-${suffix}`
  const invoiceNo = `INV-I-${suffix}`

  await createPurchaseOrder(page, purchaseOrderNo)
  const { deliveryDate } = await createSalesOrder(page, salesOrderNo, purchaseOrderNo)

  await page.goto('/invoice-issue')
  const overlay = await openCreateOverlay(page)
  await overlay.locator('#issueNo').fill(issueNo)
  await overlay.locator('#invoiceNo').fill(invoiceNo)
  await selectAntOption(
    overlay.locator('#customerName'),
    '浙江大东吴杭萧绿建科技有限公司',
  )
  await overlay
    .locator('#projectName')
    .fill('恒力(大连)船厂有限公司-绿色高端装备制造项目6#曲面分段车间')
  await fillDateInput(overlay.locator('#invoiceDate'), deliveryDate)
  await selectAntOption(overlay.locator('#invoiceType'), '增值税专票')
  await selectAntOption(overlay.locator('#status'), '已开票')
  await overlay.locator('#operatorName').fill('test9')
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
      `${API_BASE_URL}/invoice-issue/search?keyword=${encodeURIComponent(issueNo)}&limit=5`,
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
    `${API_BASE_URL}/invoice-issue/${invoiceIssueId}`,
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
  expect(String(detailJson.data?.sourceSalesOrderNos || '')).toContain(salesOrderNo)
  expect(String(detailJson.data?.customerName || '')).toBe(
    '浙江大东吴杭萧绿建科技有限公司',
  )
  expect(String(detailJson.data?.projectName || '')).toContain('恒力')
  expect(Number(detailJson.data?.amount || 0)).toBe(draftAmount)
  expect(String(detailJson.data?.status || '')).toBe('已开票')
  expect(detailJson.data?.items?.length || 0).toBeGreaterThan(0)
  expect(String(detailJson.data?.items?.[0]?.sourceNo || '')).toBe(salesOrderNo)
  expect(String(detailJson.data?.items?.[0]?.materialCode || '')).toBe('HZ-YG-PL8')
  expect(String(detailJson.data?.items?.[0]?.sourceSalesOrderItemId || '')).toBeTruthy()
  expect(Number(detailJson.data?.items?.[0]?.amount || 0)).toBeGreaterThan(0)

  await assertNoFatalUiErrors()
})
