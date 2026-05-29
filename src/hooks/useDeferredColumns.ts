import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'

const INITIAL_COLUMN_COUNT = 5

/**
 * 首屏只渲染前 N 列，requestAnimationFrame 后补齐剩余列。
 * 减少首屏 DOM 节点，加速 LCP 元素绘制。
 */
export function useDeferredColumns<T>(columns: ColumnsType<T>): ColumnsType<T> {
  const [expandedColumnCount, setExpandedColumnCount] = useState(0)

  useEffect(() => {
    if (columns.length <= INITIAL_COLUMN_COUNT) {
      return
    }

    let cancelled = false
    const id = requestAnimationFrame(() => {
      if (!cancelled) setExpandedColumnCount(columns.length)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [columns.length])

  const shouldShowAllColumns =
    columns.length <= INITIAL_COLUMN_COUNT ||
    expandedColumnCount >= columns.length
  return shouldShowAllColumns ? columns : columns.slice(0, INITIAL_COLUMN_COUNT)
}
