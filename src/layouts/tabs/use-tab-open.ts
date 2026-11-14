import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { requestEditorSessionClose } from '@/layouts/editor-session/request-close'
import { notifyEvictedTabs } from '@/layouts/tabs/evicted-tabs'
import {
  pushExternalIntent,
  resolveTabHref,
} from '@/layouts/tabs/tab-location-sync'
import { router as mainRouter } from '@/router'
import {
  buildTabHref,
  isTabPinned,
  normalizeTabPathname,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

export interface TabOpenTarget {
  pathname: string
  /** 目标查询串（不含 '?'） */
  search?: string
  /**
   * 已有同路径 Tab 时是否强制覆盖其查询串。
   * 全局搜索跳转等外部意图需要打开指定单据时置 true；
   * 菜单点击默认 false——仅激活既有 Tab 并保留其内部状态。
   */
  forceSearch?: boolean
}

/**
 * 应用内导航统一入口：菜单点击、面包屑、流程节点、指标卡、快捷入口都走这里。
 *
 * <p><b>导航模型：单页 + 面包屑</b>（原来的多开页签已删除）。语义：</p>
 * <ul>
 *   <li>目标页面已存在标签对象时仅激活（保留其内部筛选/滚动状态）；</li>
 *   <li>目标页面不存在时**在当前页打开**：新建标签后关闭其它未固定的内容标签，
 *       用户看到的始终是一个页面，而不是一排页签；</li>
 *   <li>离开前若当前页持有未保存编辑会话，先走与「关闭页签」相同的确认流程
 *       （`requestEditorSessionClose`），按取消则本次导航整体中止，
 *       不会出现「切走了但草稿没了」；</li>
 *   <li>工作台是结构钉选标签，永远保留；受保护（有未保存编辑）的标签也不静默关闭。</li>
 * </ul>
 *
 * <p>导航统一走主 Router 的 history.push（完整 href，查询串不会丢失），
 * 随后由 useTabRouteReconciliation 完成标签激活与子 Router 意图注入；
 * 不使用主 Router 的 navigate({ to, search })——其 query 序列化在双层路由架构下
 * 会丢失深链参数（详见 Git 历史缺陷记录）。</p>
 */
export function useTabOpen() {
  const { t } = useTranslation()

  return useCallback(
    (target: TabOpenTarget) => {
      const pathname = normalizeTabPathname(target.pathname)
      const search = target.search ?? ''
      const href = buildTabHref(pathname, search)

      /** 单页模型：关掉除 `keepId` 以外的内容页签（工作台与受保护页签除外）。 */
      const pruneOtherContentTabs = (keepId: string) => {
        for (const tab of useLayoutTabsStore.getState().tabs) {
          if (tab.id === keepId || isTabPinned(tab)) continue
          if (editorSessionStore.requiresConfirmation(tab.id)) continue
          useLayoutTabsStore.getState().removeTab(tab.id)
        }
      }

      const openOrActivate = () => {
        const store = useLayoutTabsStore.getState()
        const existing = store.tabs.find((tab) => tab.pathname === pathname)

        if (!existing) {
          // 淘汰上限触发时不得丢弃持有未保存编辑会话的标签（宁可暂时超限）
          const { tabId, evictedIds } = store.openTab(
            { pathname, search },
            {
              isProtected: (id) => editorSessionStore.requiresConfirmation(id),
            },
          )
          notifyEvictedTabs(evictedIds, t)
          pruneOtherContentTabs(tabId)
          mainRouter.history.push(href)
          return
        }

        if (target.forceSearch) {
          // 外部意图覆盖标签状态：先更新保存的查询串，再把新 href 注入已挂载的子
          // Router（未挂载标签由 attach 时的初始 href 对齐），最后同步地址栏。
          store.setTabLocation(existing.id, { pathname, search })
          pushExternalIntent(existing.id, href)
          if (mainRouter.state.location.href !== href) {
            mainRouter.history.push(href)
          }
          pruneOtherContentTabs(existing.id)
          return
        }

        // 非 forceSearch：激活并保留标签内部状态，地址栏跟随标签保存的完整 href
        //（含其内部筛选），不能推无参 href——否则协调层会清掉标签保存的状态。
        store.activateTab(existing.id)
        const preservedHref = resolveTabHref(existing)
        if (mainRouter.state.location.href !== preservedHref) {
          mainRouter.history.push(preservedHref)
        }
        pruneOtherContentTabs(existing.id)
      }

      /*
       * 离开当前页之前统一收口：当前页若持有未保存编辑会话，
       * 先弹与关闭页签相同的确认（保存/放弃/取消），取消则本次导航整体中止。
       */
      const current = useLayoutTabsStore
        .getState()
        .tabs.find(
          (tab) => tab.id === useLayoutTabsStore.getState().activeTabId,
        )
      if (
        current &&
        !isTabPinned(current) &&
        current.pathname !== pathname &&
        editorSessionStore.requiresConfirmation(current.id)
      ) {
        requestEditorSessionClose(t, current.id, openOrActivate)
        return
      }
      openOrActivate()
    },
    [t],
  )
}
