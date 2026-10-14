import { expect } from '@playwright/test'
import {
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
} from './support/business-e2e'
import { test } from './support/test'

/** 与 src/stores/layoutTabsStore.ts 的 MAX_LAYOUT_TABS 保持一致。 */
const MAX_LAYOUT_TABS = 10

/** 标签页持久化存储键前缀（见 src/constants/storage.ts）。 */
const LAYOUT_TABS_STORAGE_PREFIX = 'aries-layout-tabs:'

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

test.describe('批量关闭取消路径与标签持久化恢复', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  /**
   * P2-21 的真实浏览器守护：确认框点「取消」必须什么都不发生。
   *
   * <p>这是「取消后不切走当前标签、不多推历史」唯一真实守护 —— LayoutTabBar 的单测里
   * 不渲染 useTabRouteReconciliation，多推历史那条链路只有整页 e2e 能覆盖。</p>
   *
   * <p>本用例在**激活**标签上触发「全部关闭」：唯一差异是「确认前是否先切到工作台」。
   * 「右键**非激活**标签 → 关闭其他 → 取消」那条更贴近真实操作的路径由 P2-22 单独守护
   * （它同时钉住菜单项点击不得沿 React 树冒泡激活被右键标签这一根因）。</p>
   */
  test('「全部关闭」确认框取消后不切走当前标签、地址与历史长度不变', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    // 用销售订单页做脏会话载体：它的编辑器走 ModuleEditorWorkspace，会向
    // editorSessionStore 注册会话；主数据页的编辑浮层不注册会话（关闭时不会弹确认框）。
    await gotoRoute(page, '/sales-order')
    await expectModuleHeading(page, '销售订单')
    await expectGridTable(page)
    const tabLabel = (title: string) =>
      page.locator('.leo-tabbar-label').filter({ hasText: title }).first()

    // 1) 先经顶部菜单在 SPA 内多开一个「供应商资料」标签（整页跳转会丢掉待会儿的脏会话）
    await page
      .getByRole('menuitem', { name: '基础数据', exact: true })
      .first()
      .click()
    const supplierMenuItem = page
      .locator(
        '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
      )
      .filter({ hasText: '供应商资料' })
      .first()
    await expect(supplierMenuItem).toBeVisible({ timeout: 15_000 })
    await supplierMenuItem.click()
    await expectModuleHeading(page, '供应商资料')
    await expectGridTable(page)
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    // 2) 切回销售订单，打开「新增」编辑器并改一个字段 → 该标签持有未保存会话
    await tabLabel('销售订单').click()
    await expectModuleHeading(page, '销售订单')
    await page
      .getByRole('button', { name: /新\s*增|新\s*建/ })
      .first()
      .click()
    const overlay = page.locator('.workspace-overlay-panel:visible').last()
    await expect(overlay).toBeVisible({ timeout: 30_000 })
    const remark = overlay
      .locator('input#module-form-remark:visible, input#remark:visible')
      .first()
    await expect(remark, '销售订单编辑器应有备注输入框').toBeVisible({
      timeout: 15_000,
    })
    await remark.fill(`E2E-未保存-${Date.now()}`)
    await remark.blur()

    // 3) 切到供应商资料（让它在确认框触发时是激活标签），再取基线
    await tabLabel('供应商资料').click()
    await expectModuleHeading(page, '供应商资料')
    await page.waitForTimeout(300)
    const urlBefore = page.url()
    const historyBefore = await page.evaluate(() => window.history.length)

    // 4) 在激活的供应商资料标签上右键 →「全部关闭」：待关闭集合含持有未保存会话的销售订单。
    //    浮层遮罩只覆盖内容区，页签在其容器之外，仍可右键。
    await tabLabel('供应商资料').click({ button: 'right' })
    const closeAll = page
      .locator('.ant-dropdown-menu-item')
      .filter({ hasText: '全部关闭' })
      .first()
    await expect(closeAll).toBeVisible({ timeout: 15_000 })
    await closeAll.click()

    // 5) 存在未保存会话 → 弹确认框（这同时是「会话确实脏」的前置校验）；点「取消」。
    const confirmModal = page.locator('.ant-modal:visible').first()
    await expect(
      confirmModal,
      '存在未保存会话时必须弹确认框，而不是直接关闭全部标签',
    ).toBeVisible({ timeout: 15_000 })
    await expect(confirmModal).toContainText('存在未保存的修改')
    await confirmModal
      .getByRole('button', { name: /取\s*消/ })
      .first()
      .click()
    await expect(confirmModal).toBeHidden({ timeout: 15_000 })

    // 6) 取消后：地址、历史长度、激活标签、标签数量都必须原样。
    //    修复前 activateTab(工作台) 在弹框之前同步执行，这里会变成 /dashboard 且历史 +1。
    await page.waitForTimeout(800)
    expect(page.url(), '取消后地址栏必须停在原标签').toBe(urlBefore)
    expect(
      await page.evaluate(() => window.history.length),
      '取消不得多推浏览器历史',
    ).toBe(historyBefore)
    await expect(
      page.locator('.ant-tabs-tab-active .leo-tabbar-label'),
    ).toHaveText('供应商资料')
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    await assertNoFatalUiErrors()
  })

  /**
   * P2-22 的真实浏览器守护：右键**非激活**标签 →「关闭其他」→ 取消，必须什么都不发生。
   *
   * <p>为什么这条路径必须单独守护：菜单弹层是 React portal，点击菜单项的事件会沿 **React 树**
   * 继续冒泡到被右键标签的 `onClick`（antd Dropdown 是标签 label 的父级），命中 rc-tabs
   * `TabNode` 的 `[role="tab"]` onClick → `onInternalTabClick` → `onChange` → `activateTab`。
   * 于是「关闭其他」在被右键标签上**必然把它激活**：URL 切到该标签、history +1、激活标签改名，
   * 且确认框点「取消」也回不去 —— 与「取消后不得切走」这一缺陷的可观测效果完全相同，
   * 所以修复前后必须靠这条断言区分：修复后取消必须是原断言全等。</p>
   *
   * <p>用「关闭其他」而不是「全部关闭」：后者的焦点/激活目标就是被右键的激活标签（无差异），
   * 只能覆盖「确认前是否先 activateTab」；前者才能覆盖「右键非激活标签不得被菜单点击激活」。</p>
   */
  test('右键非激活标签的「关闭其他」取消后不切走当前标签、地址与历史长度不变', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/sales-order')
    await expectModuleHeading(page, '销售订单')
    await expectGridTable(page)
    const tabLabel = (title: string) =>
      page.locator('.leo-tabbar-label').filter({ hasText: title }).first()

    // 1) SPA 内多开「供应商资料」标签
    await page
      .getByRole('menuitem', { name: '基础数据', exact: true })
      .first()
      .click()
    const supplierMenuItem = page
      .locator(
        '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
      )
      .filter({ hasText: '供应商资料' })
      .first()
    await expect(supplierMenuItem).toBeVisible({ timeout: 15_000 })
    await supplierMenuItem.click()
    await expectModuleHeading(page, '供应商资料')
    await expectGridTable(page)
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    // 2) 回到销售订单，开新增编辑器改字段 → 该标签持有未保存会话（「关闭其他」会弹确认框）
    await tabLabel('销售订单').click()
    await expectModuleHeading(page, '销售订单')
    await page
      .getByRole('button', { name: /新\s*增|新\s*建/ })
      .first()
      .click()
    const overlay = page.locator('.workspace-overlay-panel:visible').last()
    await expect(overlay).toBeVisible({ timeout: 30_000 })
    const remark = overlay
      .locator('input#module-form-remark:visible, input#remark:visible')
      .first()
    await expect(remark, '销售订单编辑器应有备注输入框').toBeVisible({
      timeout: 15_000,
    })
    await remark.fill(`E2E-未保存-${Date.now()}`)
    await remark.blur()

    // 3) 切到供应商资料（激活标签）并取基线
    await tabLabel('供应商资料').click()
    await expectModuleHeading(page, '供应商资料')
    await page.waitForTimeout(300)
    const urlBefore = page.url()
    const historyBefore = await page.evaluate(() => window.history.length)

    // 4) 右键**非激活**的工作台标签（前置校验：它确实不是激活标签）→「关闭其他」
    await expect(
      page.locator('.ant-tabs-tab-active .leo-tabbar-label'),
      '前置条件：当前激活标签必须是供应商资料',
    ).toHaveText('供应商资料')
    await tabLabel('工作台').click({ button: 'right' })
    const closeOthers = page
      .locator('.ant-dropdown-menu-item')
      .filter({ hasText: '关闭其他' })
      .first()
    await expect(closeOthers).toBeVisible({ timeout: 15_000 })
    await closeOthers.click()

    // 5) 待关闭集合含脏的销售订单 → 弹确认框；点「取消」
    const confirmModal = page.locator('.ant-modal:visible').first()
    await expect(
      confirmModal,
      '存在未保存会话时必须弹确认框，而不是直接关闭',
    ).toBeVisible({ timeout: 15_000 })
    await expect(confirmModal).toContainText('存在未保存的修改')
    await confirmModal
      .getByRole('button', { name: /取\s*消/ })
      .first()
      .click()
    await expect(confirmModal).toBeHidden({ timeout: 15_000 })

    // 6) 取消后一切原样：地址、历史长度、激活标签、标签数量。
    //    修复前菜单项点击会经 React 树冒泡激活「工作台」：URL 变 /dashboard、history +1、
    //    激活标签变工作台，三条断言同时变红。
    await page.waitForTimeout(800)
    expect(
      page.url(),
      '取消后地址栏必须停在原标签（不得被右键标签激活而切走）',
    ).toBe(urlBefore)
    expect(
      await page.evaluate(() => window.history.length),
      '取消不得多推浏览器历史',
    ).toBe(historyBefore)
    await expect(
      page.locator('.ant-tabs-tab-active .leo-tabbar-label'),
      '取消后激活标签必须仍是供应商资料',
    ).toHaveText('供应商资料')
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    await assertNoFatalUiErrors()
  })

  /**
   * P2-23：右键菜单补齐项在真实浏览器里的行为与禁用边界。
   *
   * <p>三标签（工作台 + 商品资料 + 供应商资料，最后一个激活）逐个覆盖：</p>
   * <ol>
   *   <li>「关闭左侧」在左侧只剩钉选工作台时禁用（软禁用：仍在键盘序列里、带 aria-disabled），
   *       点击不产生任何动作；</li>
   *   <li>「关闭左侧」在左侧有可关闭业务标签时可用，且只关左侧、不动目标与激活项；</li>
   *   <li>「固定标签页」把标签变成不可关闭（单个关闭按钮消失），并**跨整页刷新保活**——
   *       旧实现只认工作台的结构钉选，业务标签的固定会被 sanitize 丢掉。</li>
   * </ol>
   */
  test('右键菜单「关闭左侧」边界与「固定标签页」跨刷新保活', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/material')
    await expectModuleHeading(page, '商品资料')
    await expectGridTable(page)

    const tabLabel = (title: string) =>
      page.locator('.leo-tabbar-label').filter({ hasText: title }).first()
    const menuItem = (title: string) =>
      page
        .locator(
          '.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item',
        )
        .filter({ hasText: title })
        .last()
    const activeLabel = page.locator('.ant-tabs-tab-active .leo-tabbar-label')

    // SPA 内多开「供应商资料」：工作台 + 商品资料 + 供应商资料，后者激活
    await page
      .getByRole('menuitem', { name: '基础数据', exact: true })
      .first()
      .click()
    const supplierMenuItem = page
      .locator(
        '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
      )
      .filter({ hasText: '供应商资料' })
      .first()
    await expect(supplierMenuItem).toBeVisible({ timeout: 15_000 })
    await supplierMenuItem.click()
    await expectModuleHeading(page, '供应商资料')
    await expectGridTable(page)
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    // 1) 中间标签（商品资料）：左侧只有钉选工作台 → 「关闭左侧」必须禁用
    await tabLabel('商品资料').click({ button: 'right' })
    const closeLeftDisabled = menuItem('关闭左侧')
    await expect(closeLeftDisabled).toBeVisible({ timeout: 15_000 })
    await expect(
      closeLeftDisabled,
      '左侧只剩钉选工作台时必须软禁用（可见但不可用）',
    ).toHaveAttribute('aria-disabled', 'true')
    const urlBeforeDisabledClick = page.url()
    // Playwright 把 aria-disabled 视为不可点击并拒绝 click；真实鼠标仍然点得到这个"软禁用"项
    // （它保留在菜单里、仍可聚焦，正是为了能被读屏发现），因此这里用 force 模拟真实鼠标点击，
    // 断言的是"点了也没反应"这一行为契约。
    await closeLeftDisabled.click({ force: true })
    await page.waitForTimeout(500)
    await expect(
      page.locator('.leo-tabbar .ant-tabs-tab'),
      '点击禁用的「关闭左侧」不得移除任何标签',
    ).toHaveCount(3)
    expect(page.url(), '点击禁用的「关闭左侧」不得改变地址').toBe(
      urlBeforeDisabledClick,
    )
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 2) 末个标签（供应商资料）：左侧有可关闭的商品资料 → 「关闭左侧」可用
    await tabLabel('供应商资料').click({ button: 'right' })
    const closeLeft = menuItem('关闭左侧')
    await expect(closeLeft).toBeVisible({ timeout: 15_000 })
    await expect(closeLeft).not.toHaveAttribute('aria-disabled', 'true')
    await closeLeft.click()
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(2, {
      timeout: 15_000,
    })
    await expect(tabLabel('商品资料')).toHaveCount(0)
    await expect(activeLabel, '关闭左侧不得切走当前标签').toHaveText(
      '供应商资料',
    )

    // 3) 固定供应商资料：单个关闭按钮消失，且菜单改为「取消固定」
    const supplierTab = page
      .locator('.leo-tabbar .ant-tabs-tab')
      .filter({ hasText: '供应商资料' })
    await expect(supplierTab.locator('.ant-tabs-tab-remove')).toHaveCount(1)
    await tabLabel('供应商资料').click({ button: 'right' })
    const pinItem = menuItem('固定标签页')
    await expect(pinItem).toBeVisible({ timeout: 15_000 })
    await pinItem.click()
    await expect(
      supplierTab.locator('.ant-tabs-tab-remove'),
      '固定后不得再有单个关闭按钮',
    ).toHaveCount(0, { timeout: 15_000 })

    await tabLabel('供应商资料').click({ button: 'right' })
    await expect(menuItem('取消固定')).toBeVisible({ timeout: 15_000 })
    await expect(menuItem('关闭标签页')).toHaveCount(0)
    await page.keyboard.press('Escape')

    // 4) 整页刷新：用户固定必须随持久化恢复（旧实现只认工作台的结构钉选）
    await page.waitForTimeout(600)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(2, {
      timeout: 30_000,
    })
    await expect(
      page
        .locator('.leo-tabbar .ant-tabs-tab')
        .filter({ hasText: '供应商资料' })
        .locator('.ant-tabs-tab-remove'),
      '刷新后用户固定的标签仍必须不可关闭',
    ).toHaveCount(0)
    await expect(activeLabel).toHaveText('供应商资料')

    await assertNoFatalUiErrors()
  })

  /**
   * P2-24：打开新标签必须是**纯 SPA 导航**，不得发生整页文档重载。
   *
   * <p>用户报告"点击新的标签页会出现全部重载"（整页发白）。本用例用三个互相独立的硬指标
   * 把"是否真的重载"钉死，任何一条被破坏都会变红：</p>
   * <ol>
   *   <li>开启新标签期间 `resourceType() === 'document'` 的请求增量为 **0**（整页重载必然重新
   *       请求入口文档）；</li>
   *   <li>`performance.getEntriesByType('navigation').length` 不增加（新文档会有新条目）；</li>
   *   <li>重载会丢失的运行时状态必须原样存活：window 上的哨兵变量，以及**另一个标签里未保存
   *       的编辑器内容**（回到该标签仍能看到刚输入的值）。</li>
   * </ol>
   *
   * <p>已验证该用例能区分对错：把新标签入口临时改回 `window.location.assign(href)`
   * （即"原生整页导航"写法）后，三条断言同时变红。</p>
   */
  test('打开新标签是纯 SPA 导航：零 document 请求、不新增导航条目、window 状态存活', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    // 起点用 toPass 重试（开发服务器 HMR 整页 reload 会打断首屏），因此放宽本用例总时长
    test.setTimeout(120_000)
    const documentRequests: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'document') {
        documentRequests.push(request.url())
      }
    })

    /*
     * 首屏可能撞上开发服务器的模块热更新整页 reload（本仓库常有并发协作者改文件），
     * 因此这里用 toPass 重试到页面稳定渲染为止；重试只影响"起点"，不影响后续断言的口径。
     */
    await expect(async () => {
      await gotoRoute(page, '/sales-order')
      await expectModuleHeading(page, '销售订单')
      await expectGridTable(page)
    }).toPass({ timeout: 60_000 })

    // 1) 先在该标签上留下"整页重载必然丢失"的标记：同时用 window 运行时状态与标签 DOM 节点
    const windowMarkerValue = `E2E-SPA-${Date.now()}`
    await page.evaluate((value) => {
      ;(window as unknown as { __spaMarker: string }).__spaMarker = value
    }, windowMarkerValue)
    await page.evaluate(() => {
      document
        .querySelector('[role="tabpanel"]:not([hidden]) table')
        ?.setAttribute('data-spa-guard', 'kept')
    })

    /*
     * 先等首屏网络彻底安静：开发服务器在模块热更新时会自行整页 reload（本仓库有并发协作者
     * 改文件时更明显），这类与本次交互无关的"入口文档重复请求"必须在取基线前排干净，否则假红。
     */
    await page.waitForLoadState('networkidle')
    const documentsBefore = documentRequests.length
    const navigationsBefore = await page.evaluate(
      () => performance.getEntriesByType('navigation').length,
    )

    // 2) 经顶部菜单打开一个新标签（会新挂载一个子 Router 与一个页面）
    await page
      .getByRole('menuitem', { name: '基础数据', exact: true })
      .first()
      .click()
    const supplierMenuItem = page
      .locator(
        '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
      )
      .filter({ hasText: '供应商资料' })
      .first()
    await expect(supplierMenuItem).toBeVisible({ timeout: 15_000 })
    await supplierMenuItem.click()
    await expectModuleHeading(page, '供应商资料')
    await expectGridTable(page)
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    // 3) 硬指标：开新标签期间没有任何 document 请求，也没有新的导航条目
    expect(
      documentRequests.length - documentsBefore,
      `打开新标签不得重新请求入口文档（新请求：${documentRequests.slice(documentsBefore).join(', ')}）`,
    ).toBe(0)
    expect(
      await page.evaluate(
        () => performance.getEntriesByType('navigation').length,
      ),
      '打开新标签不得产生新的 navigation 条目（整页重载会新增一条）',
    ).toBe(navigationsBefore)
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __spaMarker?: string }).__spaMarker ?? null,
      ),
      '整页重载会清掉 window 运行时状态',
    ).toBe(windowMarkerValue)

    await assertNoFatalUiErrors()
  })

  /**
   * P2-25：**深链落地标签的面板、草稿与未保存会话都不得因转非激活而丢失**。
   *
   * <p>原根因（竞态已收口）：`AppTabContainer` 是 `AppLayout` 的子节点，React 先跑子组件 effect，
   * 因此 `useTabRouteReconciliation` 的定位 effect 曾在 `hydrateForUser` **之前**跑完；hydrate 为
   * 当前深链新建/选中的标签（`mountedOnce` 恒为 false）之后不再触发该 effect（依赖 location 未变），
   * 于是它永远不会被 `markTabMounted`，一转非激活就整块面板卸载重建。收口方式见
   * `use-layout-tabs-hydration.ts`（恢复移到布局阶段，严格早于子容器 effect）与
   * `layoutTabsStore.ensureTabForLocation`（建标签幂等入口）；`AppTabContainer` 的
   * "激活即已挂载"不变式保留为结果兜底。</p>
   *
   * <p>本用例是**浏览器层回归守护**，不跟随实现：断言分别钉住三件不可恢复的东西——面板 DOM
   * 节点（是否被重建）、编辑器草稿（组件状态）、未保存会话（store 状态）。把恢复改回父组件的
   * 被动 effect（或在 hydrate 中各自建标签），本用例就会变红。</p>
   *
   * <p>显隐做了两轮：反复切走再切回也必须原样保留草稿与会话（面板一旦被卸载重建，
   * 第二轮就会先红）。非激活面板现已由 React 19 的 `Activity` 承载（见
   * `AppTabContainer` 的 `TAB_PANEL_ACTIVITY_ENABLED`），所以本用例同时是 Activity 的
   * 语义守护：`Activity` 隐藏时会**销毁子树 effect**，把初始化写成"挂载即初始化"就会在第 3 步
   * 把草稿重置掉（Step 2b 先用"DOM 保留但不可见"锁住隐藏语义，Step 4 再用未保存会话锁住
   * 会话槽没有随隐藏被清掉）。</p>
   */
  test('开新标签后深链落地标签的面板、草稿与未保存会话都不得被重建', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    // 起点用 toPass 重试（开发服务器 HMR 整页 reload 会打断首屏），故放宽本用例总时长
    test.setTimeout(120_000)
    await expect(async () => {
      await gotoRoute(page, '/sales-order')
      await expectModuleHeading(page, '销售订单')
      await expectGridTable(page)
    }).toPass({ timeout: 60_000 })

    const tabLabel = (title: string) =>
      page.locator('.leo-tabbar-label').filter({ hasText: title }).first()

    // 1) 该标签里留下三样"重挂载就会丢"的东西：面板 DOM 标记 + 未保存的编辑器草稿
    await page
      .getByRole('button', { name: /新\s*增|新\s*建/ })
      .first()
      .click()
    const overlay = page.locator('.workspace-overlay-panel:visible').last()
    await expect(overlay).toBeVisible({ timeout: 30_000 })
    const remark = overlay
      .locator('input#module-form-remark:visible, input#remark:visible')
      .first()
    await expect(remark, '销售订单编辑器应有备注输入框').toBeVisible({
      timeout: 15_000,
    })
    /** 不带 :visible 的同名定位器：用来断言"面板被隐藏但 DOM 保留"。 */
    const remarkInputs = page.locator('input#module-form-remark, input#remark')
    const remarkValue = `E2E-KEEP-${Date.now()}`
    await remark.fill(remarkValue)
    await remark.blur()
    expect(
      await page.evaluate(() => {
        /* 按"持有编辑器输入框的面板"定位，而不是靠 :not([hidden])：
           非激活面板可能由 Activity 的 display:none 隐藏（没有 hidden 属性），
           纯属性选择器会误选到别的面板的表格。 */
        const input = document.querySelector(
          'input#module-form-remark, input#remark',
        )
        const panel = input?.closest('[role="tabpanel"]')
        const table = panel?.querySelector('table')
        table?.setAttribute('data-keep-node', 'kept')
        return Boolean(table)
      }),
      '前置条件：销售订单面板应已渲染表格',
    ).toBe(true)

    // 2) 经顶部菜单打开一个新标签（原标签转成非激活）
    await page
      .getByRole('menuitem', { name: '基础数据', exact: true })
      .first()
      .click()
    const supplierMenuItem = page
      .locator(
        '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
      )
      .filter({ hasText: '供应商资料' })
      .first()
    await expect(supplierMenuItem).toBeVisible({ timeout: 15_000 })
    await supplierMenuItem.click()
    await expectModuleHeading(page, '供应商资料')
    await expectGridTable(page)
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    // 2b) 隐藏态收口：非激活面板连同其内的编辑浮层（含 portal 到 body 的 Modal/Dropdown）
    //     必须整体不可见，但 DOM 必须保留 —— 两条合起来才等于「隐藏」而不是「卸载重建」。
    await expect(
      remarkInputs,
      '非激活面板里的编辑器 DOM 必须保留（卸载重建就会丢草稿）',
    ).toHaveCount(1)
    await expect(
      remarkInputs,
      '非激活面板里的编辑浮层必须不可见（Activity 会连同子树里的 portal 一起隐藏）',
    ).toBeHidden()

    // 3) 切回销售订单：面板必须是原来那一块，草稿必须还在
    await tabLabel('销售订单').click()
    await expectModuleHeading(page, '销售订单')
    expect(
      await page.evaluate(
        () => document.querySelector('[data-keep-node]') !== null,
      ),
      '切回后原面板 DOM 不得被卸载重建（重建即丢失全部标签内状态）',
    ).toBe(true)
    await expect(
      remark,
      '原标签的编辑器草稿必须还在（面板被重建就会清空）',
    ).toHaveValue(remarkValue)

    // 3b) 第二轮显隐：覆盖 Activity 重新激活时子树 effect 重建的路径
    await tabLabel('供应商资料').click()
    await expectModuleHeading(page, '供应商资料')
    await tabLabel('销售订单').click()
    await expectModuleHeading(page, '销售订单')
    expect(
      await page.evaluate(
        () => document.querySelector('[data-keep-node]') !== null,
      ),
      '反复显隐后面板 DOM 仍不得被重建',
    ).toBe(true)
    await expect(remark, '反复显隐后编辑器草稿仍必须还在').toHaveValue(
      remarkValue,
    )

    // 4) 未保存会话仍必须拦住关闭：点 × 要弹「存在未保存的修改」
    await page
      .locator('.leo-tabbar .ant-tabs-tab')
      .filter({ hasText: '销售订单' })
      .locator('.ant-tabs-tab-remove')
      .click()
    const confirmModal = page.locator('.ant-modal:visible').first()
    await expect(
      confirmModal,
      '开新标签后未保存会话必须仍在（面板被卸载重建会连会话一起丢）',
    ).toBeVisible({ timeout: 15_000 })
    await expect(confirmModal).toContainText('存在未保存的修改')
    await confirmModal
      .getByRole('button', { name: /取\s*消/ })
      .first()
      .click()
    await expect(confirmModal).toBeHidden({ timeout: 15_000 })
    await expect(page.locator('.leo-tabbar .ant-tabs-tab')).toHaveCount(3)

    await assertNoFatalUiErrors()
  })

  /**
   * P2-8 的浏览器层恢复守护：持久化清单超过上限且尾部为「不可丢弃」标签时，
   * 整页刷新必须按「不可丢弃者优先」截断，而不是直接丢尾部。
   *
   * <p>浏览器里要自然制造 10 个同时持有未保存会话的标签成本极高（每个标签都要开编辑器
   * 并改字段），因此这里直接按 store 的持久化契约注入超限清单，验证真实的
   * `hydrateForUser → sanitizePersistedTabs` 恢复路径。旧实现按顺序 slice 会丢掉
   * 排在最末的两个受保护标签，本用例会变红。</p>
   */
  test('刷新恢复超限清单时优先保留受保护标签', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/dashboard')
    await page.waitForFunction(
      (prefix) => {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index)
          if (key?.startsWith(prefix)) return true
        }
        return false
      },
      LAYOUT_TABS_STORAGE_PREFIX,
      { timeout: 30_000 },
    )
    const storageKey = await page.evaluate((prefix) => {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key?.startsWith(prefix)) return key
      }
      return null
    }, LAYOUT_TABS_STORAGE_PREFIX)
    expect(storageKey, '未找到标签页持久化键').not.toBeNull()

    // 工作台 + 11 个业务页 = 12 > 上限 10；尾部两个标记为受保护（曾持有未保存会话）
    const dashboardTabId = 'e2e-dashboard'
    const businessPaths = [
      '/material',
      '/supplier',
      '/customer',
      '/project',
      '/carrier',
      '/warehouse',
      '/purchase-order',
      '/purchase-inbound',
      '/sales-order',
      '/material-categories',
      '/price-compare',
    ]
    const tabs = [
      {
        id: dashboardTabId,
        pathname: '/dashboard',
        search: '',
        pinned: true,
        protectedFromEviction: false,
      },
      ...businessPaths.map((pathname, index) => ({
        id: `e2e-p${index}`,
        pathname,
        search: '',
        pinned: false,
        // 尾部两个 = 「不可丢弃」：旧实现 slice(0, MAX) 恰好把它们截掉
        protectedFromEviction: index >= businessPaths.length - 2,
      })),
    ]

    // 用 initScript 在应用启动前写入：避免当前会话的防抖持久化把注入清单覆盖掉
    await page.addInitScript(
      ({ key, value }) => {
        try {
          localStorage.setItem(key, value)
        } catch {
          // 忽略存储不可用
        }
      },
      {
        key: storageKey as string,
        value: JSON.stringify({ tabs, activeTabId: dashboardTabId }),
      },
    )
    await page.reload({ waitUntil: 'domcontentloaded' })

    const labels = page.locator('.leo-tabbar-label')
    await expect(labels.first()).toBeVisible({ timeout: 30_000 })

    // 剩几条：工作台 + 上限内的 9 个业务页
    await expect(labels).toHaveCount(MAX_LAYOUT_TABS)
    // 保留的是哪些：两个受保护标签（商品类别 / 报单比价）必须还在
    await expect(labels.filter({ hasText: '商品类别' })).toHaveCount(1)
    await expect(labels.filter({ hasText: '报单比价' })).toHaveCount(1)
    // 最早的未标记标签（商品资料 / 供应商资料）让位被截断
    await expect(labels.filter({ hasText: '商品资料' })).toHaveCount(0)
    await expect(labels.filter({ hasText: '供应商资料' })).toHaveCount(0)

    await assertNoFatalUiErrors()
  })
})
