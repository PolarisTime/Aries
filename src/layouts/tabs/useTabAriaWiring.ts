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

/**
 * 把 antd Tabs 渲染出的标签与 {@link AppTabContainer} 渲染的真实内容面板接成 APG 语义。
 *
 * <p>三条属性 antd/rc-tabs 都不暴露配置口，只能落到 DOM：</p>
 * <ol>
 *   <li>`tablist` 没有可访问名（rc-tabs 只写 role 与 aria-orientation）——APG 要求
 *       `aria-label` 或 `aria-labelledby` 二者必居其一；</li>
 *   <li>标签的 `aria-controls` 指向 rc-tabs 自己的空面板，而那个面板整体被
 *       `.ant-tabs-body-holder { display: none }` 隐藏，真实内容在 `.leo-tab-panel` 里，
 *       两者之间没有任何关联；</li>
 *   <li>关闭按钮的可访问名是 rc-tabs 硬编码的英文 `remove`，中文界面下读屏会念英文
 *       （antd 6.6.4 不透传 `removeAriaLabel`）。</li>
 * </ol>
 *
 * <p><b>为什么要 MutationObserver</b>：`aria-controls` 是 rc-tabs 的受控属性，它在每次
 * 重渲染（切换标签、尺寸变化、标签增删）时都会用自己的值覆盖回去。只做一次性写入会被
 * 静默还原，因此这里改为「先接管、再观察重夺」，并在写入前比对现值以避免自触发循环。</p>
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
    const nav = hostRef.current?.querySelector<HTMLElement>('[role="tablist"]')
    if (!nav) {
      return
    }

    const tablistLabel = t('layouts.tabs.tablistLabel')

    const takeOver = () => {
      if (nav.getAttribute('aria-label') !== tablistLabel) {
        nav.setAttribute('aria-label', tablistLabel)
      }

      nav.querySelectorAll<HTMLElement>('.ant-tabs-tab').forEach((tabEl) => {
        const tabId = tabEl.getAttribute('data-node-key')
        if (!tabId) {
          return
        }

        const roleTab = tabEl.querySelector<HTMLElement>('[role="tab"]')
        const panelId = tabPanelDomId(tabId)
        if (roleTab && roleTab.getAttribute('aria-controls') !== panelId) {
          // 只接管 aria-controls；可访问名仍由标签内文字提供
          roleTab.setAttribute('aria-controls', panelId)
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
      })
    }

    takeOver()

    const observer = new MutationObserver(takeOver)
    observer.observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-controls', 'aria-label'],
    })
    return () => observer.disconnect()
  }, [hostRef, tabs, t])
}
