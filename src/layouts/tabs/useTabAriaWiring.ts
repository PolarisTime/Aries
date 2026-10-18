import type { TFunction } from 'i18next'
import { type RefObject, useLayoutEffect } from 'react'
import { tabPanelDomId } from '@/layouts/tabs/tab-aria-ids'
import { getTabTitle } from '@/layouts/tabs/tab-title'
import type { LayoutTab } from '@/stores/layoutTabsStore'

interface UseTabAriaWiringOptions {
  /** 包住 antd Tabs 的宿主元素，用于在其中查找 tablist 与各标签节点 */
  hostRef: RefObject<HTMLDivElement | null>
  tabs: LayoutTab[]
  t: TFunction
}

/** 关闭标签的键盘等价路径（由 rc-tabs 内置实现，此处只负责让用户"发现"它）。 */
const TAB_CLOSE_KEYSHORTCUTS = 'Delete Backspace'

/**
 * 把 antd Tabs 渲染出的标签与 {@link AppTabContainer} 渲染的真实内容面板接成 APG 语义。
 *
 * <p>下列属性 antd/rc-tabs 都不暴露配置口，只能落到 DOM：</p>
 * <ol>
 *   <li>`tablist` 没有可访问名（rc-tabs 只写 role 与 aria-orientation）——APG 要求
 *       `aria-label` 或 `aria-labelledby` 二者必居其一；</li>
 *   <li>标签的 `aria-controls` 指向 rc-tabs 自己的空面板，而那个面板整体被
 *       `.ant-tabs-body-holder { display: none }` 隐藏，真实内容在 `.leo-tab-panel` 里，
 *       两者之间没有任何关联；</li>
 *   <li>关闭按钮的可访问名是 rc-tabs 硬编码的英文 `remove`，中文界面下读屏会念英文
 *       （antd 6.6.4 不透传 `removeAriaLabel`）；</li>
 *   <li>`role="tablist"` 挂在 `.ant-tabs-nav` 上，而这个容器里除标签外还直接挂着溢出
 *       菜单容器 `.ant-tabs-nav-operations`（内含 `<button class="ant-tabs-nav-more">`）
 *       —— axe 的 `aria-required-children`（critical）会判它非法子项；</li>
 *   <li>关闭按钮 `<button class="ant-tabs-tab-remove">` 是 `.ant-tabs-tab`（无 role 的 div）
 *       的子元素，而 `.ant-tabs-tab` 又是 tablist 的子元素 —— 同一个 `aria-required-children`
 *       规则也会因此报错。</li>
 * </ol>
 *
 * <h3>为什么把 `role="tablist"` 从 `.ant-tabs-nav` 搬到 `.ant-tabs-nav-list`</h3>
 * <p>第 4 条缺陷在 `.ant-tabs-nav` 上无解：溢出菜单容器是 tablist 的**直接子级**，
 * 只要 role 还在 nav 上，就一定带着一个非法子项。而 `.ant-tabs-nav-list` 是标签们的
 * 真实父容器，溢出容器是它的**兄弟**。把 role 迁过去之后，tablist 的语义子项恰好是全部
 * `role="tab"`（实测 axe `aria-required-children` 归零，溢出态也一样）。</p>
 *
 * <p><b>对照实验记录（为什么不是"加个 role 就完事"）</b>：在本仓库真实页面上逐条试过，
 * 只有组合有效 —— 给 `.ant-tabs-nav-operations` 加 `role="presentation"`、给
 * `.ant-tabs-tab` 加 `role="presentation"`、给 tablist 加 `aria-owns`、把
 * `role="tab"` 挪到 `.ant-tabs-tab` 上，**单独使用都仍报违规**（前两者甚至因为
 * "presentation 元素上有可聚焦后代"而换了个报错文案）；最终通过的是
 * 「role 迁到 nav-list」+「关闭按钮退出无障碍树与 Tab 序列」这一组合。</p>
 *
 * <h3>关闭按钮的取舍（有意为之）</h3>
 * <p>关闭按钮保留鼠标点击能力，但 `aria-hidden` + `tabindex="-1"` 退出无障碍树与 Tab
 * 序列：它是 rc-tabs 结构里无法回避的非法子项，不退出就永远过不了
 * `aria-required-children`。键盘等价路径有两条且都已实测可用：① 焦点在标签上按
 * Delete / Backspace（rc-tabs 内置，尊重 `closable`，钉选标签免疫），经
 * {@link TAB_CLOSE_KEYSHORTCUTS} 写入 `aria-keyshortcuts` 让读屏能播报；
 * ② 右键菜单（Shift+F10 / 上下文菜单键）里的「关闭标签页」。这满足 WCAG 2.1.1
 * （键盘可达）与 2.1.2（无键盘陷阱），代价是关闭按钮本身不再被读屏单独播报。</p>
 *
 * <p><b>为什么要 MutationObserver</b>：`aria-controls`、`role` 都是 rc-tabs 的受控属性，
 * 它在每次重渲染（切换标签、尺寸变化、标签增删）时都会用自己的值覆盖回去。只做一次性写入
 * 会被静默还原，因此这里改为「先接管、再观察重夺」，并在写入前比对现值以避免自触发循环。</p>
 *
 * <p>依赖 `data-node-key` 是 rc-tabs 自身的稳定契约（它内部也用该属性定位标签），
 * 且 LayoutTabBar 的 Shift+F10 委托已在读取它。</p>
 */
export function useTabAriaWiring({
  hostRef,
  tabs,
  t,
}: UseTabAriaWiringOptions): void {
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const tablistLabel = t('layouts.tabs.tablistLabel')

    /**
     * rc-tabs 每次渲染都把 `role="tablist"` 写在 `.ant-tabs-nav` 上；
     * 本函数把它迁到 `.ant-tabs-nav-list`（标签的真实父容器），并清掉 nav 上残余的
     * `role` / `aria-label` / `aria-orientation` —— 无 role 的 div 上留着 `aria-label`
     * 本身也会被 `aria-prohibited-attr` 判为无效属性。
     */
    const relocateTablist = () => {
      const nav = host.querySelector<HTMLElement>('.ant-tabs-nav')
      const list = host.querySelector<HTMLElement>('.ant-tabs-nav-list')
      if (!nav || !list) {
        return null
      }

      if (nav.getAttribute('role') === 'tablist') {
        nav.removeAttribute('role')
      }
      // nav 只承载滚动/溢出结构，退出 ARIA 语义后这两个属性必须一起清掉
      if (nav.hasAttribute('aria-orientation')) {
        nav.removeAttribute('aria-orientation')
      }
      if (nav.getAttribute('aria-label') !== null) {
        nav.removeAttribute('aria-label')
      }

      if (list.getAttribute('role') !== 'tablist') {
        list.setAttribute('role', 'tablist')
      }
      if (list.getAttribute('aria-label') !== tablistLabel) {
        list.setAttribute('aria-label', tablistLabel)
      }
      if (list.getAttribute('aria-orientation') !== 'horizontal') {
        list.setAttribute('aria-orientation', 'horizontal')
      }
      return list
    }

    const takeOver = () => {
      const list = relocateTablist()
      if (!list) {
        return
      }

      list.querySelectorAll<HTMLElement>('.ant-tabs-tab').forEach((tabEl) => {
        const tabId = tabEl.getAttribute('data-node-key')
        if (!tabId) {
          return
        }

        const roleTab = tabEl.querySelector<HTMLElement>('[role="tab"]')
        const panelId = tabPanelDomId(tabId)
        if (roleTab) {
          // 只接管 aria-controls / aria-keyshortcuts；可访问名仍由标签内文字提供
          if (roleTab.getAttribute('aria-controls') !== panelId) {
            roleTab.setAttribute('aria-controls', panelId)
          }
          if (
            roleTab.getAttribute('aria-keyshortcuts') !== TAB_CLOSE_KEYSHORTCUTS
          ) {
            roleTab.setAttribute('aria-keyshortcuts', TAB_CLOSE_KEYSHORTCUTS)
          }
        }

        const removeButton = tabEl.querySelector<HTMLElement>(
          '.ant-tabs-tab-remove',
        )
        if (!removeButton) {
          return
        }
        const tab = tabs.find((item) => item.id === tabId)
        const closeLabel = t('layouts.tabs.closeTab', {
          name: tab ? getTabTitle(tab, t) : '',
        })
        if (removeButton.getAttribute('aria-label') !== closeLabel) {
          removeButton.setAttribute('aria-label', closeLabel)
        }
        // 退出无障碍树 + Tab 序列（原因见上方 JSDoc「关闭按钮的取舍」）
        if (removeButton.getAttribute('aria-hidden') !== 'true') {
          removeButton.setAttribute('aria-hidden', 'true')
        }
        if (removeButton.getAttribute('tabindex') !== '-1') {
          removeButton.setAttribute('tabindex', '-1')
        }
      })
    }

    takeOver()

    const observer = new MutationObserver(takeOver)
    observer.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      // role / aria-label：rc-tabs 把 tablist 角色写回 nav 时要重夺；
      // tabindex / aria-hidden：关闭按钮被重渲染后要重新压回去
      attributeFilter: [
        'aria-controls',
        'aria-label',
        'aria-orientation',
        'aria-hidden',
        'role',
        'tabindex',
      ],
    })
    return () => observer.disconnect()
  }, [hostRef, tabs, t])
}
