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
  loginAsE2eUser,
  openCreateOverlay,
  saveAndAuditOverlay,
  saveOverlay,
  selectAntOption,
  setSpinbuttonValue,
  waitForFirstDetailRow,
} from './support/business-e2e'
import { E2E_LOGIN_NAME } from './support/e2e-credentials'
import { expect, test } from './support/test'

type ReadOnlyOption = Record<string, unknown>
type SalesParties = {
  customerId: string
  customerName: string
  projectId: string
  projectName: string
}

async function fetchReadOnlyOptions(
  page: Page,
  apiPath: string,
  suffix = 'options',
) {
  const token = await getCurrentAccessToken(page)
  const response = await page.request.get(e2eApiUrl(apiPath, suffix), {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as {
    code: number
    data?: ReadOnlyOption[]
  }
  expect(payload.code).toBe(0)
  if (!Array.isArray(payload.data)) {
    throw new Error(`只读选项接口未返回数组: ${apiPath}`)
  }
  return payload.data
}

async function resolveTestSupplierName(page: Page) {
  const options = await fetchReadOnlyOptions(page, 'supplier')
  const supplierName = options
    .map((option) => String(option.supplierName || '').trim())
    .find(Boolean)
  if (!supplierName) {
    throw new Error('隔离库未找到可用供应商')
  }
  return supplierName
}

async function resolveTestSalesParties(page: Page) {
  const customerOptions = await fetchReadOnlyOptions(page, 'customer')
  for (const customer of customerOptions) {
    const customerId = String(customer.id || '').trim()
    const customerName = String(customer.customerName || '').trim()
    if (!customerId || !customerName) {
      continue
    }

    const projectOptions = await fetchReadOnlyOptions(
      page,
      'projects',
      `options?customerId=${encodeURIComponent(customerId)}`,
    )
    const project = projectOptions.find(
      (candidate) =>
        String(candidate.id || '').trim() &&
        String(candidate.projectName || '').trim(),
    )
    if (project) {
      return {
        customerId,
        customerName,
        projectId: String(project.id).trim(),
        projectName: String(project.projectName).trim(),
      } satisfies SalesParties
    }
  }

  throw new Error('隔离库未找到带有效项目的客户')
}

async function resolveTestMaterial(page: Page) {
  const token = await getCurrentAccessToken(page)
  const response = await page.request.get(
    e2eApiUrl(
      'material',
      `search?keyword=${encodeURIComponent('盘螺')}&limit=500`,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as {
    code: number
    data?: Array<{
      category?: unknown
      materialCode?: unknown
    }>
  }
  expect(payload.code).toBe(0)

  const material = payload.data?.find(
    (record) =>
      String(record.category || '').trim() === '盘螺' &&
      String(record.materialCode || '').trim() !== '',
  )
  if (!material) {
    throw new Error('隔离库未找到可用的盘螺商品')
  }

  return String(material.materialCode).trim()
}

async function fetchRecordIdByKeyword(
  page: Page,
  apiPath: string,
  keyword: string,
) {
  const token = await getCurrentAccessToken(page)
  const response = await page.request.get(
    e2eApiUrl(apiPath, `search?keyword=${encodeURIComponent(keyword)}&limit=5`),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  expect(response.ok()).toBeTruthy()
  const payload = (await response.json()) as {
    code: number
    data?: Array<{ id?: string | number }>
  }
  expect(payload.code).toBe(0)
  const id = String(payload.data?.[0]?.id || '').trim()
  if (!id) {
    throw new Error(`未找到 ${apiPath} 单据: ${keyword}`)
  }
  return id
}

async function fetchRecordDetail(
  page: Page,
  apiPath: string,
  id: string,
): Promise<ReadOnlyOption> {
  const token = await getCurrentAccessToken(page)
  const response = await page.request.get(e2eApiUrl(apiPath, id), {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok()).toBeTruthy()
  const payload = (await response.json()) as {
    code: number
    data?: ReadOnlyOption
  }
  expect(payload.code).toBe(0)
  if (!payload.data) {
    throw new Error(`详情接口未返回数据: ${apiPath}/${id}`)
  }
  return payload.data
}

async function updateInvoiceStatus(
  page: Page,
  apiPath: 'invoice-receipt' | 'invoice-issue',
  id: string,
  status: string,
) {
  const token = await getCurrentAccessToken(page)
  const response = await page.request.patch(
    e2eApiUrl(apiPath, `${id}/status`),
    {
      data: { status },
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  expect(response.ok()).toBeTruthy()
  const payload = (await response.json()) as {
    code: number
    data?: { status?: string }
  }
  expect(payload.code).toBe(0)
  expect(String(payload.data?.status || '')).toBe(status)
}

async function createPurchaseOrder(
  page: Page,
  expectedOrderNo: string,
  materialCode: string,
  supplierName: string,
) {
  const orderDate = isoToday()
  let orderNo = expectedOrderNo
  await page.goto('/purchase-order')
  const overlay = await openCreateOverlay(page)
  await selectAntOption(formField(overlay, 'supplierId'), supplierName)
  orderNo = await fillOrReadFormField(formField(overlay, 'orderNo'), orderNo)
  await fillDateInput(formField(overlay, 'orderDate'), orderDate)
  const row = await waitForFirstDetailRow(overlay)
  await fillPurchaseOrderLineItem(row, { materialCode })
  await saveAndAuditOverlay(page, overlay, orderNo)
  return { orderDate, orderNo, supplierName }
}

async function createSalesOrder(
  page: Page,
  expectedOrderNo: string,
  sourcePurchaseOrderNo: string,
  parties: SalesParties,
) {
  const deliveryDate = isoNextDay()
  let orderNo = expectedOrderNo
  await page.goto('/sales-order')
  const overlay = await openCreateOverlay(page)
  orderNo = await fillOrReadFormField(formField(overlay, 'orderNo'), orderNo)
  await selectAntOption(formField(overlay, 'customerId'), parties.customerName)
  await selectAntOption(formField(overlay, 'projectId'), parties.projectName)
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
  await saveAndAuditOverlay(page, overlay, orderNo)
  return { deliveryDate, orderNo, ...parties }
}

test('creates invoice receipt from imported purchase order items', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsE2eUser(page)

  const suffix = buildSuffix()
  let purchaseOrderNo = `PO-IR-${suffix}`
  let receiveNo = `SP-${suffix}`
  let invoiceNo = `INV-R-${suffix}`

  const supplierName = await resolveTestSupplierName(page)
  const materialCode = await resolveTestMaterial(page)
  const purchaseOrder = await createPurchaseOrder(
    page,
    purchaseOrderNo,
    materialCode,
    supplierName,
  )
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

  await expect(formField(overlay, 'sourcePurchaseOrderNos')).toHaveValue(
    new RegExp(purchaseOrderNo),
  )
  const detailRow = overlay
    .locator('.module-detail-table tbody tr.ant-table-row')
    .filter({ hasText: purchaseOrderNo })
  await expect(detailRow).toHaveCount(1)

  const amountInput = overlay.getByRole('spinbutton', { name: '* 金额' })
  await expect
    .poll(async () => Number((await amountInput.inputValue()) || '0'), {
      timeout: 10_000,
      intervals: [200, 500, 1000],
    })
    .toBeGreaterThan(0)
  const draftAmount = Number((await amountInput.inputValue()) || '0')

  await saveOverlay(page, overlay, receiveNo)

  await expect
    .poll(() => fetchRecordIdByKeyword(page, 'invoice-receipt', receiveNo), {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe('')
  const invoiceReceiptId = await fetchRecordIdByKeyword(
    page,
    'invoice-receipt',
    receiveNo,
  )
  const draftDetail = await fetchRecordDetail(
    page,
    'invoice-receipt',
    invoiceReceiptId,
  )
  expect(String(draftDetail.receiveNo || '')).toBe(receiveNo)
  expect(String(draftDetail.invoiceNo || '')).toBe(invoiceNo)
  expect(String(draftDetail.supplierName || '')).toBe(supplierName)
  expect(Number(draftDetail.amount || 0)).toBe(draftAmount)
  expect(String(draftDetail.status || '')).toBe('草稿')
  const draftItems = Array.isArray(draftDetail.items) ? draftDetail.items : []
  expect(draftItems.length).toBeGreaterThan(0)
  expect(String(draftItems[0]?.sourceNo || '')).toBe(purchaseOrderNo)
  expect(String(draftItems[0]?.materialCode || '')).toBe(materialCode)
  expect(String(draftItems[0]?.sourcePurchaseOrderItemId || '')).toBeTruthy()
  expect(Number(draftItems[0]?.amount || 0)).toBeGreaterThan(0)

  await updateInvoiceStatus(page, 'invoice-receipt', invoiceReceiptId, '已收票')
  const detailJson = await fetchRecordDetail(
    page,
    'invoice-receipt',
    invoiceReceiptId,
  )
  expect(String(detailJson.status || '')).toBe('已收票')
  expect(Number(detailJson.amount || 0)).toBe(draftAmount)

  await assertNoFatalUiErrors()
})

test('creates invoice issue from imported sales order items', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsE2eUser(page)

  const suffix = buildSuffix()
  let purchaseOrderNo = `PO-II-${suffix}`
  let salesOrderNo = `SO-II-${suffix}`
  let issueNo = `KP-${suffix}`
  let invoiceNo = `INV-I-${suffix}`

  const supplierName = await resolveTestSupplierName(page)
  const salesParties = await resolveTestSalesParties(page)
  const materialCode = await resolveTestMaterial(page)
  const purchaseOrder = await createPurchaseOrder(
    page,
    purchaseOrderNo,
    materialCode,
    supplierName,
  )
  purchaseOrderNo = purchaseOrder.orderNo
  const salesOrder = await createSalesOrder(
    page,
    salesOrderNo,
    purchaseOrderNo,
    salesParties,
  )
  const { deliveryDate } = salesOrder
  salesOrderNo = salesOrder.orderNo

  const salesOrderId = await fetchRecordIdByKeyword(
    page,
    'sales-order',
    salesOrderNo,
  )
  const salesOrderDetail = await fetchRecordDetail(
    page,
    'sales-order',
    salesOrderId,
  )
  const sourceSalesOrderItems = Array.isArray(salesOrderDetail.items)
    ? salesOrderDetail.items
    : []
  const expectedImportedAmount = sourceSalesOrderItems.reduce(
    (total, item) => total + Number(item.amount || 0),
    0,
  )
  expect(expectedImportedAmount).toBeGreaterThan(0)

  await page.goto('/invoice-issue')
  const overlay = await openCreateOverlay(page)
  issueNo = await fillOrReadFormField(formField(overlay, 'issueNo'), issueNo)
  invoiceNo = await fillOrReadFormField(
    formField(overlay, 'invoiceNo'),
    invoiceNo,
  )
  await selectAntOption(
    formField(overlay, 'customerId'),
    salesParties.customerName,
  )
  await selectAntOption(
    formField(overlay, 'projectId'),
    salesParties.projectName,
  )
  await fillDateInput(formField(overlay, 'invoiceDate'), deliveryDate)
  await selectAntOption(formField(overlay, 'invoiceType'), '增值税专票')
  await formField(overlay, 'operatorName').fill(E2E_LOGIN_NAME)
  await importParentByKeyword(page, overlay, '导入销售订单明细', salesOrderNo)

  await expect(formField(overlay, 'sourceSalesOrderNos')).toHaveValue(
    new RegExp(salesOrderNo),
  )
  const detailRow = overlay
    .locator('.module-detail-table tbody tr.ant-table-row')
    .filter({ hasText: salesOrderNo })
  await expect(detailRow).toHaveCount(1)

  const amountInput = overlay.getByRole('spinbutton', { name: '* 金额' })
  await expect
    .poll(async () => Number((await amountInput.inputValue()) || '0'), {
      timeout: 10_000,
      intervals: [200, 500, 1000],
    })
    .toBeGreaterThan(0)
  const draftAmount = Number((await amountInput.inputValue()) || '0')
  expect(draftAmount).toBeCloseTo(expectedImportedAmount, 2)

  await saveOverlay(page, overlay, issueNo)

  await expect
    .poll(() => fetchRecordIdByKeyword(page, 'invoice-issue', issueNo), {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe('')
  const invoiceIssueId = await fetchRecordIdByKeyword(
    page,
    'invoice-issue',
    issueNo,
  )
  const draftDetail = await fetchRecordDetail(
    page,
    'invoice-issue',
    invoiceIssueId,
  )
  expect(String(draftDetail.issueNo || '')).toBe(issueNo)
  expect(String(draftDetail.invoiceNo || '')).toBe(invoiceNo)
  expect(String(draftDetail.customerId || '')).toBe(salesParties.customerId)
  expect(String(draftDetail.projectId || '')).toBe(salesParties.projectId)
  expect(String(draftDetail.customerName || '')).toBe(salesParties.customerName)
  expect(String(draftDetail.projectName || '')).toBe(salesParties.projectName)
  expect(Number(draftDetail.amount || 0)).toBeCloseTo(expectedImportedAmount, 2)
  expect(String(draftDetail.status || '')).toBe('草稿')
  const draftItems = Array.isArray(draftDetail.items) ? draftDetail.items : []
  expect(draftItems.length).toBeGreaterThan(0)
  expect(String(draftItems[0]?.sourceNo || '')).toBe(salesOrderNo)
  expect(String(draftItems[0]?.materialCode || '')).toBe(materialCode)
  expect(String(draftItems[0]?.sourceSalesOrderItemId || '')).toBeTruthy()
  expect(Number(draftItems[0]?.amount || 0)).toBeGreaterThan(0)

  await updateInvoiceStatus(page, 'invoice-issue', invoiceIssueId, '已开票')
  const detailJson = await fetchRecordDetail(
    page,
    'invoice-issue',
    invoiceIssueId,
  )
  expect(String(detailJson.status || '')).toBe('已开票')
  expect(Number(detailJson.amount || 0)).toBeCloseTo(expectedImportedAmount, 2)
  const issueItems = Array.isArray(detailJson.items) ? detailJson.items : []
  const issueItemsAmount = issueItems.reduce(
    (total, item) => total + Number(item.amount || 0),
    0,
  )
  expect(issueItemsAmount).toBeCloseTo(expectedImportedAmount, 2)

  await assertNoFatalUiErrors()
})
