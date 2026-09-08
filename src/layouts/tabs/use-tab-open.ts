import { useCallback } from 'react'
import { router as mainRouter } from '@/router'
import {
  buildTabHref,
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
 * 多标签页统一打开入口：菜单点击、流程节点、指标卡、快捷入口都走这里。
 * 幂等语义：同路径 Tab 已存在时仅激活（保留表单/筛选/滚动状态），否则新建。
 *
 * 导航统一走主 Router 的 history.push（完整 href，查询串不会丢失），
 * 随后由 useTabRouteReconciliation 完成 Tab 激活与子 Router 意图注入；
 * 不使用主 Router 的 navigate({ to, search })——其 query 序列化在
 * 多标签页双层路由架构下会丢失深链参数（详见 Git 历史缺陷记录）。
 */
export function useTabOpen() {
  return useCallback((target: TabOpenTarget) => {
    const store = useLayoutTabsStore.getState()
    const pathname = normalizeTabPathname(target.pathname)
    const search = target.search ?? ''
    const existing = store.tabs.find((tab) => tab.pathname === pathname)

    if (existing) {
      if (target.forceSearch) {
        store.setTabLocation(existing.id, { pathname, search })
      } else {
        store.activateTab(existing.id)
      }
    } else {
      store.openTab({ pathname, search })
    }
    mainRouter.history.push(buildTabHref(pathname, search))
  }, [])
}
