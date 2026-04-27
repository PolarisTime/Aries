import { expect, test, type Page } from '@playwright/test'
import {
  expectSelectValue,
  getButton,
  getModuleDetail,
  getSelectField,
  listModuleRecords,
} from './support/live-helpers'
import { primeRealAuthSession } from './support/real-session'

function getVisibleOverlay(page: Page, titleText: string) {
  return page.locator('.workspace-overlay:visible').filter({
    has: page.locator('.workspace-overlay-title', { hasText: titleText }),
  }).last()
}

async function doubleClickVisibleOverlayRow(page: Page, titleText: string, rowText: string) {
  const overlay = getVisibleOverlay(page, titleText)
  await expect(overlay).toBeVisible()
  await overlay.locator('tr', { hasText: rowText }).first().dblclick()
}

test.describe('business grid flows', () => {
  test('supports keyword filter flow on materials', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const materials = await listModuleRecords(page.request, session.accessToken, 'materials', { size: 3 })
    const firstCode = String(materials[0]?.materialCode || '').trim()
    const secondCode = String(materials[1]?.materialCode || '').trim()

    test.skip(!(firstCode && secondCode), '真实数据中商品不足 2 条')

    await page.goto('/materials')
    await expect(page.locator('table')).toContainText(firstCode)
    await expect(page.locator('table')).toContainText(secondCode)

    await page.getByPlaceholder('商品编码 / 品牌 / 规格').fill(secondCode)
    await getButton(page, '查询').click()

    await expect(page.locator('table')).toContainText(secondCode)
    await expect(page.locator('table')).not.toContainText(firstCode)
  })

  test('opens material edit dialog with live data', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const materials = await listModuleRecords(page.request, session.accessToken, 'materials', { size: 1 })
    const material = materials[0]
    const materialCode = String(material?.materialCode || '').trim()

    test.skip(!materialCode, '真实数据中没有商品资料')

    await page.goto('/materials')
    const row = page.locator('tr', { hasText: materialCode }).first()
    await expect(row).toBeVisible()
    await row.getByText('编辑').click()

    await expect(page.locator('.workspace-overlay-title', { hasText: '编辑商品资料' })).toBeVisible()
    await expect(page.locator('#editor-field-materials-materialCode')).toHaveValue(materialCode)
    if (material?.brand) {
      await expect(page.locator('#editor-field-materials-brand')).toHaveValue(String(material.brand))
    }

    await getButton(page, '取消').click()
  })

  test('supports material selection dialog inside purchase order details', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const materials = await listModuleRecords(page.request, session.accessToken, 'materials', { size: 1 })
    const materialCode = String(materials[0]?.materialCode || '').trim()

    test.skip(!materialCode, '真实数据中没有可选商品')

    await page.goto('/purchase-orders')
    await getButton(page, '新增').click()
    await getButton(page, '新增明细').click()
    const selectorButton = page.locator('.editor-material-selector-button').first()
    await expect(selectorButton).toBeVisible()
    await selectorButton.click()

    const selectorOverlay = getVisibleOverlay(page, '选择商品')
    await expect(selectorOverlay).toBeVisible()
    await selectorOverlay.getByPlaceholder('输入商品编码、品牌、材质、规格搜索').fill(materialCode)
    await doubleClickVisibleOverlayRow(page, '选择商品', materialCode)

    await expect(selectorOverlay).not.toBeVisible()
    await expect(page.locator('.module-detail-table')).toContainText(materialCode)
  })

  test('supports detail overlay view flow for purchase orders', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const orders = await listModuleRecords(page.request, session.accessToken, 'purchase-orders', { size: 1 })
    const order = orders[0]
    const orderNo = String(order?.orderNo || '').trim()
    const detail = order?.id
      ? await getModuleDetail(page.request, session.accessToken, 'purchase-orders', String(order.id))
      : null

    test.skip(!orderNo, '真实数据中没有采购订单')

    await page.goto('/purchase-orders')
    const row = page.locator('tr', { hasText: orderNo }).first()
    await expect(row).toBeVisible()
    await row.getByText('查看').click()

    const title = page.locator('.workspace-overlay-title', { hasText: '采购订单详情' })
    await expect(title).toBeVisible()
    await expect(page.locator('.bill-detail-body')).toContainText(orderNo)
    if (order?.supplierName) {
      await expect(page.locator('.bill-detail-body')).toContainText(String(order.supplierName))
    }
    const firstMaterialCode = String(detail?.items?.[0]?.materialCode || '').trim()
    if (firstMaterialCode) {
      await expect(page.locator('.module-detail-table')).toContainText(firstMaterialCode)
    }
  })

  test('supports parent import preview flow for purchase inbounds', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const parents = await listModuleRecords(page.request, session.accessToken, 'purchase-orders', { size: 1 })
    const parent = parents[0]
    const orderNo = String(parent?.orderNo || '').trim()
    const detail = parent?.id
      ? await getModuleDetail(page.request, session.accessToken, 'purchase-orders', String(parent.id))
      : null
    const firstMaterialCode = String(detail?.items?.[0]?.materialCode || '').trim()

    test.skip(!orderNo, '真实数据中没有可导入的采购订单')

    await page.goto('/purchase-inbounds')
    await getButton(page, '新增').click()
    await getButton(page, '导入采购订单明细').click()

    await doubleClickVisibleOverlayRow(page, '选择上级采购订单', orderNo)

    await expect(page.locator('#editor-field-purchase-inbounds-purchaseOrderNo')).toHaveValue(orderNo)
    if (parent?.supplierName) {
      await expect(page.locator('.editor-form-shell')).toContainText(String(parent.supplierName))
    }
    if (firstMaterialCode) {
      await expect(page.locator('.module-detail-table')).toContainText(firstMaterialCode)
    }
  })

  test('supports parent import preview flow for sales orders', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const parents = await listModuleRecords(page.request, session.accessToken, 'purchase-inbounds', { size: 1 })
    const parent = parents[0]
    const inboundNo = String(parent?.inboundNo || '').trim()
    const detail = parent?.id
      ? await getModuleDetail(page.request, session.accessToken, 'purchase-inbounds', String(parent.id))
      : null
    const firstMaterialCode = String(detail?.items?.[0]?.materialCode || '').trim()

    test.skip(!inboundNo, '真实数据中没有可导入的采购入库单')

    await page.goto('/sales-orders')
    await getButton(page, '新增').click()
    await getButton(page, '导入采购入库明细').click()

    await doubleClickVisibleOverlayRow(page, '选择上级采购入库单', inboundNo)

    await expect(page.locator('#editor-field-sales-orders-purchaseInboundNo')).toHaveValue(inboundNo)
    if (firstMaterialCode) {
      await expect(page.locator('.module-detail-table')).toContainText(firstMaterialCode)
    }
  })

  test('supports parent import preview flow for sales outbounds', async ({ page }) => {
    await primeRealAuthSession(page)

    await page.goto('/sales-outbounds')
    await getButton(page, '新增').click()
    await getButton(page, '导入销售订单明细').click()

    const overlay = getVisibleOverlay(page, '选择上级销售订单')
    await expect(overlay).toBeVisible()
    const importableRows = overlay.locator('tbody tr')
    test.skip(await importableRows.count() === 0, '真实导入弹层中没有可导入的销售订单')
    const firstRow = importableRows.first()
    await expect(firstRow).toBeVisible()
    const firstRowText = (await firstRow.textContent()) || ''
    const orderNo = firstRowText.match(/\d{4}SO\d{6}/)?.[0] || ''

    test.skip(!orderNo, '真实导入弹层中没有可导入的销售订单')

    await firstRow.dblclick()

    await expect(page.locator('#editor-field-sales-outbounds-salesOrderNo')).toHaveValue(orderNo)
    await expect(getSelectField(page, 'editor-field-sales-outbounds-customerName')).not.toHaveText(/^$/)
    await expect(page.locator('#editor-field-sales-outbounds-projectName')).not.toHaveValue('')
    await expect(page.locator('.module-detail-table tbody tr:not(.ant-table-measure-row)').first()).toBeVisible()
  })

  test('supports freight bill import preview and total calculation flow', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const parents = await listModuleRecords(page.request, session.accessToken, 'sales-outbounds', { size: 1 })
    const parent = parents[0]
    const outboundNo = String(parent?.outboundNo || '').trim()

    test.skip(!outboundNo, '真实数据中没有可导入的销售出库单')

    await page.goto('/freight-bills')
    await getButton(page, '新增物流单').click()
    await getButton(page, '导入销售出库明细').click()

    await doubleClickVisibleOverlayRow(page, '选择上级销售出库单', outboundNo)

    await expect(page.locator('#editor-field-freight-bills-outboundNo')).toHaveValue(outboundNo)
    if (parent?.customerName) {
      await expectSelectValue(page, 'editor-field-freight-bills-customerName', String(parent.customerName))
    }
    await page.locator('#editor-field-freight-bills-unitPrice').fill('100')
    await expect(page.locator('#editor-field-freight-bills-unitPrice')).toHaveValue('100')
  })

  test('supports freight pickup list for live freight bills', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const bills = await listModuleRecords(page.request, session.accessToken, 'freight-bills', { size: 1 })
    const billNo = String(bills[0]?.billNo || '').trim()

    test.skip(!billNo, '真实数据中没有物流单')

    await page.goto('/freight-bills')
    const row = page.locator('tr', { hasText: billNo }).first()
    await expect(row).toBeVisible()
    await row.locator('input[type="checkbox"]').check({ force: true })

    await getButton(page, '生成提货清单').click()

    const pickupTitle = page.locator('.workspace-overlay-title', { hasText: '提货清单' })
    await expect(pickupTitle).toBeVisible()
    await expect(page.locator('.workspace-overlay-body')).toContainText('已选物流单 1 张')
    await expect(page.locator('.workspace-overlay-body')).toContainText(billNo)
  })

  test('persists column settings for materials list', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const materials = await listModuleRecords(page.request, session.accessToken, 'materials', { size: 1 })
    const materialCode = String(materials[0]?.materialCode || '').trim()

    test.skip(!materialCode, '真实数据中没有商品资料')

    await page.goto('/materials')

    await page.getByRole('button', { name: /^列设置$/ }).click()
    const popover = page.locator('.column-setting-popover:visible').last()
    await expect(popover).toBeVisible()
    await popover.getByRole('checkbox', { name: '备注' }).uncheck()

    await expect
      .poll(async () =>
        page.evaluate(() => window.localStorage.getItem('aries-list-column-settings:materials')),
      )
      .toContain('"remark"')

    await page.reload()
    await expect(page.getByRole('button', { name: /^列设置$/ })).toBeVisible()
  })
})
