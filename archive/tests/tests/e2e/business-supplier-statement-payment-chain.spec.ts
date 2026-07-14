import type { Page } from '@playwright/test'
import { e2eApiUrl } from './support/api-key'
import {
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

interface PurchaseMasterIdentity {
  supplierId: string
  supplierLabel: string
  warehouseId: string
  warehouseLabel: string
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

async function loadCoilMaterial(page: Page, token: string) {
  const response = await page.request.get(
    e2eApiUrl(
      'material',
      `search?keyword=${encodeURIComponent('盘螺')}&limit=100`,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  expect(response.ok(), '读取盘螺商品失败').toBeTruthy()
  const payload = (await response.json()) as {
    code: number
    data?: Array<{
      category?: string
      materialCode?: string
      pieceWeightTon?: number
    }>
  }
  expect(payload.code).toBe(0)
  const material = payload.data?.find(
    (item) =>
      String(item.category || '').trim() === '盘螺' &&
      String(item.materialCode || '').trim() &&
      Number(item.pieceWeightTon || 0) > 0,
  )
  expect(material, '真实后端没有可用于供应商对账链的盘螺商品').toBeTruthy()
  if (!material) {
    throw new Error('真实后端没有可用于供应商对账链的盘螺商品')
  }

  return {
    materialCode: String(material.materialCode || '').trim(),
    pieceWeightTon: Number(material.pieceWeightTon || 0),
  }
}

async function getCurrentAccessToken(page: Page) {
  const token = await page.evaluate(
    () => localStorage.getItem('aries-token') || '',
  )
  expect(token).toBeTruthy()
  return token
}

async function createPurchaseInboundCompletedChain(
  page: Page,
  suffix: string,
  material: { materialCode: string; pieceWeightTon: number },
  purchaseMaster: PurchaseMasterIdentity,
) {
  const orderDate = isoToday()
  const purchaseQuantity = 10
  const inboundWeight = (material.pieceWeightTon * purchaseQuantity).toFixed(3)
  let purchaseOrderNo = `PO-SP-${suffix}`

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
    materialCode: material.materialCode,
    warehouseName: purchaseMaster.warehouseLabel,
    quantity: String(purchaseQuantity),
  })
  await saveAndAuditOverlay(page, purchaseOrderOverlay, purchaseOrderNo)

  await page.goto('/purchase-inbound')
  const purchaseInboundOverlay = await openCreateOverlay(page)
  await fillDateInput(
    formField(purchaseInboundOverlay, 'inboundDate'),
    orderDate,
  )
  await importParentByKeyword(
    page,
    purchaseInboundOverlay,
    '导入采购订单明细',
    purchaseOrderNo,
  )

  const purchaseInboundRow = await waitForFirstDetailRow(purchaseInboundOverlay)
  const inboundWeightInput = await detailRowSpinbuttonByColumn(
    purchaseInboundRow,
    '过磅重量',
  )
  await setSpinbuttonValue(inboundWeightInput, inboundWeight)
  await expect(inboundWeightInput).toHaveValue(inboundWeight)

  await saveAndAuditOverlay(page, purchaseInboundOverlay)

  const fetchPurchaseInbound = async () => {
    const currentToken = await getCurrentAccessToken(page)
    const inboundSearch = await page.request.get(
      e2eApiUrl(
        'purchase-inbound',
        `search?keyword=${encodeURIComponent(purchaseOrderNo)}&limit=5`,
      ),
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const inboundSearchJson = (await inboundSearch.json()) as {
      code: number
      message?: string
      data?: Array<{
        id?: string
        inboundNo?: string
        purchaseOrderNo?: string
      }>
    }
    if (inboundSearchJson.code !== 0) {
      throw new Error(
        `purchase-inbound search failed: code=${inboundSearchJson.code}, message=${String(
          inboundSearchJson.message || '',
        )}`,
      )
    }
    return (
      inboundSearchJson.data?.find(
        (record) =>
          String(record.purchaseOrderNo || '').trim() === purchaseOrderNo,
      ) || null
    )
  }

  await expect
    .poll(async () => Boolean(await fetchPurchaseInbound()), {
      timeout: 20_000,
      intervals: [500, 1000, 2000],
    })
    .toBe(true)

  const purchaseInbound = await fetchPurchaseInbound()
  const purchaseInboundId = String(purchaseInbound?.id || '')
  const purchaseInboundNo = String(purchaseInbound?.inboundNo || '')
  expect(purchaseInboundId).toBeTruthy()
  expect(purchaseInboundNo).toBeTruthy()

  const token = await getCurrentAccessToken(page)
  const inboundDetailRes = await page.request.get(
    e2eApiUrl('purchase-inbound', purchaseInboundId),
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const inboundDetailJson = (await inboundDetailRes.json()) as {
    code: number
    data?: { inboundDate?: string; status?: string }
  }
  expect(inboundDetailJson.code).toBe(0)
  expect(String(inboundDetailJson.data?.status || '')).toBe('完成入库')
  const actualInboundDate = orderDate

  return { purchaseInboundNo, orderDate: actualInboundDate }
}

test('creates supplier statement and payment from completed purchase inbound flow', async ({
  page,
  assertNoFatalUiErrors,
}) => {
  test.setTimeout(240_000)
  await loginAsE2eUser(page)
  const token = await getCurrentAccessToken(page)
  const material = await loadCoilMaterial(page, token)
  const purchaseMaster = await loadPurchaseMasterIdentity(page, token)

  const suffix = buildSuffix()
  let paymentNo = `FK-SP-${suffix}`

  const { purchaseInboundNo, orderDate } =
    await createPurchaseInboundCompletedChain(
      page,
      suffix,
      material,
      purchaseMaster,
    )

  await page.goto('/supplier-statement')
  const statementOverlay = await openCreateEditor(page, '生成对账单')
  const statementNo = await fillOrReadFormField(
    formField(statementOverlay, 'statementNo'),
    `GYDZ-SP-${suffix}`,
  )
  await selectAntOption(
    formField(statementOverlay, 'supplierId'),
    purchaseMaster.supplierLabel,
  )
  await importParentByKeyword(
    page,
    statementOverlay,
    '选择采购入库单生成明细',
    purchaseInboundNo,
    true,
  )
  await waitForFirstDetailRow(statementOverlay)
  await saveAndAuditOverlay(page, statementOverlay, statementNo)

  const fetchSupplierStatementByKeyword = async () => {
    const currentToken = await getCurrentAccessToken(page)
    const response = await page.request.get(
      e2eApiUrl(
        'supplier-statement',
        `search?keyword=${encodeURIComponent(statementNo)}&limit=10`,
      ),
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const json = (await response.json()) as {
      code: number
      data?: Array<{
        id?: string
        statementNo?: string
        closingAmount?: number
        supplierName?: string
        supplierId?: string
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
      async () => String((await fetchSupplierStatementByKeyword())?.id || ''),
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe('')

  const statement = await fetchSupplierStatementByKeyword()
  expect(statement).toBeTruthy()
  const statementId = String(statement?.id || '')
  expect(statementId).toBeTruthy()
  expect(String(statement?.status || '')).toBe('已确认')
  expect(String(statement?.supplierId || '')).toBe(purchaseMaster.supplierId)

  await page.goto('/payment')
  const paymentOverlay = await openCreateOverlay(page)
  paymentNo = await fillOrReadFormField(
    formField(paymentOverlay, 'paymentNo'),
    paymentNo,
  )
  await selectAntOption(formField(paymentOverlay, 'counterpartyType'), '供应商')
  await selectAntOption(
    formField(paymentOverlay, 'counterpartyId'),
    purchaseMaster.supplierLabel,
  )
  await selectAntOption(
    formField(paymentOverlay, 'sourceSupplierStatementId'),
    String(statement?.statementNo || ''),
  )
  await fillDateInput(formField(paymentOverlay, 'paymentDate'), orderDate)
  await selectAntOption(formField(paymentOverlay, 'payType'), '银行转账')
  await formField(paymentOverlay, 'amount').fill(
    String(Number(statement?.closingAmount || 0).toFixed(2)),
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
        sourceSupplierStatementId?: string | number
      }>
    }
  }
  expect(paymentDetailJson.code).toBe(0)
  expect(String(paymentDetailJson.data?.paymentNo || '')).toBe(paymentNo)
  expect(String(paymentDetailJson.data?.status || '')).toBe('已付款')
  expect(String(paymentDetailJson.data?.counterpartyType || '')).toBe('供应商')
  expect(String(paymentDetailJson.data?.counterpartyId || '')).toBe(
    purchaseMaster.supplierId,
  )
  expect(
    String(paymentDetailJson.data?.items?.[0]?.sourceSupplierStatementId || ''),
  ).toBe(statementId)
  expect(Number(paymentDetailJson.data?.amount || 0)).toBeGreaterThan(0)
  expect(
    Number(paymentDetailJson.data?.items?.[0]?.allocatedAmount || 0),
  ).toBeGreaterThan(0)

  const refreshedStatementDetailRes = await page.request.get(
    e2eApiUrl('supplier-statement', statementId),
    { headers: { Authorization: `Bearer ${latestToken}` } },
  )
  const refreshedStatementDetailJson =
    (await refreshedStatementDetailRes.json()) as {
      code: number
      data?: {
        paymentAmount?: number
        closingAmount?: number
        purchaseAmount?: number
        status?: string
      }
    }
  expect(refreshedStatementDetailJson.code).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.paymentAmount || 0),
  ).toBeGreaterThan(0)
  expect(Number(refreshedStatementDetailJson.data?.closingAmount || 0)).toBe(0)
  expect(
    Number(refreshedStatementDetailJson.data?.purchaseAmount || 0),
  ).toBeGreaterThan(0)
  expect(String(refreshedStatementDetailJson.data?.status || '')).toBe('已确认')

  await assertNoFatalUiErrors()
})
