import { useState, useCallback, useEffect } from 'react'
import type { ColumnOrderState, VisibilityState } from '@tanstack/react-table'

const STORAGE_PREFIX = 'aries-list-column-settings:'

export function useColumnSettingsSupport(pageKey: string) {
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${pageKey}`)
      if (raw) {
        const parsed = JSON.parse(raw) as { orderedKeys?: string[]; hiddenKeys?: string[] }
        if (parsed.orderedKeys) setColumnOrder(parsed.orderedKeys)
        if (parsed.hiddenKeys) {
          const vis: VisibilityState = {}
          for (const key of parsed.hiddenKeys) vis[key] = false
          setColumnVisibility(vis)
        }
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [pageKey])

  const persist = useCallback((order: ColumnOrderState, visibility: VisibilityState) => {
    const orderedKeys = order.length > 0 ? order : undefined
    const hiddenKeys = Object.entries(visibility).filter(([, v]) => !v).map(([k]) => k)
    localStorage.setItem(`${STORAGE_PREFIX}${pageKey}`, JSON.stringify({ orderedKeys, hiddenKeys }))
  }, [pageKey])

  const handleColumnOrderChange = useCallback((order: ColumnOrderState) => {
    setColumnOrder(order)
    persist(order, columnVisibility)
  }, [columnVisibility, persist])

  const handleColumnVisibilityChange = useCallback((visibility: VisibilityState) => {
    setColumnVisibility(visibility)
    persist(columnOrder, visibility)
  }, [columnOrder, persist])

  return { columnOrder, columnVisibility, loaded, handleColumnOrderChange, handleColumnVisibilityChange }
}
