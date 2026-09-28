import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import {
  fetchSupplierOptions,
  supplierDisplayName,
} from '@/api/master/supplier-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import {
  hasShortcutModifier,
  useGlobalShortcut,
} from '@/hooks/useGlobalShortcut'
import { useEditorSession } from '@/layouts/editor-session/EditorSessionGuard'
import {
  normalizeTabPathname,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'
import { PRICE_COMPARE_ROUTE, TOUR_KEY } from './price-compare-support'
import type { ProjectOption } from './types'

/** 供应商下拉选项: 现货价单元格空间有限, 优先展示简称。 */
export function useSupplierSelectOptions(enabled: boolean) {
  const { data: supplierOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: () => fetchSupplierOptions(),
    enabled,
    staleTime: STALE_MASTER_OPTIONS,
  })
  return useMemo(
    () =>
      supplierOptions.map((option) => ({
        value: option.value,
        label: supplierDisplayName(option),
        brands: option.brands ?? [],
      })),
    [supplierOptions],
  )
}

/** 首次进入时为未归属单据分配第一个项目, 并视情况展示引导。 */
export function useInitialProjectAssignment(
  projects: ProjectOption[],
  assignProjectToUnassigned: (projectId: string, projectName: string) => void,
  setTourOpen: (open: boolean) => void,
) {
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !projects.length) return
    initialized.current = true
    assignProjectToUnassigned(
      projects[0].id,
      projects[0].abbr || projects[0].name,
    )
    if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true)
  }, [projects, assignProjectToUnassigned, setTourOpen])
}

/**
 * 当前是否仍停留在 /price-compare 路由。
 *
 * 多标签页 keep-alive 架构下切走 Tab 不会卸载视图, 且每个 Tab 使用独立的内存子
 * Router(其 location 恒为自身的 /price-compare), 因此无法用视图内 useLocation 感知
 * 离开。这里以全局激活 Tab 的保存路径作为路由信号, 供 store 释放/重签编辑锁。
 */
export function usePriceCompareRouteActive(): boolean {
  return useLayoutTabsStore((state) => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId)
    return normalizeTabPathname(activeTab?.pathname) === PRICE_COMPARE_ROUTE
  })
}

/**
 * 把比价页注册为编辑器会话: 存在未落库改动时, 关闭标签页会二次确认、
 * 刷新/关窗会被浏览器拦截(与模块编辑器共用同一套守卫)。
 * <p>此前比价页完全没有接入, 编辑后直接关标签会静默丢失改动。</p>
 */
export function usePriceCompareEditorSession(hasUnsavedChanges: boolean) {
  const { beginSession, endSession, setSessionStatus } = useEditorSession()

  useEffect(() => {
    beginSession({ moduleKey: 'price-compare', mode: 'edit' })
    return endSession
  }, [beginSession, endSession])

  useEffect(() => {
    // 保存请求在途时未保存集合仍为脏, 因此关闭确认会一直生效到真正落库。
    setSessionStatus(hasUnsavedChanges ? 'dirty' : 'clean')
  }, [hasUnsavedChanges, setSessionStatus])
}

/** Ctrl/Cmd+Z 撤销, Ctrl/Cmd+Shift+Z 或 Ctrl/Cmd+Y 重做。只读态禁用。 */
export function useUndoRedoShortcuts(
  undo: () => void,
  redo: () => void,
  enabled = true,
) {
  /*
   * 撤销/重做会直接回滚比价数据, 因此比保存快捷键多两道闸:
   *   1) 只有本 tab 为当前激活页时才处理 —— 多标签 keep-alive 下切走的 Tab 仍在 DOM 里,
   *      不加这道判断就会在用户看着 A 页时改掉后台 B 页的比价数据;
   *   2) 焦点在输入框/可编辑区域(单元格、供应商下拉、批次名等)时不处理, 让位给原生撤销。
   */
  const routeActive = usePriceCompareRouteActive()

  useGlobalShortcut({
    enabled: enabled && routeActive,
    ignoreEditableTarget: true,
    match: (event) => {
      if (!hasShortcutModifier(event)) return false
      const key = event.key.toLowerCase()
      return key === 'z' || key === 'y'
    },
    run: (event) => {
      event.preventDefault()
      const key = event.key.toLowerCase()
      if (key === 'y' || event.shiftKey) {
        redo()
        return
      }
      undo()
    },
  })
}
