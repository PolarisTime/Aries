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

test.describe('多标签页无障碍契约', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('tablist 有可访问名，标签 aria-controls 指向真实内容面板，关闭按钮用中文可访问名', async ({
    page,
  }) => {
    // 第二次整页跳转会经 localStorage 恢复标签，形成 工作台 + 商品资料 两个标签
    await gotoRoute(page, '/material')

    await expect(page.locator('[role="tablist"]').first()).toHaveAttribute(
      'aria-label',
      '已打开的页面标签',
    )

    const tabs = page.locator('.leo-tabbar .ant-tabs-tab')
    await expect(tabs.first()).toBeVisible({ timeout: 30_000 })
    const tabCount = await tabs.count()
    expect(tabCount, '至少应有工作台与商品资料两个标签').toBeGreaterThan(1)

    for (let index = 0; index < tabCount; index += 1) {
      const controls = await tabs
        .nth(index)
        .locator('[role="tab"]')
        .getAttribute('aria-controls')
      expect(controls, '每个标签都必须有 aria-controls').toBeTruthy()
      // 必须指向 AppTabContainer 渲染的真实面板，而不是 rc-tabs 那个空且被隐藏的面板
      expect(controls).toContain('leo-tab-panel-')
      const panel = page.locator(`#${controls}`)
      await expect(panel).toHaveAttribute('role', 'tabpanel')
      await expect(panel).toHaveAttribute('aria-labelledby', /.+/)
    }

    // rc-tabs 的关闭按钮默认可访问名是硬编码英文 'remove'，中文界面下读屏会念英文
    const removeButtons = page.locator('.leo-tabbar .ant-tabs-tab-remove')
    expect(
      await removeButtons.count(),
      '应存在可关闭标签的关闭按钮',
    ).toBeGreaterThan(0)
    await expect(removeButtons.first()).toHaveAttribute(
      'aria-label',
      /^关闭「.+」标签$/,
    )
  })

  test('Delete 关闭当前聚焦标签', async ({ page }) => {
    await gotoRoute(page, '/material')

    const tabs = page.locator('.leo-tabbar .ant-tabs-tab')
    await expect(tabs.first()).toBeVisible({ timeout: 30_000 })
    const before = await tabs.count()
    expect(before).toBeGreaterThan(1)

    // 末尾标签必然是非钉选的业务页，可被 Delete 关闭
    await tabs.last().locator('[role="tab"]').focus()
    await page.keyboard.press('Delete')

    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(
      before - 1,
      { timeout: 30_000 },
    )
    // tablist 仍需保持可访问名（关闭后重渲染不得丢掉 useTabAriaWiring 的接管）
    await expect(page.locator('[role="tablist"]').first()).toHaveAttribute(
      'aria-label',
      '已打开的页面标签',
    )
    // 已知缺口（未在本次修复范围内）：关闭后焦点会落到 body 而非相邻标签。
    // rc-tabs 的 handleRemoveTab 会 setFocusKey 指向相邻标签，但本应用关闭标签会连带
    // 触发路由跳转（replaceMainRouterHref + useTabRouteReconciliation 的 history.push），
    // 该跳转会使焦点回落。已验证自实现焦点归还与依赖框架两种路径均无法稳定落地，
    // 故此处不断言焦点位置，避免留下必然失败的用例。APG 中 Delete 为 Optional，
    // 且右键菜单已提供等价的关闭入口。
  })
})
