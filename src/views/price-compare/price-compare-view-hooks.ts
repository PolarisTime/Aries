import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import {
  fetchSupplierOptions,
  supplierDisplayName,
} from '@/api/master/supplier-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
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

/** Ctrl/Cmd+Z 撤销, Ctrl/Cmd+Shift+Z 或 Ctrl/Cmd+Y 重做。只读态禁用。 */
export function useUndoRedoShortcuts(
  undo: () => void,
  redo: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, enabled])
}
