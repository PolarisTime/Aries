import type { AnyRouter } from '@tanstack/react-router'
import { router as mainRouter } from '@/router'
import { createTabRouter } from '@/router/tab-router'
import {
  buildTabHref,
  type LayoutTab,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

/**
 * 多标签页子 Router 注册表（内存态，不进 zustand）。
 * 双向同步守则：每 Tab 维护 lastSyncedHref 单标量——
 * - 主地址栏 href ≠ lastSynced：外部意图（菜单/搜索/前进后退）→ 注入子 Router；
 * - 子 Router href ≠ lastSynced：Tab 内导航漂移 → replace 主地址栏；
 * - 相等：no-op。两个方向互斥，不会乒乓。
 */
const tabRouters = new Map<string, AnyRouter>()
const lastSyncedHrefs = new Map<string, string>()
const attachedReloadKeys = new Map<string, number>()

type DisposableRouter = { dispose?: () => void }

function disposeRouter(subRouter: AnyRouter): void {
  const disposable = subRouter as unknown as DisposableRouter
  if (typeof disposable.dispose === 'function') {
    disposable.dispose()
  }
}

/** 获取（或创建并绑定同步订阅）Tab 的子 Router。渲染期经 useMemo 调用。 */
export function attachTabRouter(tab: LayoutTab): AnyRouter {
  // 「刷新当前页」reloadKey 变化时重建子 Router
  if (attachedReloadKeys.get(tab.id) !== tab.reloadKey) {
    detachTabRouter(tab.id)
  }

  const existing = tabRouters.get(tab.id)
  if (existing) {
    return existing
  }

  const initialHref = buildTabHref(tab.pathname, tab.search)
  const subRouter = createTabRouter(initialHref)
  tabRouters.set(tab.id, subRouter)
  lastSyncedHrefs.set(tab.id, initialHref)
  attachedReloadKeys.set(tab.id, tab.reloadKey)

  subRouter.history.subscribe(() => {
    const subLocation = subRouter.state.location
    const subHref = subLocation.href
    if (subHref === lastSyncedHrefs.get(tab.id)) {
      return
    }
    lastSyncedHrefs.set(tab.id, subHref)
    useLayoutTabsStore.getState().setTabLocation(tab.id, {
      pathname: subLocation.pathname,
      search: subLocation.searchStr,
    })
    if (mainRouter.state.location.href !== subHref) {
      // Tab 内漂移同步到地址栏（replace 不污染激活点历史）
      mainRouter.history.replace(subHref)
    }
  })

  return subRouter
}

/** 关闭 Tab / 重建子 Router 时清理实例 */
export function detachTabRouter(tabId: string): void {
  const subRouter = tabRouters.get(tabId)
  if (!subRouter) {
    return
  }
  disposeRouter(subRouter)
  tabRouters.delete(tabId)
  lastSyncedHrefs.delete(tabId)
  attachedReloadKeys.delete(tabId)
}

/**
 * 外部意图注入：把主路由上的目标 href 推入子 Router。
 * 先更新 lastSyncedHref，使随后的 subscribe 回调判定为已同步（no-op）。
 */
export function pushExternalIntent(tabId: string, href: string): void {
  const subRouter = tabRouters.get(tabId)
  if (!subRouter || subRouter.state.location.href === href) {
    return
  }
  lastSyncedHrefs.set(tabId, href)
  subRouter.history.push(href)
}

/** 当前 Tab 子 Router 是否已挂载 */
export function hasTabRouter(tabId: string): boolean {
  return tabRouters.has(tabId)
}

/** 当前 Tab 子 Router 的 href（未挂载返回 null） */
export function getTabRouterHref(tabId: string): string | null {
  return tabRouters.get(tabId)?.state.location.href ?? null
}
