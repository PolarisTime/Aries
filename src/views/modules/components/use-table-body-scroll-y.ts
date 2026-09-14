import {
  type CSSProperties,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  computeTableAvailableHeight,
  computeTableBodyScrollY,
  MIN_TABLE_BODY_SCROLL_Y,
} from '@/views/modules/components/business-grid-table-utils'

export interface TableBodyScrollYResult {
  shellRef: RefObject<HTMLDivElement | null>
  scrollY: number
  shellStyle: CSSProperties
}

/**
 * 量取 `.module-table-shell` 容器可用高度，推算 antd Table 表体滚动高度。
 * 依赖外层 flex 布局为 shell 分配高度，滚动由表体自身承担。
 */
export function useTableBodyScrollY(): TableBodyScrollYResult {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const measure = () => {
      const availableHeight = computeTableAvailableHeight(shell.clientHeight)
      if (availableHeight <= 0) return
      const headerHeight =
        shell.querySelector('.ant-table-thead')?.getBoundingClientRect()
          .height || 0
      const nextScrollY = computeTableBodyScrollY(
        availableHeight,
        headerHeight,
        0,
      )
      setScrollY((prev) => (prev === nextScrollY ? prev : nextScrollY))
    }
    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(shell)
    measure()
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  const shellStyle = {
    '--module-table-body-height': `${scrollY}px`,
  } as CSSProperties

  return { shellRef, scrollY, shellStyle }
}
