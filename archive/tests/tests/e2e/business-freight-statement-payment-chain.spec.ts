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

interface CarrierIdentity {
  carrierId: string
  carrierLabel: string
  vehiclePlate: string
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

async function loadCarrierIdentity(
  page: Page,
  token: string,
): Promise<CarrierIdentity> {
  const response = await page.request.get(e2eApiUrl('carrier', 'options'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok(), '读取物流商选项失败').toBeTruthy()
  const payload = (await response.json()) as {
    code: number
    data?: Array<{
      id?: string
      value?: string
      label?: string
      carrierName?: string
      vehiclePlates?: string[]
    }>
  }
  expect(payload.code).toBe(0)
  const carrier = payload.data?.find(
    (item) =>
      String(item.id || item.value || '').trim() &&
      String(item.label || item.carrierName || '').trim() &&
      (item.vehiclePlates || []).some((plate) => String(plate).trim()),
  )
  expect(carrier, '真实后端没有带车辆的可用物流商').toBeTruthy()
  if (!carrier) {
    throw new Error('真实后端没有带车辆的可用物流商')
  }
  const vehiclePlate = String(
    (carrier.vehiclePlates || []).find((plate) => String(plate).trim()) || '',
  ).trim()
  expect(vehiclePlate).toBeTruthy()

  return {
    carrierId: String(carrier.id || carrier.value || '').trim(),
    carrierLabel: String(carrier.label || carrier.carrierName || '').trim(),
    vehiclePlate,
  }
}

async function getCurrentAccessToken(page: Page) {
  const token = await page.evaluate(
    () => localStorage.getItem('aries-token') || '',
  )
  expect(token).toBeTruthy()
  return token
}

async function createSalesOutboundChain(
  page: Page,
  suffix: string,
  identity: CustomerProjectIdentity,
  purchaseMaster: PurchaseMasterIdentity,
) {
  const orderDate = isoToday()
  const deliveryDate = isoToday()
  let purchaseOrderNo = `PO-FB-${suffix}`
  let salesOrderNo = `SO-FB-${suffix}`
  let salesOutboundNo = `SOB-FB-${suffix}`

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
    '6',
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

  const token = await getCurrentAccessToken(page)
  const outboundSearch = await page.request.get(
    e2eApiUrl(
      'sales-outbound',
      `search?keyword=${encodeURIComponent(salesOutboundNo)}&limit=5`,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const outboundSearchJson = (await outboundSearch.json()) as {
    code: number
    data?: Array<{ id?: string }>
  }
  expect(outboundSearchJson.code).toBe(0)
  const salesOutboundId = String(outboundSearchJson.data?.[0]?.id || '')
  expect(salesOutboundId).toBeTruthy()

  const outboundDetailRes = await page.request.get(
    e2eApiUrl('sales-outbound', salesOutboundId),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const outboundDetailJson = (await outboundDetailRes.json()) as {
    code: number
    data?: {
      outboundDate?: string
      status?: string
      customerId?: string
      projectId?: string
    }
  }
  expect(outboundDetailJson.code).toBe(0)
  expect(String(outboundDetailJson.data?.status || '')).toBe('已审核')
  expect(String(outboundDetailJson.data?.customerId || '')).toBe(
    identity.customerId,
  )
  expect(String(outboundDetailJson.data?.projectId || '')).toBe(
    identity.projectId,
  )

  return {
    salesOutboundNo,
    outboundDate: deliveryDate,
  }
}

test('creates freight statement and freight payment from sales outbound flow', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsE2eUser(page)
  const identityToken = await getCurrentAccessToken(page)
  const identity = await loadCustomerProjectIdentity(page, identityToken)
  const purchaseMaster = await loadPurchaseMasterIdentity(page, identityToken)
  const carrier = await loadCarrierIdentity(page, identityToken)

  const suffix = buildSuffix()
  let billNo = `WL-FB-${suffix}`
  let paymentNo = `FK-FB-${suffix}`

  const { salesOutboundNo, outboundDate } = await createSalesOutboundChain(
    page,
    suffix,
    identity,
    purchaseMaster,
  )

  await page.goto('/freight-bill')
  const freightBillOverlay = await openCreateOverlay(page)
  billNo = await fillOrReadFormField(
    formField(freightBillOverlay, 'billNo'),
    billNo,
  )
  await selectAntOption(
    formField(freightBillOverlay, 'carrierName'),
    carrier.carrierLabel,
  )
  await selectAntOption(
    formField(freightBillOverlay, 'vehiclePlate'),
    carrier.vehiclePlate,
  )
  await fillDateInput(formField(freightBillOverlay, 'billTime'), outboundDate)
  await formField(freightBillOverlay, 'remark').fill('e2e freight flow')
  await importParentByKeyword(
    page,
    freightBillOverlay,
    '导入上级销售出库单',
    salesOutboundNo,
    true,
  )
  await setSpinbuttonValue(
    freightBillOverlay.getByRole('spinbutton', { name: '* 单价' }),
    '180',
  )
  await saveAndAuditOverlay(page, freightBillOverlay, billNo)

  const token = await getCurrentAccessToken(page)
  const billSearch = await page.request.get(
    e2eApiUrl(
      'freight-bill',
      `search?keyword=${encodeURIComponent(billNo)}&limit=5`,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const billSearchJson = (await billSearch.json()) as {
    code: number
    data?: Array<{ id?: string }>
  }
  expect(billSearchJson.code).toBe(0)
  const billId = String(billSearchJson.data?.[0]?.id || '')
  expect(billId).toBeTruthy()

  const billDetailRes = await page.request.get(
    e2eApiUrl('freight-bill', billId),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const billDetailJson = (await billDetailRes.json()) as {
    code: number
    data?: {
      billTime?: string
      totalFreight?: number
      status?: string
      carrierId?: string
      vehiclePlate?: string
    }
  }
  expect(billDetailJson.code).toBe(0)
  const actualBillDate = outboundDate
  expect(Number(billDetailJson.data?.totalFreight || 0)).toBeGreaterThan(0)
  expect(String(billDetailJson.data?.status || '')).toBe('已审核')
  expect(String(billDetailJson.data?.carrierId || '')).toBe(carrier.carrierId)
  expect(String(billDetailJson.data?.vehiclePlate || '')).toBe(
    carrier.vehiclePlate,
  )

  await page.goto('/freight-statement')
  const statementOverlay = await openCreateEditor(page, '生成物流对账单')
  const statementNo = await fillOrReadFormField(
    formField(statementOverlay, 'statementNo'),
    `WDZ-FB-${suffix}`,
  )
  await selectAntOption(
    formField(statementOverlay, 'carrierId'),
    carrier.carrierLabel,
  )
  await importParentByKeyword(
    page,
    statementOverlay,
    '选择物流单生成明细',
    billNo,
    true,
  )
  await waitForFirstDetailRow(statementOverlay)
  await saveAndAuditOverlay(page, statementOverlay, statementNo)

  const fetchFreightStatementByKeyword = async () => {
    const currentToken = await getCurrentAccessToken(page)
    const response = await page.request.get(
      e2eApiUrl(
        'freight-statement',
        `search?keyword=${encodeURIComponent(statementNo)}&limit=10`,
      ),
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const json = (await response.json()) as {
      code: number
      data?: Array<{
        id?: string
        statementNo?: string
        unpaidAmount?: number
        carrierId?: string
        carrierName?: string
        status?: string
      }>
    }
    expect(json.code).toBe(0)
    return (
      (json.data || [])
        .filter((item) => String(item.statementNo || item.id || '').length > 0)
        .sort(compareRecordIds)[0] || null
    )
  }

  await expect
    .poll(
      async () => String((await fetchFreightStatementByKeyword())?.id || ''),
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe('')

  const statement = await fetchFreightStatementByKeyword()
  expect(statement).toBeTruthy()
  const statementId = String(statement?.id || '')
  expect(statementId).toBeTruthy()
  expect(String(statement?.status || '')).toBe('已审核')
  expect(String(statement?.carrierId || '')).toBe(carrier.carrierId)

  await page.goto('/payment')
  const paymentOverlay = await openCreateOverlay(page)
  paymentNo = await fillOrReadFormField(
    formField(paymentOverlay, 'paymentNo'),
    paymentNo,
  )
  await selectAntOption(formField(paymentOverlay, 'counterpartyType'), '物流商')
  await selectAntOption(
    formField(paymentOverlay, 'counterpartyId'),
    carrier.carrierLabel,
  )
  await selectAntOption(
    formField(paymentOverlay, 'sourceFreightStatementId'),
    String(statement?.statementNo || ''),
  )
  await fillDateInput(formField(paymentOverlay, 'paymentDate'), actualBillDate)
  await selectAntOption(formField(paymentOverlay, 'payType'), '银行转账')
  await formField(paymentOverlay, 'amount').fill(
    String(Number(statement?.unpaidAmount || 0).toFixed(2)),
  )
  await selectAntOption(formField(paymentOverlay, 'status'), '草稿')
  await formField(paymentOverlay, 'operatorName').fill(E2E_LOGIN_NAME)
  await saveAndAuditOverlay(page, paymentOverlay, paymentNo)

  const latestToken = await getCurrentAccessToken(page)
  const paymentSearch = await page.request.get(
    e2eApiUrl(
      'payment',
      `search?keyword=${encodeURIComponent(paymentNo)}&limit=5`,
    ),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const paymentSearchJson = (await paymentSearch.json()) as {
    code: number
    data?: Array<{ id?: string }>
  }
  expect(paymentSearchJson.code).toBe(0)
  const paymentId = String(paymentSearchJson.data?.[0]?.id || '')
  expect(paymentId).toBeTruthy()

  const paymentDetailRes = await page.request.get(
    e2eApiUrl('payment', paymentId),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const paymentDetailJson = (await paymentDetailRes.json()) as {
    code: number
    data?: {
      paymentNo?: string
      status?: string
      counterpartyType?: string
      counterpartyId?: string | number
      amount?: number
      items?: Array<{
        allocatedAmount?: number
        sourceFreightStatementId?: string | number
      }>
    }
  }
  expect(paymentDetailJson.code).toBe(0)
  expect(String(paymentDetailJson.data?.paymentNo || '')).toBe(paymentNo)
  expect(String(paymentDetailJson.data?.status || '')).toBe('已付款')
  expect(String(paymentDetailJson.data?.counterpartyType || '')).toBe('物流商')
  expect(String(paymentDetailJson.data?.counterpartyId || '')).toBe(
    carrier.carrierId,
  )
  expect(
    String(paymentDetailJson.data?.items?.[0]?.sourceFreightStatementId || ''),
  ).toBe(statementId)
  expect(Number(paymentDetailJson.data?.amount || 0)).toBeGreaterThan(0)
  expect(
    Number(paymentDetailJson.data?.items?.[0]?.allocatedAmount || 0),
  ).toBeGreaterThan(0)

  const refreshedStatementDetailRes = await page.request.get(
    e2eApiUrl('freight-statement', statementId),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const refreshedStatementDetailJson =
    (await refreshedStatementDetailRes.json()) as {
      code: number
      data?: {
        paidAmount?: number
        unpaidAmount?: number
        totalFreight?: number
        status?: string
      }
    }
  expect(refreshedStatementDetailJson.code).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.paidAmount || 0),
  ).toBeGreaterThan(0)
  expect(Number(refreshedStatementDetailJson.data?.unpaidAmount || 0)).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.totalFreight || 0),
  ).toBeGreaterThan(0)
  expect(String(refreshedStatementDetailJson.data?.status || '')).toBe('已审核')

  await assertNoFatalUiErrors()
})
