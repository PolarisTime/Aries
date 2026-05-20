import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** 默认单行高度（表格未渲染时的 fallback） */
const DEFAULT_ROW_HEIGHT = 36
/** 最小 pageSize */
const MIN_PAGE_SIZE = 5
/** 预留行数，保证永远不会一屏刚好填满 */
const RESERVED_ROWS = 2
/** 防抖延迟（ms） */
const DEBOUNCE_MS = 300

interface DynamicPageSizeResult {
  /** 当前动态计算的 pageSize，初始为 null（尚未测量） */
  pageSize: number | null
  /** 容器 ref callback，挂载到表格外壳元素 */
  containerRef: (node: HTMLElement | null) => void
}

/**
 * 动态 pageSize hook
 *
 * 监听窗口大小变化和表格容器 ResizeObserver，自动测量表格行高，
 * 根据容器可视高度动态计算 pageSize：
 *   pageSize = floor(容器可视高度 / 单行高度) - 2
 *
 * @param onPageResize - pageSize 变化时的回调（用于重置查询等）
 */
export function useDynamicPageSize(
  onPageResize: (pageSize: number) => void,
): DynamicPageSizeResult {
  const [pageSize, setPageSize] = useState<number | null>(null)
  const containerRefInner = useRef<HTMLElement | null>(null)

  // 用 ref 存储最新回调，避免 ResizeObserver 回调中引用过期闭包
  const onPageResizeRef = useRef(onPageResize)
  useEffect(() => {
    onPageResizeRef.current = onPageResize
  }, [onPageResize])

  // 防抖函数 ref
  const debounceTimerRef = useRef(0)
  const lastPageSizeRef = useRef<number | null>(null)
  const isFirstMeasurementRef = useRef(true)

  // 测量并计算 pageSize
  const measure = useCallback(() => {
    const container = containerRefInner.current
    if (!container) return

    const containerHeight = container.clientHeight
    if (containerHeight <= 0) return

    // 必须有实际表格行才测量，否则跳过（等 MutationObserver 触发再测量）
    const tableBody = container.querySelector(
      '.ant-table-body',
    ) as HTMLElement | null
    const firstRow = tableBody?.querySelector(
      '.ant-table-row',
    ) as HTMLElement | null
    if (!firstRow || firstRow.clientHeight <= 0) return

    const rowHeight = firstRow.clientHeight

    // 用容器实际高度减去表头高度，得到表格体可用高度
    // 不依赖 .ant-table-body.clientHeight，因为它受 scroll.y 约束
    const headerHeight =
      container.querySelector('.ant-table-thead')?.clientHeight || 0
    const availableHeight = containerHeight - headerHeight

    // 计算可视行数
    const visibleRows = Math.floor(availableHeight / rowHeight)

    // pageSize = 可视行数 - 预留行数，最小为 MIN_PAGE_SIZE
    const nextPageSize = Math.max(MIN_PAGE_SIZE, visibleRows - RESERVED_ROWS)

    // 仅当 pageSize 真正变化时才更新
    if (lastPageSizeRef.current === nextPageSize) return
    lastPageSizeRef.current = nextPageSize

    if (isFirstMeasurementRef.current) {
      // 首次测量立即更新，避免初始加载时多一次请求
      isFirstMeasurementRef.current = false
      setPageSize(nextPageSize)
      onPageResizeRef.current(nextPageSize)
    } else {
      // 后续 resize 防抖更新，避免窗口拖动时频繁触发数据重新加载
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = window.setTimeout(() => {
        setPageSize(nextPageSize)
        onPageResizeRef.current(nextPageSize)
      }, DEBOUNCE_MS)
    }
  }, [])

  // 容器 ref callback：挂载/卸载时连接 ResizeObserver + MutationObserver
  const containerRef = useCallback(
    (node: HTMLElement | null) => {
      containerRefInner.current = node
      if (!node) return

      let frameId = 0

      // ResizeObserver：监听容器大小变化（窗口缩放等）
      const resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(frameId)
        frameId = requestAnimationFrame(measure)
      })
      resizeObserver.observe(node)

      // MutationObserver：监听表格行出现（数据加载完成后 DOM 变化）
      // 解决核心问题：数据加载慢时 tryMeasure 重试耗尽，后续无法触发 measure()
      let debounceTimer = 0
      const mutationObserver = new MutationObserver(() => {
        // 表格行出现时触发测量（debounce 避免批量 DOM 变化频繁触发）
        window.clearTimeout(debounceTimer)
        debounceTimer = window.setTimeout(measure, 50)
      })
      mutationObserver.observe(node, { childList: true, subtree: true })

      // 首次测量：如果表格已有行则立即测量，否则由 MutationObserver 触发
      measure()

      // 清理函数（节点卸载或替换时调用）
      return () => {
        cancelAnimationFrame(frameId)
        window.clearTimeout(debounceTimer)
        resizeObserver.disconnect()
        mutationObserver.disconnect()
      }
    },
    [measure],
  )

  // 监听窗口 resize / 全屏切换
  useEffect(() => {
    const handleResize = () => measure()
    window.addEventListener('resize', handleResize)
    document.addEventListener('fullscreenchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('fullscreenchange', handleResize)
      window.clearTimeout(debounceTimerRef.current)
    }
  }, [measure])

  const result: DynamicPageSizeResult = useMemo(
    () => ({ pageSize, containerRef }),
    [pageSize, containerRef],
  )

  return result
}
