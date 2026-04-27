import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { isMockBackendMode } from './support/backend-mode'
import {
  primeRealAuthSession,
  realAdminCredentials,
} from './support/real-session'

interface LeoListResponse<T extends Record<string, unknown>> {
  code: number
  message?: string
  data: {
    records: T[]
  }
}

interface LeoDetailResponse<T extends Record<string, unknown>> {
  code: number
  message?: string
  data: T
}

interface LiveModuleCase {
  route: string
  title: string
  apiPath: string
  firstRowKey: string
  emptyStateText?: string
}

const liveModuleCases: LiveModuleCase[] = [
  {
    route: '/materials',
    title: '商品资料',
    apiPath: 'materials',
    firstRowKey: 'materialCode',
    emptyStateText: '暂无数据',
  },
  {
    route: '/purchase-orders',
    title: '采购订单',
    apiPath: 'purchase-orders',
    firstRowKey: 'orderNo',
    emptyStateText: '暂无数据',
  },
  {
    route: '/sales-orders',
    title: '销售订单',
    apiPath: 'sales-orders',
    firstRowKey: 'orderNo',
    emptyStateText: '暂无数据',
  },
  {
    route: '/freight-bills',
    title: '物流单',
    apiPath: 'freight-bills',
    firstRowKey: 'billNo',
    emptyStateText: '暂无数据',
  },
  {
    route: '/payments',
    title: '付款单',
    apiPath: 'payments',
    firstRowKey: 'paymentNo',
    emptyStateText: '暂无数据',
  },
]

interface LiveReadOnlyCase {
  route: string
  title: string
  apiPath: string
  filterPlaceholder: string
  filterValueKey: string
  alternateValueKey?: string
  detailTitle: string
  detailExpectations: string[]
}

const liveReadOnlyCases: LiveReadOnlyCase[] = [
  {
    route: '/purchase-contracts',
    title: '采购合同',
    apiPath: 'purchase-contracts',
    filterPlaceholder: '输入采购合同号',
    filterValueKey: 'contractNo',
    detailTitle: '采购合同详情',
    detailExpectations: ['contractNo', 'supplierName', 'status'],
  },
  {
    route: '/sales-contracts',
    title: '销售合同',
    apiPath: 'sales-contracts',
    filterPlaceholder: '输入销售合同号',
    filterValueKey: 'contractNo',
    detailTitle: '销售合同详情',
    detailExpectations: ['contractNo', 'customerName', 'projectName'],
  },
  {
    route: '/inventory-report',
    title: '商品库存报表',
    apiPath: 'inventory-report',
    filterPlaceholder: '商品编码 / 品牌 / 规格',
    filterValueKey: 'materialCode',
    detailTitle: '商品库存报表详情',
    detailExpectations: ['materialCode', 'warehouseName', 'batchNo'],
  },
  {
    route: '/io-report',
    title: '出入库报表',
    apiPath: 'io-report',
    filterPlaceholder: '输入来源单号',
    filterValueKey: 'sourceNo',
    alternateValueKey: 'businessType',
    detailTitle: '出入库报表详情',
    detailExpectations: ['sourceNo', 'businessType', 'materialCode'],
  },
]

test.describe('@real live backend smoke', () => {
  test.skip(isMockBackendMode, '真实后端用例在 mock 模式下跳过')

  test('redirects anonymous users to login without mock interceptors', async ({ page }) => {
    await page.goto('/materials')

    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)materials/)
    await expect(page.getByRole('heading', { name: '用户登录' })).toBeVisible()
  })

  test('logs in against the real backend and renders dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill(realAdminCredentials.loginName)
    await page.getByPlaceholder('请输入密码').fill(realAdminCredentials.password)
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('.header-page-title')).toHaveText('工作台')
    await expect(page.locator('.dashboard-title')).toHaveText(/^(Dashboard|系统首页)$/)
    await expect(page.getByText(/^(Current User|当前账号)$/)).toBeVisible()
    await expect(page.getByText(/^(Live Signals|实时信号)$/)).toBeVisible()
    await expect(page.locator('.dashboard-stat-card strong').first()).toHaveText('系统管理员')
  })

  test('loads core business pages from the live api', async ({ page }) => {
    const session = await primeRealAuthSession(page)

    for (const moduleCase of liveModuleCases) {
      const records = await listModuleRecords(page.request, session.accessToken, moduleCase.apiPath)

      await page.goto(moduleCase.route)

      await expect(page).toHaveURL(new RegExp(`${moduleCase.route}(?:\\?.*)?$`))
      await expect(page.locator('.header-page-title')).toHaveText(moduleCase.title)
      await expect(page.getByRole('button', { name: /查\s*询/ })).toBeVisible()

      if (records.length > 0) {
        const firstValue = String(records[0]?.[moduleCase.firstRowKey] || '').trim()
        expect(firstValue, `${moduleCase.apiPath} 首行 ${moduleCase.firstRowKey} 不应为空`).toBeTruthy()
        await expect(page.locator('table')).toContainText(firstValue)
      } else if (moduleCase.emptyStateText) {
        await expect(page.getByText(moduleCase.emptyStateText, { exact: true })).toBeVisible()
      }
    }
  })

  test('opens purchase order detail from global search with live data', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const purchaseOrders = await listModuleRecords(page.request, session.accessToken, 'purchase-orders')
    const purchaseOrder = purchaseOrders[0]
    const orderNo = String(purchaseOrder?.orderNo || '').trim()

    test.skip(!orderNo, '真实数据中没有采购订单，跳过全局搜索详情联调')

    await page.goto('/dashboard')
    await page.getByPlaceholder('搜索单号、合同号、对账单号').fill(orderNo)

    const dropdown = page.locator('.ant-select-dropdown:visible').last()
    await expect(dropdown).toBeVisible()
    await dropdown.locator('.ant-select-item-option', { hasText: orderNo }).first().click()

    await expect(page).toHaveURL(new RegExp(`/purchase-orders\\?docNo=${orderNo}&openDetail=1$`))
    await expect(page.locator('.workspace-overlay-title', { hasText: '采购订单详情' })).toBeVisible()
    await expect(page.locator('.bill-detail-body')).toContainText(orderNo)
    if (purchaseOrder?.supplierName) {
      await expect(page.locator('.bill-detail-body')).toContainText(String(purchaseOrder.supplierName))
    }
  })

  test('persists personal settings and logs out against the live backend', async ({ page }) => {
    await primeRealAuthSession(page)

    await page.goto('/materials')
    await page.getByText('个人设置', { exact: true }).click()

    const personalSettingsDialog = page.getByRole('dialog', { name: '个人设置' })
    await expect(personalSettingsDialog).toBeVisible()
    await chooseModalSelect(page, '16px')
    await personalSettingsDialog.getByRole('button', { name: /保\s*存/ }).click()

    await expect(personalSettingsDialog).not.toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          fontSize: document.documentElement.style.getPropertyValue('--app-font-size').trim(),
          settings: window.localStorage.getItem('aries-personal-settings'),
        })),
      )
      .toEqual({
        fontSize: '16px',
        settings: JSON.stringify({ fontSize: 16 }),
      })

    await page.getByText('退出登录', { exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: '用户登录' })).toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          token: window.localStorage.getItem('aries-token'),
          user: window.localStorage.getItem('aries-user'),
          authPersistence: window.localStorage.getItem('aries-auth-persistence'),
        })),
      )
      .toEqual({
        token: null,
        user: null,
        authPersistence: null,
      })
  })

  test('filters materials using live data', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const materials = await listModuleRecords(page.request, session.accessToken, 'materials')
    const firstMaterialCode = String(materials[0]?.materialCode || '').trim()
    const secondMaterialCode = String(materials[1]?.materialCode || '').trim()

    test.skip(!(firstMaterialCode && secondMaterialCode), '真实数据中商品不足 2 条，跳过筛选联调')

    await page.goto('/materials')
    await expect(page.locator('table')).toContainText(firstMaterialCode)
    await expect(page.locator('table')).toContainText(secondMaterialCode)

    await page.getByPlaceholder('商品编码 / 品牌 / 规格').fill(secondMaterialCode)
    await page.getByRole('button', { name: /查\s*询/ }).click()

    await expect(page.locator('table')).toContainText(secondMaterialCode)
    await expect(page.locator('table')).not.toContainText(firstMaterialCode)
  })

  test('opens purchase order detail overlay from the live list', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const purchaseOrders = await listModuleRecords(page.request, session.accessToken, 'purchase-orders')
    const purchaseOrder = purchaseOrders[0]
    const orderNo = String(purchaseOrder?.orderNo || '').trim()
    const supplierName = String(purchaseOrder?.supplierName || '').trim()
    const detail = orderNo && purchaseOrder?.id
      ? await getModuleDetail(page.request, session.accessToken, 'purchase-orders', String(purchaseOrder.id))
      : null
    const firstItemCode = String(detail?.items?.[0]?.materialCode || '').trim()

    test.skip(!orderNo, '真实数据中没有采购订单，跳过采购订单详情联调')

    await page.goto('/purchase-orders')
    await page.getByPlaceholder('输入采购订单号').fill(orderNo)
    await page.getByRole('button', { name: /查\s*询/ }).click()

    const orderRow = page.locator('tr', { hasText: orderNo })
    await expect(orderRow).toBeVisible()
    await orderRow.getByText('查看').click()

    const detailTitle = page.locator('.workspace-overlay-title', { hasText: '采购订单详情' })
    await expect(detailTitle).toBeVisible()
    await expect(page.locator('.bill-detail-body')).toContainText(orderNo)
    if (supplierName) {
      await expect(page.locator('.bill-detail-body')).toContainText(supplierName)
    }
    if (firstItemCode) {
      await expect(page.locator('.module-detail-table')).toContainText(firstItemCode)
    }

    await page.getByRole('button', { name: /关\s*闭/ }).click()
    await expect(detailTitle).not.toBeVisible()
  })

  test('opens the material selector dialog with live material data', async ({ page }) => {
    const session = await primeRealAuthSession(page)
    const materialRows = await listModuleRecords(page.request, session.accessToken, 'materials')
    const firstMaterialCode = String(materialRows[0]?.materialCode || '').trim()

    test.skip(!firstMaterialCode, '真实数据中没有可选商品，跳过商品弹窗联调')

    await page.goto('/purchase-orders')
    await page.getByRole('button', { name: /新\s*增/ }).click()
    await page.getByRole('button', { name: /新增明细/ }).click()
    await page.getByTitle('弹窗选择商品').click()

    const selectorTitle = page.locator('.workspace-overlay-title', { hasText: '选择商品' })
    await expect(selectorTitle).toBeVisible()
    await page.getByPlaceholder('输入商品编码、品牌、材质、规格搜索').fill(firstMaterialCode)
    await page.locator('tr', { hasText: firstMaterialCode }).first().dblclick()

    await expect(selectorTitle).not.toBeVisible()
    await expect(page.locator('.module-detail-table')).toContainText(firstMaterialCode)
  })

  for (const readOnlyCase of liveReadOnlyCases) {
    test(`filters and opens detail for ${readOnlyCase.apiPath} with live data`, async ({ page }) => {
      const session = await primeRealAuthSession(page)
      const rows = await listModuleRecords(page.request, session.accessToken, readOnlyCase.apiPath)
      const firstRow = rows[0]
      const secondRow = rows[1]
      const primaryValue = String(firstRow?.[readOnlyCase.filterValueKey] || '').trim()
      const alternateValue = readOnlyCase.alternateValueKey
        ? String(firstRow?.[readOnlyCase.alternateValueKey] || '').trim()
        : ''
      const hiddenValue = String(secondRow?.[readOnlyCase.filterValueKey] || '').trim()

      test.skip(!primaryValue, `${readOnlyCase.apiPath} 没有可用真实数据`)

      await page.goto(readOnlyCase.route)
      await page.getByPlaceholder(readOnlyCase.filterPlaceholder).fill(primaryValue)
      await page.getByRole('button', { name: /查\s*询/ }).click()

      await expect(page.locator('table')).toContainText(primaryValue)
      if (hiddenValue) {
        await expect(page.locator('table')).not.toContainText(hiddenValue)
      }

      const reportRow = page.locator('tr', { hasText: primaryValue }).first()
      await expect(reportRow).toBeVisible()
      await reportRow.getByText('查看').click()

      const detailTitle = page.locator('.workspace-overlay-title', { hasText: readOnlyCase.detailTitle })
      await expect(detailTitle).toBeVisible()

      const detailBody = page.locator('.bill-detail-body')
      for (const fieldKey of readOnlyCase.detailExpectations) {
        const fieldValue = String(firstRow?.[fieldKey] || '').trim()
        if (fieldValue) {
          await expect(detailBody).toContainText(fieldValue)
        }
      }
      if (alternateValue) {
        await expect(detailBody).toContainText(alternateValue)
      }
    })
  }
})

async function chooseModalSelect(page: Page, optionText: string) {
  const modal = page.locator('.ant-modal:visible').last()
  const select = modal.locator('.ant-select').first()
  await select.click()
  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible()
  await dropdown.locator('.ant-select-item-option', { hasText: optionText }).first().click()
}

async function listModuleRecords(
  request: APIRequestContext,
  accessToken: string,
  apiPath: string,
) {
  const response = await request.get(`http://127.0.0.1:11211/api/${apiPath}?page=0&size=5`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as LeoListResponse<Record<string, unknown>>
  expect(payload.code, payload.message || `${apiPath} 列表加载失败`).toBe(0)
  return Array.isArray(payload.data?.records) ? payload.data.records : []
}

async function getModuleDetail(
  request: APIRequestContext,
  accessToken: string,
  apiPath: string,
  id: string,
) {
  const response = await request.get(`http://127.0.0.1:11211/api/${apiPath}/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as LeoDetailResponse<Record<string, unknown>>
  expect(payload.code, payload.message || `${apiPath} 详情加载失败`).toBe(0)
  return payload.data || null
}
