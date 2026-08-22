import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
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
 */
export function useTabOpen() {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    (target: TabOpenTarget) => {
      const store = useLayoutTabsStore.getState()
      const pathname = normalizeTabPathname(target.pathname)
      const existing = store.tabs.find((tab) => tab.pathname === pathname)

      if (existing) {
        if (target.forceSearch) {
          store.setTabLocation(existing.id, {
            pathname,
            search: target.search ?? '',
          })
          void navigate({
            to: buildTabHref(pathname, target.search ?? '') as '/',
          })
          return
        }
        store.activateTab(existing.id)
        if (normalizeTabPathname(location.pathname) !== pathname) {
          void navigate({
            to: buildTabHref(existing.pathname, existing.search) as '/',
          })
        }
        return
      }

      store.openTab({ pathname, search: target.search })
      void navigate({ to: buildTabHref(pathname, target.search ?? '') as '/' })
    },
    [location.pathname, navigate],
  )
}
