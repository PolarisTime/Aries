import { useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import {
  getTabRouterHref,
  pushExternalIntent,
} from '@/layouts/tabs/tab-location-sync'
import { router as mainRouter } from '@/router'
import {
  buildTabHref,
  isRegisteredPagePath,
  normalizeSearch,
  normalizeTabPathname,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

/**
 * 「Tab 已存在但尚未挂载（无子 Router）」时，是否要把主路由的 pathname+search 写回 Tab 状态。
 *
 * <p>未挂载 Tab 的子 Router 在挂载时用 Tab 保存的 href 初始化，因此新一次跳转携带查询串
 * （父级导入意图 `sourceModule`/`sourceRecordId`、深链 `docNo`/`openDetail` 等）时必须先写回，
 * 否则挂载后仍按旧 href 渲染，一次性意图被静默丢弃：典型表现是从采购订单保存结果弹窗点击
 * 「创建采购入库」后，目标页拿到了地址栏参数却不会带入来源明细。</p>
 *
 * <p>主地址栏无查询串（菜单点击/页签激活）时保持 Tab 原有筛选状态不变。</p>
 */
export function shouldAdoptMainSearchForUnmountedTab(
  subHref: string | null,
  mainSearchStr: string,
): boolean {
  return subHref === null && normalizeSearch(mainSearchStr).length > 0
}

/**
 * 主路由（浏览器地址栏）与多标签页状态的协调器：
 * 1. 主路由变化 → 打开/激活对应 Tab，并将外部意图（菜单点击/全局搜索/前进后退/直达 URL）注入子 Router；
 * 2. 激活 Tab 变化（如关闭 Tab 后邻位继承）→ 主地址栏跟随。
 * 子 Router 内导航漂移由 tab-location-sync 的订阅反向同步，此处不处理。
 */
export function useTabRouteReconciliation(): void {
  const location = useLocation()
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
      // 已挂载的 Tab 才存在子 Router 同步；未挂载 Tab 在挂载时用 Tab 保存的 href 对齐。
      const subHref = getTabRouterHref(existing.id)
      if (shouldAdoptMainSearchForUnmountedTab(subHref, location.searchStr)) {
        // 未挂载 Tab 必须先把主路由的查询串写回，否则本次跳转携带的一次性意图
        // （如采购订单 ->「创建采购入库」带入来源明细）会在挂载时被旧 href 覆盖而丢失。
        store.setTabLocation(existing.id, {
          pathname,
          search: location.searchStr,
        })
        store.markTabMounted(existing.id)
        return
      }
      if (subHref && subHref !== mainHref) {
        if (!normalizeSearch(location.searchStr) && subHref.includes('?')) {
          // 主地址栏无参（激活跳转/菜单点击）而 Tab 保存了内部筛选：
          // 保留 Tab 状态，地址栏回退到子路由的完整 href。
          mainRouter.history.replace(subHref)
          store.markTabMounted(existing.id)
          return
        }
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

  // 仅在激活 Tab 真实切换（点击页签/关闭后邻位继承）时让主地址栏跟随。
  // 页面内导航（如指标卡点击）会先改地址栏、后更新激活 Tab，
  // 若响应 location 变化会把主地址栏拉回旧 Tab，与上方协调逻辑形成乒乓。
  const followedTabIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeTab) {
      return
    }
    if (followedTabIdRef.current === activeTab.id) {
      return
    }
    followedTabIdRef.current = activeTab.id
    if (normalizeTabPathname(location.pathname) === activeTab.pathname) {
      return
    }
    // 关闭 Tab 等场景下主地址栏跟随新激活 Tab（push 保留激活点历史，后退可回溯）
    mainRouter.history.push(buildTabHref(activeTab.pathname, activeTab.search))
  }, [
    activeTab,
    activeTab?.id,
    activeTab?.pathname,
    activeTab?.search,
    location.pathname,
  ])
}
