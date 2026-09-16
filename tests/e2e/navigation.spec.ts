import { expect } from '@playwright/test'
import { gotoRoute, loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

interface RouteCase {
  path: string
  heading: string
  /** 工作台等页面没有以页面名命名的标题，使用一级标题兜底校验。 */
  headingKind: 'name' | 'level1'
  hasTable: boolean
}

const ROUTE_CASES: RouteCase[] = [
  {
    path: '/dashboard',
    heading: '工作台',
    headingKind: 'level1',
    hasTable: false,
  },
  {
    path: '/material',
    heading: '商品资料',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/material-categories',
    heading: '商品类别',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/supplier',
    heading: '供应商资料',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/customer',
    heading: '客户资料',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/project',
    heading: '项目资料',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/carrier',
    heading: '物流方资料',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/warehouse',
    heading: '仓库资料',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/company-setting',
    heading: '结算主体管理',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/purchase-order',
    heading: '采购订单',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/purchase-inbound',
    heading: '采购入库',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/sales-order',
    heading: '销售订单',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/sales-outbound',
    heading: '销售出库',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/sales-return',
    heading: '销售退货单',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/freight-bill',
    heading: '物流单',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/customer-statement',
    heading: '客户对账单',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/freight-statement',
    heading: '物流对账单',
    headingKind: 'name',
    hasTable: true,
  },
  { path: '/receipt', heading: '收款单', headingKind: 'name', hasTable: true },
  { path: '/payment', heading: '付款单', headingKind: 'name', hasTable: true },
  {
    path: '/operation-log',
    heading: '操作日志',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/inventory',
    heading: '库存查询',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/finance-overview',
    heading: '财务概览',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/cash-ledger',
    heading: '资金流水',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/price-compare',
    heading: '报单比价',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/market-sync',
    heading: '行情同步',
    headingKind: 'name',
    hasTable: true,
  },
  {
    path: '/print-template',
    heading: '打印模板',
    headingKind: 'name',
    hasTable: false,
  },
  {
    path: '/account',
    heading: '个人账号',
    headingKind: 'name',
    hasTable: false,
  },
]

test.describe('当前应用路由可加载', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  for (const routeCase of ROUTE_CASES) {
    test(`${routeCase.path} 渲染 ${routeCase.heading} 且无致命错误`, async ({
      page,
      assertNoFatalUiErrors,
    }) => {
      await gotoRoute(page, routeCase.path)
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
      if (routeCase.headingKind === 'level1') {
        await expect(page.locator('h1').first()).toBeVisible({
          timeout: 30_000,
        })
      } else {
        await expect(
          page.getByRole('heading', { name: routeCase.heading }).first(),
        ).toBeVisible({ timeout: 30_000 })
      }
      if (routeCase.hasTable) {
        await expect(page.locator('table:visible').first()).toBeVisible({
          timeout: 30_000,
        })
      }
      expect((await page.locator('body').innerText()).length).toBeGreaterThan(0)
      await assertNoFatalUiErrors()
    })
  }
})
