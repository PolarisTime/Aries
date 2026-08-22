import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  getTabRouterHref,
  pushExternalIntent,
} from '@/layouts/tabs/tab-location-sync'
import {
  buildTabHref,
  isRegisteredPagePath,
  normalizeTabPathname,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

/**
 * 主路由（浏览器地址栏）与多标签页状态的协调器：
 * 1. 主路由变化 → 打开/激活对应 Tab，并将外部意图（菜单点击/全局搜索/前进后退/直达 URL）注入子 Router；
 * 2. 激活 Tab 变化（如关闭 Tab 后邻位继承）→ 主地址栏跟随。
 * 子 Router 内导航漂移由 tab-location-sync 的订阅反向同步，此处不处理。
 */
export function useTabRouteReconciliation(): void {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = useLayoutTabsStore((state) =>
    state.tabs.find((tab) => tab.id === state.activeTabId),
  )

  useEffect(() => {
    const store = useLayoutTabsStore.getState()
    if (!isRegisteredPagePath(location.pathname)) {
      return
    }
    const pathname = normalizeTabPathname(location.pathname)
    const mainHref = location.href
    const existing = store.tabs.find((tab) => tab.pathname === pathname)

    if (existing) {
      if (store.activeTabId !== existing.id) {
        store.activateTab(existing.id)
      }
      // 已挂载的 Tab 才存在子 Router 同步；未挂载 Tab 由 attach 时的初始 href 对齐
      const subHref = getTabRouterHref(existing.id)
      if (subHref && subHref !== mainHref) {
        store.setTabLocation(existing.id, {
          pathname,
          search: location.searchStr,
        })
        pushExternalIntent(existing.id, mainHref)
      }
      store.markTabMounted(existing.id)
      return
    }

    const tabId = store.openTab({ pathname, search: location.searchStr })
    store.markTabMounted(tabId)
    // href 已涵盖 pathname+searchStr，显式列出以满足依赖完整性检查
  }, [location.href, location.pathname, location.searchStr])

  useEffect(() => {
    if (!activeTab) {
      return
    }
    if (normalizeTabPathname(location.pathname) === activeTab.pathname) {
      return
    }
    // 关闭 Tab 等场景下主地址栏跟随新激活 Tab（push 保留激活点历史，后退可回溯）
    void navigate({
      to: buildTabHref(activeTab.pathname, activeTab.search) as '/',
    })
  }, [
    activeTab,
    activeTab?.id,
    activeTab?.pathname,
    activeTab?.search,
    location.pathname,
    navigate,
  ])
}
