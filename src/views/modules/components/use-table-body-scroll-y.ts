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
  /** 外壳内容宽度：业务网格用它判断横向滚动阈值（`scroll.x`），其它表格可忽略。 */
  shellWidth: number
  shellStyle: CSSProperties
}

/**
 * 量取 `.module-table-shell` 容器可用高度，推算 antd Table 表体滚动高度。
 * 依赖外层 flex 布局为 shell 分配高度，滚动由表体自身承担。
 *
 * <p>顺带量取外壳宽度 `shellWidth`：业务网格要按「列宽合计 + 身份列宽」与容器宽度比较，
 * 决定是否开启横向滚动。同一帧内一起量，避免为宽度再挂一个 ResizeObserver。</p>
 */
export function useTableBodyScrollY(): TableBodyScrollYResult {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)
  const [shellWidth, setShellWidth] = useState(0)

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
      const nextShellWidth = shell.clientWidth
      setShellWidth((prev) => (prev === nextShellWidth ? prev : nextShellWidth))
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

  return { shellRef, scrollY, shellWidth, shellStyle }
}
