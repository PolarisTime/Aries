import type { Page } from '@playwright/test'
import { e2eApiUrl } from './support/api-key'
import {
  detailRowSpinbuttonByColumn,
  fillDateInput,
  fillOrReadFormField,
  fillPurchaseOrderLineItem,
  formField,
  getCurrentAccessToken,
  importParentByKeyword,
  loginAsE2eUser,
  openCreateOverlay,
  saveAndAuditOverlay,
  selectAntOption,
  setSpinbuttonValue,
  waitForFirstDetailRow,
} from './support/business-e2e'
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

async function loadCoilMaterial(page: Page, token: string) {
  const response = await page.request.get(
    e2eApiUrl(
      'material',
      `search?keyword=${encodeURIComponent('盘螺')}&limit=100`,
    ),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
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
  expect(material, '真实后端没有可用于采购销售链的盘螺商品').toBeTruthy()

  return {
    materialCode: String(material?.materialCode || '').trim(),
    pieceWeightTon: Number(material?.pieceWeightTon || 0),
  }
}

test.describe('purchase to sales chain', () => {
  test('creates purchase order, inbound, sales order and sales outbound with remaining coil quantity', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    test.setTimeout(180_000)
    await loginAsE2eUser(page)
    const token = await getCurrentAccessToken(page)
    const coilMaterial = await loadCoilMaterial(page, token)
    const inboundWeight = (coilMaterial.pieceWeightTon * 10).toFixed(3)

    const suffix = buildSuffix()
    const orderDate = isoToday()
    const deliveryDate = isoNextDay()
    let purchaseOrderNo = `PO-E2E-${suffix}`
    let salesOrderNo = `SO-E2E-${suffix}`

    await page.goto('/purchase-order')
    const purchaseOrderOverlay = await openCreateOverlay(page)
    await selectAntOption(formField(purchaseOrderOverlay, 'supplierId'))
    purchaseOrderNo = await fillOrReadFormField(
      formField(purchaseOrderOverlay, 'orderNo'),
      purchaseOrderNo,
    )
    await fillDateInput(formField(purchaseOrderOverlay, 'orderDate'), orderDate)

    const purchaseOrderRow = await waitForFirstDetailRow(purchaseOrderOverlay)
    await fillPurchaseOrderLineItem(purchaseOrderRow, {
      materialCode: coilMaterial.materialCode,
    })

    await saveAndAuditOverlay(page, purchaseOrderOverlay, purchaseOrderNo)

    await page.goto('/sales-order')
    const salesOrderOverlay = await openCreateOverlay(page)
    salesOrderNo = await fillOrReadFormField(
      formField(salesOrderOverlay, 'orderNo'),
      salesOrderNo,
    )
    await selectAntOption(formField(salesOrderOverlay, 'customerId'))
    await selectAntOption(formField(salesOrderOverlay, 'projectId'))
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
    await expect(
      formField(purchaseInboundOverlay, 'purchaseOrderNo'),
    ).toHaveValue(purchaseOrderNo)

    const purchaseInboundRow = purchaseInboundOverlay
      .locator('.module-detail-table tbody tr:not(.ant-table-measure-row)')
      .filter({ hasText: coilMaterial.materialCode })
      .first()
    await expect(purchaseInboundRow).toBeVisible()
    const inboundWeightInput = await detailRowSpinbuttonByColumn(
      purchaseInboundRow,
      '过磅重量',
    )
    await setSpinbuttonValue(inboundWeightInput, inboundWeight)
    await expect(inboundWeightInput).toHaveValue(inboundWeight)
    await saveAndAuditOverlay(page, purchaseInboundOverlay)

    await page.goto('/sales-outbound')
    const salesOutboundOverlay = await openCreateOverlay(page)
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
    await saveAndAuditOverlay(page, salesOutboundOverlay)

    const purchaseOrderSearch = await page.request.get(
      e2eApiUrl(
        'purchase-order',
        `search?keyword=${encodeURIComponent(purchaseOrderNo)}&limit=5`,
      ),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(purchaseOrderSearch.ok()).toBeTruthy()

    const purchaseOrderSearchJson = (await purchaseOrderSearch.json()) as {
      code: number
      data?: Array<{ id?: string }>
    }
    expect(purchaseOrderSearchJson.code).toBe(0)
    const purchaseOrderId = String(purchaseOrderSearchJson.data?.[0]?.id || '')
    expect(purchaseOrderId).toBeTruthy()

    const purchaseOrderDetailRes = await page.request.get(
      e2eApiUrl('purchase-order', purchaseOrderId),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(purchaseOrderDetailRes.ok()).toBeTruthy()
    const purchaseOrderDetailJson = (await purchaseOrderDetailRes.json()) as {
      code: number
      data?: {
        items?: Array<{
          materialCode?: string
          salesRemainingQuantity?: number
          quantity?: number
        }>
      }
    }
    expect(purchaseOrderDetailJson.code).toBe(0)
    const coilItem = purchaseOrderDetailJson.data?.items?.find(
      (item) =>
        String(item.materialCode || '').trim() === coilMaterial.materialCode,
    )
    expect(coilItem).toBeTruthy()
    expect(Number(coilItem?.quantity || 0)).toBe(10)
    expect(Number(coilItem?.salesRemainingQuantity || 0)).toBe(4)

    const salesOrderSearch = await page.request.get(
      e2eApiUrl(
        'sales-order',
        `search?keyword=${encodeURIComponent(salesOrderNo)}&limit=5`,
      ),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(salesOrderSearch.ok()).toBeTruthy()
    const salesOrderSearchJson = (await salesOrderSearch.json()) as {
      code: number
      data?: Array<{ id?: string }>
    }
    expect(salesOrderSearchJson.code).toBe(0)
    const salesOrderId = String(salesOrderSearchJson.data?.[0]?.id || '')
    expect(salesOrderId).toBeTruthy()

    const salesOrderDetailRes = await page.request.get(
      e2eApiUrl('sales-order', salesOrderId),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    expect(salesOrderDetailRes.ok()).toBeTruthy()
    const salesOrderDetailJson = (await salesOrderDetailRes.json()) as {
      code: number
      data?: { status?: string }
    }
    expect(salesOrderDetailJson.code).toBe(0)
    expect(String(salesOrderDetailJson.data?.status || '')).toBe('交付核定')

    await assertNoFatalUiErrors()
  })
})
