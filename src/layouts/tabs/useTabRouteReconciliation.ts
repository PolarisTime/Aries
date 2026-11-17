import { useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { requestEditorSessionClose } from '@/layouts/editor-session/request-close'
import { notifyEvictedTabs } from '@/layouts/tabs/evicted-tabs'
import {
  getTabRouterHref,
  pushExternalIntent,
  resolveTabHref,
} from '@/layouts/tabs/tab-location-sync'
import { router as mainRouter } from '@/router'
import {
  buildTabHref,
  isRegisteredPagePath,
  isTabPinned,
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
 *
 * <p>建标签统一走 {@link useLayoutTabsStore.ensureTabForLocation}（与 `hydrateForUser`
 * 同一个幂等入口），因此"同一 pathname 已有标签"时只激活/补挂载标记，不会重复创建对象。
 * 恢复持久化清单的 hydrate 由 {@link useLayoutTabsHydration} 在布局阶段先行完成，
 * 严格早于本文件的定位 effect。</p>
 */
export function useTabRouteReconciliation(): void {
  const location = useLocation()
  const { t } = useTranslation()
  const activeTab = useLayoutTabsStore((state) =>
    state.tabs.find((tab) => tab.id === state.activeTabId),
  )

  /**
   * 用 ref 承接 `t`：下面的协调 effect 依赖是围绕「主路由 ↔ 子 Router 乒乓」调过的，
   * 把 `t` 加进依赖数组会让切换语言时重跑整套协调逻辑。ref 是稳定引用，既拿到最新文案
   * 又不改变 effect 的触发条件。
   */
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    const store = useLayoutTabsStore.getState()
    if (!isRegisteredPagePath(location.pathname)) {
      return
    }
    const pathname = normalizeTabPathname(location.pathname)
    const mainHref = location.href

    /** 单页模型：关掉除 `keepId` 以外的内容页签（工作台与受保护页签除外）。 */
    const pruneOtherContentTabs = (keepId: string | null) => {
      for (const tab of useLayoutTabsStore.getState().tabs) {
        if (tab.id === keepId || isTabPinned(tab)) continue
        if (editorSessionStore.requiresConfirmation(tab.id)) continue
        useLayoutTabsStore.getState().removeTab(tab.id)
      }
    }

    /*
     * 浏览器前进/后退、手输地址等**绕过 useTabOpen 的导航**同样受未保存编辑保护。
     *
     * <p>单页模型下离开当前页会卸载它的编辑器（多标签时代的 keep-alive 已不存在），
     * 而这里地址栏已经先变了、没有任何确认环节 —— 实测「编辑采购订单 → 浏览器后退」
     * 会把编辑器连同未保存内容一起销毁。因此检测到「目标页 ≠ 当前激活页且当前页脏」时：</p>
     * <ol>
     *   <li>先把地址栏 replace 回当前页（取消这次离开，不产生新历史条目）；</li>
     *   <li>弹与关闭页签相同的确认框；</li>
     *   <li>用户放弃修改后，再把地址 push 到原目标，由下面的常规协调逻辑接手续航。</li>
     * </ol>
     */
    const activeTab = store.tabs.find((tab) => tab.id === store.activeTabId)
    if (
      activeTab &&
      !isTabPinned(activeTab) &&
      normalizeTabPathname(activeTab.pathname) !== pathname &&
      editorSessionStore.requiresConfirmation(activeTab.id)
    ) {
      const stayHref = buildTabHref(activeTab.pathname, activeTab.search)
      if (mainRouter.state.location.href !== stayHref) {
        mainRouter.history.replace(stayHref)
      }
      requestEditorSessionClose(tRef.current, activeTab.id, () => {
        mainRouter.history.push(buildTabHref(pathname, location.searchStr))
      })
      return
    }

    const existing = store.tabs.find((tab) => tab.pathname === pathname)

    if (existing) {
      if (store.activeTabId !== existing.id) {
        store.activateTab(existing.id)
      }
      pruneOtherContentTabs(existing.id)
      // 已挂载的 Tab 才存在子 Router 同步；未挂载 Tab 在挂载时用 Tab 保存的 href 对齐。
      // 子 Router 可能因历史守卫拒绝改名而与标签分叉，必须先收敛回标签自身 href，
      // 不能把分叉后的 pathname/search 当成激活目标写回地址栏，否则会再次形成
      // 「标签 A ↔ 子 Router B」的来回拉锯。
      const rawSubHref = getTabRouterHref(existing.id)
      const subHref = resolveTabHref(existing)
      if (rawSubHref && rawSubHref !== subHref) {
        pushExternalIntent(existing.id, subHref)
      }
      if (
        shouldAdoptMainSearchForUnmountedTab(rawSubHref, location.searchStr)
      ) {
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

    const { tabId, evictedIds } = store.ensureTabForLocation(
      { pathname, search: location.searchStr },
      {
        isProtected: (id) => editorSessionStore.requiresConfirmation(id),
      },
    )
    notifyEvictedTabs(evictedIds, tRef.current)
    pruneOtherContentTabs(tabId)
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
