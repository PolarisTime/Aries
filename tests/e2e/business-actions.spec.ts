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
  searchInputName: RegExp
}

const businessActionRoutes: BusinessActionRoute[] = [
  {
    path: '/material',
    title: '商品资料',
    apiPath: 'material',
    searchKeys: ['materialCode', 'materialName'],
    searchInputName: /关键字|关键词/,
  },
  {
    path: '/supplier',
    title: '供应商资料',
    apiPath: 'supplier',
    searchKeys: ['supplierCode', 'supplierName'],
    searchInputName: /关键字|关键词/,
  },
  {
    path: '/customer',
    title: '客户资料',
    apiPath: 'customer',
    searchKeys: ['customerCode', 'customerName'],
    searchInputName: /关键字|关键词/,
  },
  {
    path: '/purchase-order',
    title: '采购订单',
    apiPath: 'purchase-order',
    searchKeys: ['orderNo'],
    searchInputName: /单据编号|关键词/,
  },
  {
    path: '/purchase-inbound',
    title: '采购入库',
    apiPath: 'purchase-inbound',
    searchKeys: ['inboundNo'],
    searchInputName: /入库单号|关键词/,
  },
  {
    path: '/sales-order',
    title: '销售订单',
    apiPath: 'sales-order',
    searchKeys: ['orderNo'],
    searchInputName: /单据编号|关键词/,
  },
  {
    path: '/sales-outbound',
    title: '销售出库',
    apiPath: 'sales-outbound',
    searchKeys: ['outboundNo'],
    searchInputName: /出库单号|关键词/,
  },
  {
    path: '/receipt',
    title: '收款单',
    apiPath: 'receipt',
    searchKeys: ['receiptNo'],
    searchInputName: /关键词|单据编号/,
  },
  {
    path: '/payment',
    title: '付款单',
    apiPath: 'payment',
    searchKeys: ['paymentNo'],
    searchInputName: /关键词|单据编号/,
  },
]

function createButton(page: Page) {
  return page.getByRole('button', { name: /新建|新增|Create/ })
}

function searchInput(page: Page, route: BusinessActionRoute) {
  return page
    .locator('input[name="keyword"]')
    .or(page.getByRole('textbox', { name: route.searchInputName }))
    .first()
}

async function gotoBusinessRoute(page: Page, path: string) {
  const loginUrlPattern = /\/login(?:\?|$)/

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(path, { waitUntil: 'networkidle' })
    if (!loginUrlPattern.test(page.url())) {
      return
    }
    await primeApiKeySession(page)
  }

  throw new Error(`登录态注入后仍被重定向到登录页：${page.url()}`)
}

async function expectBusinessPageLoaded(
  page: Page,
  route: BusinessActionRoute,
) {
  await expect(page).toHaveURL(new RegExp(`${route.path}(?:\\?|$)`))
  await expect(
    page.getByRole('button', { name: route.title, exact: true }),
  ).toBeVisible()
  await expect(searchInput(page, route)).toBeVisible()
  await expect(createButton(page)).toBeVisible()
  await expect(page.locator('table').first()).toBeVisible()
}

async function closeWorkspaceOverlay(page: Page) {
  const overlay = page.locator('.workspace-overlay-panel').last()
  await overlay.locator('.workspace-overlay-close').click()
  await expect(page.locator('.workspace-overlay-panel')).toHaveCount(0)
}

async function openEditor(page: Page, title: string) {
  const button = createButton(page)
  await expect(button).toBeVisible()
  await button.click()

  const overlay = page.locator('.workspace-overlay-panel').last()
  await expect(overlay).toBeVisible()
  await expect(overlay.locator('.workspace-overlay-title')).toContainText(
    `新建 — ${title}`,
  )
  return overlay
}

function queryButton(page: Page) {
  return page.getByRole('button', { name: /查\s*询|Search|Query/ })
}

function resetButton(page: Page) {
  return page.getByRole('button', { name: /重\s*置|Reset/ })
}

async function applySearch(page: Page, input: ReturnType<typeof searchInput>) {
  const button = queryButton(page)
  if ((await button.count()) > 0 && (await button.first().isVisible())) {
    await button.first().click()
    return
  }

  await input.press('Enter')
}

async function openExistingEditor(page: Page, title: string) {
  const editButton = page
    .locator('table')
    .getByRole('button', { name: '编辑' })
    .first()

  if ((await editButton.count()) > 0) {
    await expect(editButton).toBeVisible()
    await editButton.click()
  } else {
    const firstRow = page
      .locator('tbody tr:not(.ant-table-measure-row)')
      .filter({ has: page.locator('td') })
      .first()
    await expect(firstRow).toBeVisible()
    await firstRow.dblclick()
  }

  const overlay = page.locator('.workspace-overlay-panel').last()
  await expect(overlay).toBeVisible()
  await expect(overlay.locator('.workspace-overlay-title')).toContainText(
    `编辑 — ${title}`,
  )
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

      await gotoBusinessRoute(page, route.path)
      await expectBusinessPageLoaded(page, route)

      const button = createButton(page)
      await expect(button).toBeVisible()
      await button.click()

      const createOverlay = page.locator('.workspace-overlay-panel').last()
      await expect(createOverlay).toBeVisible()
      await expect(
        createOverlay.locator('.workspace-overlay-title'),
      ).toContainText(`新建 — ${route.title}`)
      await closeWorkspaceOverlay(page)

      const keywordInput = searchInput(page, route)
      let searchTerm = ''

      if (collection.ok && collection.records.length > 0) {
        searchTerm = pickSearchTerm(collection.records[0], route.searchKeys)
        if (searchTerm) {
          await keywordInput.fill(searchTerm)
          await applySearch(page, keywordInput)
          await expect(page.locator('table')).toContainText(searchTerm)
        }

        await openExistingEditor(page, route.title)
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
    await gotoBusinessRoute(page, '/purchase-inbound')
    await expectBusinessPageLoaded(page, businessActionRoutes[4])

    const overlay = await openEditor(page, '采购入库')
    const importButton = overlay.getByRole('button', {
      name: '导入采购订单明细',
    })
    await expect(importButton).toBeVisible()
    await importButton.click()

    const selector = page
      .locator('.workspace-overlay-panel')
      .filter({ hasText: '选择采购订单' })
      .last()
    await expect(selector).toBeVisible()
    await expect(selector.locator('.workspace-overlay-title')).toContainText(
      '选择采购订单',
    )

    const firstRow = selector
      .locator('tbody tr:not(.ant-table-measure-row)')
      .filter({ hasText: /PO\d+|\d{12,}/ })
      .first()
    await expect(firstRow).toBeVisible()
    const parentText = (await firstRow.innerText()).trim()
    const parentNo = parentText.match(/PO\d+|\d{12,}/)?.[0] || ''
    expect(parentNo).toBeTruthy()
    await firstRow.click()

    await expect(selector).not.toBeVisible()
    await expect(overlay.getByLabel('采购订单号')).toHaveValue(parentNo)
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
    let coveredRoute: BusinessActionRoute | null = null

    for (const route of businessActionRoutes) {
      const collection = await fetchCollection(page.request, route.apiPath)
      if (!collection.ok || collection.records.length === 0) {
        continue
      }

      await gotoBusinessRoute(page, route.path)
      await expectBusinessPageLoaded(page, route)

      const attachButton = page
        .locator('table')
        .getByRole('button', { name: /附件/ })
        .first()
      if ((await attachButton.count()) === 0) {
        continue
      }

      await expect(attachButton).toBeVisible()
      await attachButton.click()
      coveredRoute = route
      break
    }

    test.skip(!coveredRoute, '真实环境无可用于附件 smoke 的业务记录')

    const modal = page.locator('.ant-modal').last()
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('附件管理')
    await expect(modal.getByRole('button', { name: '上传附件' })).toBeVisible()

    await modal.getByRole('button', { name: 'Close' }).click()
    await expect(modal).not.toBeVisible()
    await assertNoFatalUiErrors()
  })
})
