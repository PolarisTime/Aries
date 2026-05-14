import type { Page } from '@playwright/test'
import {
  fetchCollection,
  pickSearchTerm,
  primeApiKeySession,
} from './support/api-key'
import { expect, test } from './support/test'

interface BusinessActionRoute {
  path: string
  title: string
  apiPath: string
  searchKeys?: string[]
}

const businessActionRoutes: BusinessActionRoute[] = [
  {
    path: '/material',
    title: '商品资料',
    apiPath: 'material',
    searchKeys: ['materialCode', 'materialName'],
  },
  {
    path: '/supplier',
    title: '供应商资料',
    apiPath: 'supplier',
    searchKeys: ['supplierCode', 'supplierName'],
  },
  {
    path: '/customer',
    title: '客户资料',
    apiPath: 'customer',
    searchKeys: ['customerCode', 'customerName'],
  },
  {
    path: '/purchase-order',
    title: '采购订单',
    apiPath: 'purchase-order',
    searchKeys: ['orderNo'],
  },
  {
    path: '/purchase-inbound',
    title: '采购入库',
    apiPath: 'purchase-inbound',
    searchKeys: ['inboundNo'],
  },
  {
    path: '/sales-order',
    title: '销售订单',
    apiPath: 'sales-order',
    searchKeys: ['orderNo'],
  },
  {
    path: '/sales-outbound',
    title: '销售出库',
    apiPath: 'sales-outbound',
    searchKeys: ['outboundNo'],
  },
  {
    path: '/receipt',
    title: '收款单',
    apiPath: 'receipt',
    searchKeys: ['receiptNo'],
  },
  {
    path: '/payment',
    title: '付款单',
    apiPath: 'payment',
    searchKeys: ['paymentNo'],
  },
]

async function expectBusinessPageLoaded(page: Page, title: string) {
  const activeTab = page.getByRole('tab', {
    selected: true,
    name: title,
  })
  if ((await activeTab.count()) > 0) {
    await expect(activeTab).toBeVisible()
  } else {
    await expect(page.locator('main')).toContainText(title)
  }
  await expect(page.getByPlaceholder('搜索关键词...')).toBeVisible()
}

async function closeWorkspaceOverlay(page: Page) {
  const overlay = page.locator('.workspace-overlay-panel').last()
  await overlay.locator('.workspace-overlay-close').click()
  await expect(page.locator('.workspace-overlay-panel')).toHaveCount(0)
}

async function openEditor(page: Page, title: string) {
  const createButton = page.getByRole('button', { name: '新建' })
  await expect(createButton).toBeVisible()
  await createButton.click()

  const overlay = page.locator('.workspace-overlay-panel').last()
  await expect(overlay).toBeVisible()
  await expect(overlay.locator('.workspace-overlay-title')).toContainText(
    `新建 — ${title}`,
  )
  return overlay
}

function queryButton(page: Page) {
  return page.getByRole('button', { name: /查\s*询/ })
}

function resetButton(page: Page) {
  return page.getByRole('button', { name: /重\s*置/ })
}

test.describe('business editor action smoke', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  for (const route of businessActionRoutes) {
    test(`covers create/edit/query-reset for ${route.title}`, async ({
      page,
      assertNoFatalUiErrors,
    }) => {
      const collection = await fetchCollection(page.request, route.apiPath)

      await page.goto(route.path)
      await expectBusinessPageLoaded(page, route.title)

      const createButton = page.getByRole('button', { name: '新建' })
      await expect(createButton).toBeVisible()
      await createButton.click()

      const createOverlay = page.locator('.workspace-overlay-panel').last()
      await expect(createOverlay).toBeVisible()
      await expect(
        createOverlay.locator('.workspace-overlay-title'),
      ).toContainText(`新建 — ${route.title}`)
      await closeWorkspaceOverlay(page)

      const keywordInput = page.getByPlaceholder('搜索关键词...')
      let searchTerm = ''

      if (collection.ok && collection.records.length > 0) {
        searchTerm = pickSearchTerm(collection.records[0], route.searchKeys)
        if (searchTerm) {
          await keywordInput.fill(searchTerm)
          await queryButton(page).click()
          await expect(page.locator('table')).toContainText(searchTerm)
        }

        const editButton = page
          .locator('table')
          .getByRole('button', { name: '编辑' })
          .first()
        await expect(editButton).toBeVisible()
        await editButton.click()

        const editOverlay = page.locator('.workspace-overlay-panel').last()
        await expect(editOverlay).toBeVisible()
        await expect(
          editOverlay.locator('.workspace-overlay-title'),
        ).toContainText(`编辑 — ${route.title}`)
        await closeWorkspaceOverlay(page)
      }

      if (!searchTerm) {
        await keywordInput.fill(route.title)
      }
      await resetButton(page).click()
      await expect(keywordInput).toHaveValue('')

      await assertNoFatalUiErrors()
    })
  }

  test('supports parent import in purchase inbound editor', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await page.goto('/purchase-inbound')
    await expectBusinessPageLoaded(page, '采购入库')

    const overlay = await openEditor(page, '采购入库')
    const importButton = overlay.getByRole('button', {
      name: '导入采购订单明细',
    })
    await expect(importButton).toBeVisible()
    await importButton.click()

    const drawer = page.locator('.ant-drawer').last()
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('选择上级采购订单')

    const firstRow = drawer.locator('tbody tr').first()
    await expect(firstRow).toBeVisible()
    const firstCell = firstRow.locator('td').first()
    const parentNo = (await firstCell.innerText()).trim()
    await firstRow.click()

    await expect(page.locator('.ant-drawer')).toHaveCount(0)
    await expect(overlay.getByLabel('关联订单')).toHaveValue(parentNo)
    await expect(
      overlay.locator('tbody tr:not(.ant-table-measure-row)').first(),
    ).toBeVisible()

    await closeWorkspaceOverlay(page)
    await assertNoFatalUiErrors()
  })

  test('opens attachment modal from sales order list action', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const collection = await fetchCollection(page.request, 'sales-order')
    test.skip(
      !collection.ok || collection.records.length === 0,
      '真实环境无销售订单数据可用于附件 smoke',
    )

    await page.goto('/sales-order')
    await expectBusinessPageLoaded(page, '销售订单')

    const attachButton = page
      .locator('table')
      .getByRole('button', { name: '附件' })
      .first()
    await expect(attachButton).toBeVisible()
    await attachButton.click()

    const modal = page.locator('.ant-modal').last()
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('附件管理')
    await expect(modal.getByRole('button', { name: '上传附件' })).toBeVisible()

    await modal.getByRole('button', { name: 'Close' }).click()
    await expect(modal).not.toBeVisible()
    await assertNoFatalUiErrors()
  })
})
