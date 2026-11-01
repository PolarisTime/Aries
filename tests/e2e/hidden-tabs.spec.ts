import type { Locator, Page } from '@playwright/test'
import { gotoRouteE2e, loginE2e } from './ops-e2e-support'
import { expect, test } from './support/test'

/**
 * 页面合并后的隐藏标签（宿主页 `?tab=`）真实链路。
 *
 * <p>合并方案把「材料类别 / 定尺加价 / 值映射」并进商品资料、把「取价地区」并进项目资料，
 * 被并页从菜单隐藏但**路由与深链保留**。这里锁三件事：</p>
 * <ol>
 *   <li>`?tab=<key>` 直达时宿主页标签选中、内容面板渲染对应页面；</li>
 *   <li>刷新（深链）后仍停留在该标签；</li>
 *   <li>被并页的隐藏深链（`/length-premium` 等）落到对应标签，且菜单里不再出现这些入口。</li>
 * </ol>
 *
 * <p>断言用**页面真实业务数据**（定尺 12米 +30 与打印后缀 *12、值映射 直条→螺纹钢、
 * 取价地区 上海/shanghai）而不是标题文字，避免「标签选中但内容空白」被判为通过。</p>
 *
 * <p>标签条要等权限水合完成才齐全：无权限的标签不渲染，而权限来自登录用户
 * （`usePermissions` 读 authStore）。所以先断言「完整标签清单」再断言选中态，
 * 不能只等第一个标签出现就断言，否则会读到水合前的中间态（只有无权限要求的标签）。</p>
 */
test.describe('页面合并隐藏标签', () => {
  test.setTimeout(180_000)
  // 宿主页标签条 + 顶栏菜单在多标签场景下需要足够的横向空间（窄屏会折行）。
  test.use({ viewport: { width: 1473, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
    await ensureSessionPermissions(page)
  })

  /**
   * 补齐会话里的 permissions。
   *
   * <p>e2e 注入的浏览器会话只保留 `id / loginName / userName`（见 `support/api-key.ts`
   * 的 `loginWithPassword`），`permissions` 被丢掉；而会话注入用的是 `addInitScript`，
   * 每次导航都会重写 `aries-user`。页面启动时若 `/auth/refresh` 失败，
   * `restoreSession` 回退到这份本地用户，权限过滤的宿主页标签（定尺加价 / 值映射 / 取价地区）
   * 就会消失，用例结果取决于 refresh 是否成功。生产登录会话里 permissions 一定存在，
   * 这里按同一口径补齐，并且同样用 `addInitScript` 使其在每次导航的会话注入之后生效；
   * 只影响本 spec 的会话，不动共享 helper。</p>
   */
  async function ensureSessionPermissions(page: Page) {
    await page.addInitScript(() => {
      const raw = localStorage.getItem('aries-user')
      if (!raw) return
      try {
        const user = JSON.parse(raw) as { permissions?: unknown }
        if (Array.isArray(user.permissions) && user.permissions.length > 0) {
          return
        }
        localStorage.setItem(
          'aries-user',
          JSON.stringify({ ...user, permissions: ['*'] }),
        )
      } catch {
        // 用户 JSON 坏了就让页面自己按未登录处理，交给断言暴露。
      }
    })
  }

  const hostTabs = (page: Page) =>
    page.locator('.master-host-tabs .ant-tabs-tab')
  const activeHostTab = (page: Page) =>
    page.locator('.master-host-tabs .ant-tabs-tab-active')
  /**
   * 当前激活标签的内容面板。
   *
   * <p>antd 6 把激活态放在 `.ant-tabs-content-active`（旧版 `.ant-tabs-tabpane-active`
   * 已不存在，见 `master-host-tabs.css` 注释），因此按内容区定位。</p>
   */
  const activeHostPane = (page: Page) =>
    page.locator('.master-host-tabs .ant-tabs-content-active').first()
  const shellActiveTabLabel = (page: Page) =>
    page.locator('.leo-tabbar .ant-tabs-tab-active .leo-tabbar-label').first()

  /** 等宿主页标签条水合到「完整标签清单」，并断言当前选中标签。 */
  async function expectActiveHostTab(
    page: Page,
    labels: string[],
    activeLabel: string,
  ) {
    await expect(hostTabs(page)).toHaveText(labels, { timeout: 30_000 })
    await expect(activeHostTab(page)).toHaveText(activeLabel, {
      timeout: 30_000,
    })
  }

  /** 当前激活标签面板内的业务内容（表格数据，不是标题）。 */
  async function expectActivePaneContains(page: Page, text: string) {
    await expect(activeHostPane(page)).toContainText(text, {
      timeout: 30_000,
    })
  }

  const MATERIAL_TABS = ['商品资料', '商品类别', '定尺加价维护', '值映射维护']
  const PROJECT_TABS = ['项目资料', '取价地区维护']

  test('商品资料 · 定尺加价标签：?tab 直达、金额/后缀可见、刷新保持', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/material?tab=length-premium')

    await expectActiveHostTab(page, MATERIAL_TABS, '定尺加价维护')
    // 外壳标签仍是宿主页「商品资料」：切标签只改 ?tab=，不跨外壳标签。
    await expect(shellActiveTabLabel(page)).toContainText('商品资料')

    // 业务数据：12米 加价 +30、打印规格后缀 *12（主数据实值）。
    await expectActivePaneContains(page, '12米')
    await expectActivePaneContains(page, '+30')
    await expectActivePaneContains(page, '*12')

    const urlBeforeReload = page.url()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectActiveHostTab(page, MATERIAL_TABS, '定尺加价维护')
    await expectActivePaneContains(page, '12米')
    expect(new URL(page.url()).searchParams.get('tab')).toBe('length-premium')
    expect(new URL(urlBeforeReload).searchParams.get('tab')).toBe(
      'length-premium',
    )

    await assertNoFatalUiErrors()
  })

  test('商品资料 · 值映射标签：?tab 直达、映射规则可见、刷新保持', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/material?tab=value-alias')

    await expectActiveHostTab(page, MATERIAL_TABS, '值映射维护')
    await expect(shellActiveTabLabel(page)).toContainText('商品资料')
    // 业务数据：库里现存的类别归一条目「直条 → 螺纹钢」。
    await expectActivePaneContains(page, '直条')
    await expectActivePaneContains(page, '螺纹钢')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectActiveHostTab(page, MATERIAL_TABS, '值映射维护')
    await expectActivePaneContains(page, '直条')
    expect(new URL(page.url()).searchParams.get('tab')).toBe('value-alias')

    await assertNoFatalUiErrors()
  })

  test('项目资料 · 取价地区标签：?tab 直达、城市/子域名可见、刷新保持', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/project?tab=quote-region')

    await expectActiveHostTab(page, PROJECT_TABS, '取价地区维护')
    await expect(shellActiveTabLabel(page)).toContainText('项目资料')
    // 业务数据：上海 / shanghai（西本城市站子域名口径）。
    await expectActivePaneContains(page, '上海')
    await expectActivePaneContains(page, 'shanghai')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectActiveHostTab(page, PROJECT_TABS, '取价地区维护')
    await expectActivePaneContains(page, '上海')
    expect(new URL(page.url()).searchParams.get('tab')).toBe('quote-region')

    await assertNoFatalUiErrors()
  })

  test('被并页深链 /length-premium 落到宿主页对应标签（不 404、菜单已隐藏）', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/length-premium')

    // 路由仍存在：外壳标签用被并页自己的标题，内容渲染在宿主页的对应标签里。
    await expect(shellActiveTabLabel(page)).toContainText('定尺加价维护')
    await expectActiveHostTab(page, MATERIAL_TABS, '定尺加价维护')
    await expectActivePaneContains(page, '12米')

    await assertNoFatalUiErrors()
  })

  test('基础数据菜单只保留宿主页入口，被并页不再出现在菜单', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRouteE2e(page, '/material')
    await expectActiveHostTab(page, MATERIAL_TABS, '商品资料')

    await page
      .getByRole('menuitem', { name: '基础数据', exact: true })
      .first()
      .click()
    const menuItems: Locator = page.locator(
      '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
    )
    await expect(menuItems.first()).toBeVisible({ timeout: 15_000 })

    // 宿主页入口仍在。
    await expect(menuItems.filter({ hasText: '商品资料' }).first()).toBeVisible(
      {
        timeout: 15_000,
      },
    )
    await expect(menuItems.filter({ hasText: '项目资料' }).first()).toBeVisible(
      {
        timeout: 15_000,
      },
    )
    // 被并页入口全部隐藏（不是只剩路由）。
    const joined = (await menuItems.allTextContents()).join('|')
    for (const hiddenLabel of [
      '商品类别',
      '定尺加价维护',
      '值映射维护',
      '取价地区维护',
    ]) {
      expect(joined).not.toContain(hiddenLabel)
    }

    await page.keyboard.press('Escape')
    await assertNoFatalUiErrors()
  })
})
