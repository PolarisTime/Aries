import {
  e2eApiUrl,
  getCurrentAccessToken,
  loginAsE2eUser,
} from './support/business-e2e'
import { expect, test } from './support/test'

const APP_BASE_URL = 'http://127.0.0.1:3100'

interface PurchaseOrderRecord {
  id?: string
  orderNo?: string
  items?: Array<Record<string, unknown>>
}

test('purchase order editor loads detail items from detail api', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await loginAsE2eUser(page)
  const token = await getCurrentAccessToken(page)
  const headers = { Authorization: `Bearer ${token}` }

  const listResponse = await page.request.get(
    e2eApiUrl('purchase-order', '?page=0&size=50'),
    { headers },
  )
  expect(listResponse.ok(), '读取采购订单列表失败').toBeTruthy()
  const listPayload = (await listResponse.json()) as {
    code: number
    data?: {
      content?: PurchaseOrderRecord[]
      records?: PurchaseOrderRecord[]
      rows?: PurchaseOrderRecord[]
    }
  }
  expect(listPayload.code).toBe(0)
  const records =
    listPayload.data?.content ||
    listPayload.data?.records ||
    listPayload.data?.rows ||
    []

  let target: PurchaseOrderRecord | null = null
  for (const record of records) {
    const id = String(record.id || '').trim()
    const orderNo = String(record.orderNo || '').trim()
    if (!id || !orderNo) {
      continue
    }

    const detailResponse = await page.request.get(
      e2eApiUrl('purchase-order', id),
      { headers },
    )
    if (!detailResponse.ok()) {
      continue
    }
    const detailPayload = (await detailResponse.json()) as {
      code: number
      data?: PurchaseOrderRecord
    }
    if (
      detailPayload.code === 0 &&
      Array.isArray(detailPayload.data?.items) &&
      detailPayload.data.items.length > 0
    ) {
      target = detailPayload.data
      break
    }
  }

  test.skip(!target, '真实后端没有含明细的采购订单')
  expect(target).toBeTruthy()
  if (!target) {
    return
  }

  const targetId = String(target.id || '')
  const targetOrderNo = String(target.orderNo || '')
  const targetItems = target.items || []
  await page.goto(`${APP_BASE_URL}/purchase-order`, {
    waitUntil: 'networkidle',
  })

  const orderNoInput = page.getByPlaceholder('输入采购订单号')
  await orderNoInput.fill(targetOrderNo)
  const queryButton = page.getByRole('button', { name: /查\s*询/ })
  if (
    (await queryButton.count()) > 0 &&
    (await queryButton.first().isVisible())
  ) {
    await queryButton.first().click()
  } else {
    await orderNoInput.press('Enter')
  }

  const row = page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: targetOrderNo })
    .first()
  await expect(row).toBeVisible()
  const detailRequest = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().endsWith(`/purchase-orders/${targetId}`) &&
      response.ok(),
  )
  await row.dblclick()
  await detailRequest

  const overlay = page.locator('.workspace-overlay-panel').last()
  await expect(overlay).toBeVisible()
  const detailRows = overlay.locator(
    '.module-detail-table tbody tr:not(.ant-table-measure-row)',
  )
  await expect(detailRows).toHaveCount(targetItems.length)

  const firstItem = targetItems[0] || {}
  const snapshotValues = [
    firstItem.brand,
    firstItem.category,
    firstItem.material,
    firstItem.spec,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  expect(snapshotValues.length, '采购订单明细缺少商品快照字段').toBeGreaterThan(
    0,
  )
  for (const value of snapshotValues) {
    await expect(overlay.locator('.module-detail-table')).toContainText(value)
  }
})
