import type { AnyRouter } from '@tanstack/react-router'
import { router as mainRouter } from '@/router'
import { createTabRouter } from '@/router/tab-router'
import {
  buildTabHref,
  type LayoutTab,
  normalizeTabPathname,
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
    const historyLocation = subRouter.history.location
    const subHref = historyLocation.href
    if (subHref === lastSyncedHrefs.get(tab.id)) {
      return
    }
    lastSyncedHrefs.set(tab.id, subHref)
    const applied = useLayoutTabsStore.getState().setTabLocation(tab.id, {
      pathname: historyLocation.pathname,
      search: historyLocation.search,
    })
    if (!applied) {
      /*
       * 目标 pathname 已被别的标签占用（`setTabLocation` 的不变式守卫拒绝了改名）。
       *
       * <p>此时**不能**只把标签元数据留在原地：标签 pathname 仍是 A、子 Router 却停在 B，
       * 两者永久分叉。后果是点 A 的菜单时 `useTabOpen` 会按子 Router 的 href 把地址栏推到 B，
       * 协调层再按地址栏激活 B、跟随逻辑又把地址栏推回 A —— 地址栏来回跳 + React
       * 「Maximum update depth exceeded」。</p>
       *
       * <p>处理方式：把子 Router 退回本标签自己的 href（先写 lastSynced 抑制本次回退触发的
       * 订阅回调），外部意图仍交给主地址栏：协调层会激活已占用目标 pathname 的标签并把意图
       * 注入过去。这样「一个 pathname 一个标签」保持不变，且标签与子 Router 始终一致。</p>
       */
      const current = useLayoutTabsStore
        .getState()
        .tabs.find((item) => item.id === tab.id)
      if (current) {
        const ownHref = buildTabHref(current.pathname, current.search)
        if (ownHref !== subHref) {
          lastSyncedHrefs.set(tab.id, ownHref)
          subRouter.history.replace(ownHref)
        }
      }
    }
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

/** 在销毁活动 Tab 前同步主地址栏，避免路由协调器把已关闭路径重新打开。 */
export function replaceMainRouterHref(href: string): void {
  if (mainRouter.state.location.href !== href) {
    mainRouter.history.replace(href)
  }
}

/**
 * 外部意图注入：把主路由上的目标 href 推入子 Router。
 * 先更新 lastSyncedHref，使随后的 subscribe 回调判定为已同步（no-op）。
 */
export function pushExternalIntent(tabId: string, href: string): void {
  const subRouter = tabRouters.get(tabId)
  if (!subRouter || subRouter.history.location.href === href) {
    return
  }
  lastSyncedHrefs.set(tabId, href)
  subRouter.history.push(href)
}

/** 切换用户等场景：销毁全部子 Router 实例，避免内存残留 */
export function detachAllTabRouters(): void {
  for (const tabId of [...tabRouters.keys()]) {
    detachTabRouter(tabId)
  }
}

/** 当前 Tab 子 Router 的 href（未挂载返回 null） */
export function getTabRouterHref(tabId: string): string | null {
  return tabRouters.get(tabId)?.history.location.href ?? null
}

function hrefPathname(href: string): string {
  const queryIndex = href.indexOf('?')
  return queryIndex === -1 ? href : href.slice(0, queryIndex)
}

/**
 * 地址栏应当采用的该标签 href（**唯一来源**：菜单点击 / 激活既有标签时都取这里）。
 *
 * <p>优先取子 Router 的实际位置以保留页内筛选；但**只有该位置的 pathname 与标签自身一致**
 * 时才采用。不一致说明「标签元数据与子 Router」已经分叉（历史缺陷：跨页面导航被
 * `setTabLocation` 的 pathname 唯一性守卫拒绝后只拒绝了改名、没有回退子 Router），
 * 此时退回标签自己的 pathname+search——否则点 A 的菜单会把用户带到 B 的 URL，
 * 协调层再按 URL 激活 B，两处反复拉锯。</p>
 */
export function resolveTabHref(tab: LayoutTab): string {
  const subHref = getTabRouterHref(tab.id)
  if (
    subHref &&
    normalizeTabPathname(hrefPathname(subHref)) ===
      normalizeTabPathname(tab.pathname)
  ) {
    return subHref
  }
  return buildTabHref(tab.pathname, tab.search)
}
