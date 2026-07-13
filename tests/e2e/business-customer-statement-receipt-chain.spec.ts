import type { Page } from '@playwright/test'
import { e2eApiUrl } from './support/api-key'
import {
  completePurchaseInboundFromOrder,
  detailRowSpinbuttonByColumn,
  fillDateInput,
  fillOrReadFormField,
  fillPurchaseOrderLineItem,
  formField,
  importParentByKeyword,
  loginAsE2eUser,
  openCreateEditor,
  openCreateOverlay,
  saveAndAuditOverlay,
  selectAntOption,
  setSpinbuttonValue,
  waitForFirstDetailRow,
} from './support/business-e2e'
import { E2E_LOGIN_NAME } from './support/e2e-credentials'
import { expect, test } from './support/test'

function buildSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

function isoToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isoNextDay() {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function compareRecordIds(left: { id?: string }, right: { id?: string }) {
  const leftId = BigInt(String(left.id || '0'))
  const rightId = BigInt(String(right.id || '0'))
  if (leftId === rightId) {
    return 0
  }
  return leftId > rightId ? -1 : 1
}

interface CustomerProjectIdentity {
  customerId: string
  customerName: string
  projectId: string
  projectName: string
}

interface PurchaseMasterIdentity {
  supplierId: string
  supplierLabel: string
  warehouseId: string
  warehouseLabel: string
}

async function loadCustomerProjectIdentity(
  page: Page,
  token: string,
): Promise<CustomerProjectIdentity> {
  const headers = { Authorization: `Bearer ${token}` }
  const customerResponse = await page.request.get(
    e2eApiUrl('customer', 'options'),
    { headers },
  )
  expect(customerResponse.ok(), '读取客户选项失败').toBeTruthy()
  const customerPayload = (await customerResponse.json()) as {
    code: number
    data?: Array<{
      id?: string
      customerName?: string
    }>
  }
  expect(customerPayload.code).toBe(0)
  const customer = customerPayload.data?.find(
    (item) =>
      String(item.id || '').trim() && String(item.customerName || '').trim(),
  )
  expect(customer, '真实后端没有可用客户').toBeTruthy()
  if (!customer) {
    throw new Error('真实后端没有可用客户')
  }

  const customerId = String(customer.id || '').trim()
  const projectResponse = await page.request.get(
    e2eApiUrl(
      'projects',
      `options?customerId=${encodeURIComponent(customerId)}`,
    ),
    { headers },
  )
  expect(projectResponse.ok(), '读取客户项目选项失败').toBeTruthy()
  const projectPayload = (await projectResponse.json()) as {
    code: number
    data?: Array<{
      id?: string
      customerId?: string
      projectName?: string
    }>
  }
  expect(projectPayload.code).toBe(0)
  const project = projectPayload.data?.find(
    (item) =>
      String(item.id || '').trim() &&
      String(item.customerId || '').trim() === customerId &&
      String(item.projectName || '').trim(),
  )
  expect(project, '真实后端没有当前客户可用的项目').toBeTruthy()
  if (!project) {
    throw new Error('真实后端没有当前客户可用的项目')
  }

  return {
    customerId,
    customerName: String(customer.customerName || '').trim(),
    projectId: String(project.id || '').trim(),
    projectName: String(project.projectName || '').trim(),
  }
}

async function loadPurchaseMasterIdentity(
  page: Page,
  token: string,
): Promise<PurchaseMasterIdentity> {
  const headers = { Authorization: `Bearer ${token}` }
  const [supplierResponse, warehouseResponse] = await Promise.all([
    page.request.get(e2eApiUrl('supplier', 'options'), { headers }),
    page.request.get(e2eApiUrl('warehouse', 'options'), { headers }),
  ])
  expect(supplierResponse.ok(), '读取供应商选项失败').toBeTruthy()
  expect(warehouseResponse.ok(), '读取仓库选项失败').toBeTruthy()

  const supplierPayload = (await supplierResponse.json()) as {
    code: number
    data?: Array<{
      id?: string
      value?: string
      label?: string
      supplierName?: string
    }>
  }
  const warehousePayload = (await warehouseResponse.json()) as {
    code: number
    data?: Array<{
      id?: string
      value?: string
      label?: string
      warehouseName?: string
    }>
  }
  expect(supplierPayload.code).toBe(0)
  expect(warehousePayload.code).toBe(0)

  const supplier = supplierPayload.data?.find(
    (item) =>
      String(item.id || item.value || '').trim() &&
      String(item.label || item.supplierName || '').trim(),
  )
  const warehouse = warehousePayload.data?.find(
    (item) =>
      String(item.id || item.value || '').trim() &&
      String(item.label || item.warehouseName || '').trim(),
  )
  expect(supplier, '真实后端没有可用供应商').toBeTruthy()
  expect(warehouse, '真实后端没有可用仓库').toBeTruthy()
  if (!supplier || !warehouse) {
    throw new Error('真实后端缺少采购链所需的供应商或仓库')
  }

  return {
    supplierId: String(supplier.id || supplier.value || '').trim(),
    supplierLabel: String(supplier.label || supplier.supplierName || '').trim(),
    warehouseId: String(warehouse.id || warehouse.value || '').trim(),
    warehouseLabel: String(
      warehouse.label || warehouse.warehouseName || '',
    ).trim(),
  }
}

async function getCurrentAccessToken(page: Page) {
  const token = await page.evaluate(
    () => localStorage.getItem('aries-token') || '',
  )
  expect(token).toBeTruthy()
  return token
}

async function createPurchaseSalesCompletedChain(
  page: Page,
  suffix: string,
  identity: CustomerProjectIdentity,
  purchaseMaster: PurchaseMasterIdentity,
) {
  const orderDate = isoToday()
  const deliveryDate = isoNextDay()
  let purchaseOrderNo = `PO-CS-${suffix}`
  let salesOrderNo = `SO-CS-${suffix}`
  let salesOutboundNo = `SOB-CS-${suffix}`

  await page.goto('/purchase-order')
  const purchaseOrderOverlay = await openCreateOverlay(page)
  await selectAntOption(
    formField(purchaseOrderOverlay, 'supplierId'),
    purchaseMaster.supplierLabel,
  )
  purchaseOrderNo = await fillOrReadFormField(
    formField(purchaseOrderOverlay, 'orderNo'),
    purchaseOrderNo,
  )
  await fillDateInput(formField(purchaseOrderOverlay, 'orderDate'), orderDate)
  const purchaseOrderRow = await waitForFirstDetailRow(purchaseOrderOverlay)
  await fillPurchaseOrderLineItem(purchaseOrderRow, {
    warehouseName: purchaseMaster.warehouseLabel,
  })
  await saveAndAuditOverlay(page, purchaseOrderOverlay, purchaseOrderNo)

  await page.goto('/sales-order')
  const salesOrderOverlay = await openCreateOverlay(page)
  salesOrderNo = await fillOrReadFormField(
    formField(salesOrderOverlay, 'orderNo'),
    salesOrderNo,
  )
  await selectAntOption(
    formField(salesOrderOverlay, 'customerId'),
    identity.customerName,
  )
  await selectAntOption(
    formField(salesOrderOverlay, 'projectId'),
    identity.projectName,
  )
  await fillDateInput(
    formField(salesOrderOverlay, 'deliveryDate'),
    deliveryDate,
  )
  await importParentByKeyword(
    page,
    salesOrderOverlay,
    '导入采购订单明细',
    purchaseOrderNo,
  )
  const salesOrderRow = await waitForFirstDetailRow(salesOrderOverlay)
  await setSpinbuttonValue(
    await detailRowSpinbuttonByColumn(salesOrderRow, '数量'),
    '10',
  )
  await setSpinbuttonValue(
    await detailRowSpinbuttonByColumn(salesOrderRow, '单价'),
    '3600',
  )
  await saveAndAuditOverlay(page, salesOrderOverlay, salesOrderNo)
  await completePurchaseInboundFromOrder(page, purchaseOrderNo, orderDate)

  await page.goto('/sales-outbound')
  const salesOutboundOverlay = await openCreateOverlay(page)
  salesOutboundNo = await fillOrReadFormField(
    formField(salesOutboundOverlay, 'outboundNo'),
    salesOutboundNo,
  )
  await fillDateInput(
    formField(salesOutboundOverlay, 'outboundDate'),
    deliveryDate,
  )
  await importParentByKeyword(
    page,
    salesOutboundOverlay,
    '导入销售订单明细',
    salesOrderNo,
  )
  await saveAndAuditOverlay(page, salesOutboundOverlay, salesOutboundNo)

  return { salesOrderNo, deliveryDate }
}

test('creates customer statement and receipt from completed sales flow', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsE2eUser(page)
  const token = await getCurrentAccessToken(page)
  const identity = await loadCustomerProjectIdentity(page, token)
  const purchaseMaster = await loadPurchaseMasterIdentity(page, token)

  const suffix = buildSuffix()
  let receiptNo = `RC-CS-${suffix}`

  const { salesOrderNo, deliveryDate } =
    await createPurchaseSalesCompletedChain(
      page,
      suffix,
      identity,
      purchaseMaster,
    )

  const fetchSalesOrderId = async () => {
    const token = await getCurrentAccessToken(page)
    const salesOrderSearch = await page.request.get(
      e2eApiUrl(
        'sales-order',
        `search?keyword=${encodeURIComponent(salesOrderNo)}&limit=5`,
      ),
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const salesOrderSearchJson = (await salesOrderSearch.json()) as {
      code: number
      message?: string
      data?: Array<{ id?: string }>
    }
    if (salesOrderSearchJson.code !== 0) {
      throw new Error(
        `sales-order search failed: code=${salesOrderSearchJson.code}, message=${String(
          salesOrderSearchJson.message || '',
        )}`,
      )
    }
    return String(salesOrderSearchJson.data?.[0]?.id || '')
  }

  await expect
    .poll(fetchSalesOrderId, {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe('')

  const salesOrderId = await fetchSalesOrderId()
  const fetchSalesOrderDetail = async () => {
    const currentToken = await getCurrentAccessToken(page)
    const response = await page.request.get(
      e2eApiUrl('sales-order', salesOrderId),
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const json = (await response.json()) as {
      code: number
      data?: {
        status?: string
        deliveryDate?: string
        customerId?: string
        projectId?: string
      }
    }
    expect(json.code).toBe(0)
    return json.data
  }

  await expect
    .poll(async () => String((await fetchSalesOrderDetail())?.status || ''), {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .toBe('交付核定')

  await page.goto('/sales-order')
  await page
    .locator('form.module-filter-toolbar button[aria-expanded="false"]')
    .click()
  const deliveryDateRange = page.locator('.ant-picker-range').first()
  await deliveryDateRange.hover()
  await deliveryDateRange.locator('.ant-picker-clear').click()
  await expect(page.locator('#module-filter-deliverydate-start')).toHaveValue(
    '',
  )
  await expect(page.locator('#module-filter-deliverydate-end')).toHaveValue('')

  const salesOrderKeyword = page.locator('input[name="keyword"]').first()
  await expect(salesOrderKeyword).toBeVisible()
  const salesOrderListResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/sales-orders' &&
      url.searchParams.get('keyword') === salesOrderNo &&
      !url.searchParams.has('startDate') &&
      !url.searchParams.has('endDate')
    )
  })
  await salesOrderKeyword.fill(salesOrderNo)
  await salesOrderKeyword.press('Enter')
  expect((await salesOrderListResponse).ok()).toBeTruthy()
  const salesOrderRow = page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: salesOrderNo })
    .first()
  await expect(salesOrderRow).toBeVisible()
  await salesOrderRow.click()
  const confirmDelivery = page.getByRole('button', {
    name: '确认无需调整',
  })
  await expect(confirmDelivery).toBeVisible()
  await confirmDelivery.click()

  await expect
    .poll(async () => String((await fetchSalesOrderDetail())?.status || ''), {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .toBe('完成销售')

  const salesOrderDetail = await fetchSalesOrderDetail()
  expect(String(salesOrderDetail?.customerId || '')).toBe(identity.customerId)
  expect(String(salesOrderDetail?.projectId || '')).toBe(identity.projectId)
  const actualDeliveryDate = deliveryDate

  await page.goto('/customer-statement')
  const statementOverlay = await openCreateEditor(page, '生成对账单')
  const statementNo = await fillOrReadFormField(
    formField(statementOverlay, 'statementNo'),
    `KHDZ-CS-${suffix}`,
  )
  await selectAntOption(
    formField(statementOverlay, 'customerId'),
    identity.customerName,
  )
  await selectAntOption(
    formField(statementOverlay, 'projectId'),
    identity.projectName,
  )
  await importParentByKeyword(
    page,
    statementOverlay,
    '选择销售订单生成明细',
    salesOrderNo,
    true,
  )
  await waitForFirstDetailRow(statementOverlay)
  await saveAndAuditOverlay(page, statementOverlay, statementNo)

  const fetchCustomerStatementByKeyword = async () => {
    const currentToken = await getCurrentAccessToken(page)
    const customerStatementSearch = await page.request.get(
      e2eApiUrl(
        'customer-statement',
        `search?keyword=${encodeURIComponent(statementNo)}&limit=10`,
      ),
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const customerStatementSearchJson =
      (await customerStatementSearch.json()) as {
        code: number
        data?: Array<{
          id?: string
          statementNo?: string
          closingAmount?: number
          customerName?: string
          customerId?: string
          projectName?: string
          projectId?: string
          status?: string
        }>
      }
    expect(customerStatementSearchJson.code).toBe(0)
    return (
      (customerStatementSearchJson.data || [])
        .filter((item) => String(item.statementNo || item.id || '').length > 0)
        .sort(compareRecordIds)[0] || null
    )
  }

  await expect
    .poll(
      async () => String((await fetchCustomerStatementByKeyword())?.id || ''),
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe('')

  const statement = await fetchCustomerStatementByKeyword()

  expect(statement).toBeTruthy()
  const statementId = String(statement?.id || '')
  expect(statementId).toBeTruthy()
  expect(String(statement?.status || '')).toBe('已确认')
  expect(String(statement?.customerId || '')).toBe(identity.customerId)
  expect(String(statement?.projectId || '')).toBe(identity.projectId)

  await page.goto('/receipt')
  const receiptOverlay = await openCreateOverlay(page)
  receiptNo = await fillOrReadFormField(
    formField(receiptOverlay, 'receiptNo'),
    receiptNo,
  )
  await selectAntOption(
    formField(receiptOverlay, 'customerId'),
    identity.customerName,
  )
  await selectAntOption(
    formField(receiptOverlay, 'projectId'),
    identity.projectName,
  )
  await selectAntOption(
    formField(receiptOverlay, 'sourceCustomerStatementId'),
    String(statement?.statementNo || ''),
  )
  await fillDateInput(
    formField(receiptOverlay, 'receiptDate'),
    actualDeliveryDate,
  )
  await selectAntOption(formField(receiptOverlay, 'payType'), '银行转账')
  await formField(receiptOverlay, 'amount').fill(
    String(Number(statement?.closingAmount || 0).toFixed(2)),
  )
  await selectAntOption(formField(receiptOverlay, 'status'), '草稿')
  await formField(receiptOverlay, 'operatorName').fill(E2E_LOGIN_NAME)
  await saveAndAuditOverlay(page, receiptOverlay, receiptNo)

  const latestToken = await getCurrentAccessToken(page)
  const receiptSearch = await page.request.get(
    e2eApiUrl(
      'receipt',
      `search?keyword=${encodeURIComponent(receiptNo)}&limit=5`,
    ),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const receiptSearchJson = (await receiptSearch.json()) as {
    code: number
    data?: Array<{ id?: string }>
  }
  expect(receiptSearchJson.code).toBe(0)
  const receiptId = String(receiptSearchJson.data?.[0]?.id || '')
  expect(receiptId).toBeTruthy()

  const receiptDetailRes = await page.request.get(
    e2eApiUrl('receipt', receiptId),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const receiptDetailJson = (await receiptDetailRes.json()) as {
    code: number
    data?: {
      receiptNo?: string
      status?: string
      sourceCustomerStatementId?: string | number | null
      amount?: number
      items?: Array<{
        allocatedAmount?: number
        sourceCustomerStatementId?: string | number
      }>
    }
  }
  expect(receiptDetailJson.code).toBe(0)
  expect(String(receiptDetailJson.data?.receiptNo || '')).toBe(receiptNo)
  expect(String(receiptDetailJson.data?.status || '')).toBe('已收款')
  expect(String(receiptDetailJson.data?.sourceCustomerStatementId || '')).toBe(
    statementId,
  )
  expect(
    String(receiptDetailJson.data?.items?.[0]?.sourceCustomerStatementId || ''),
  ).toBe(statementId)
  expect(Number(receiptDetailJson.data?.amount || 0)).toBeGreaterThan(0)
  expect(
    Number(receiptDetailJson.data?.items?.[0]?.allocatedAmount || 0),
  ).toBeGreaterThan(0)

  const refreshedStatementDetailRes = await page.request.get(
    e2eApiUrl('customer-statement', statementId),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const refreshedStatementDetailJson =
    (await refreshedStatementDetailRes.json()) as {
      code: number
      data?: {
        receiptAmount?: number
        closingAmount?: number
        salesAmount?: number
        status?: string
      }
    }
  expect(refreshedStatementDetailJson.code).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.receiptAmount || 0),
  ).toBeGreaterThan(0)
  expect(Number(refreshedStatementDetailJson.data?.closingAmount || 0)).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.salesAmount || 0),
  ).toBeGreaterThan(0)
  expect(String(refreshedStatementDetailJson.data?.status || '')).toBe('已确认')

  await assertNoFatalUiErrors()
})
