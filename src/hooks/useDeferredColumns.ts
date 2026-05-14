import type { ColumnsType } from 'antd/es/table'
import { useEffect, useRef, useState } from 'react'

const INITIAL_COLUMN_COUNT = 5

/**
 * 首屏只渲染前 N 列，requestAnimationFrame 后补齐剩余列。
 * 减少首屏 DOM 节点，加速 LCP 元素绘制。
 *
 * 仅在列数从少变多时触发延迟渲染，页面间切换直接显示全部列，避免闪烁。
 */
export function useDeferredColumns<T>(columns: ColumnsType<T>): ColumnsType<T> {
  const [expanded, setExpanded] = useState(
    columns.length <= INITIAL_COLUMN_COUNT,
  )
  const prevCountRef = useRef(columns.length)

  useEffect(() => {
    const prevCount = prevCountRef.current
    prevCountRef.current = columns.length

    if (columns.length <= INITIAL_COLUMN_COUNT) {
      setExpanded(true)
      return
    }

    // 列数未增加（页面切换、列数不变或减少），直接显示全部
    if (prevCount >= columns.length) {
      setExpanded(true)
      return
    }

    setExpanded(false)
    let cancelled = false
    const id = requestAnimationFrame(() => {
      if (!cancelled) setExpanded(true)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [columns])

  return expanded ? columns : columns.slice(0, INITIAL_COLUMN_COUNT)
}
