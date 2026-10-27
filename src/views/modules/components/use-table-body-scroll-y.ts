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
  /** 表体可视宽度（不含纵向滚动条占位）：列宽合计不足时把富余让给最后一列用。 */
  bodyWidth: number
  shellStyle: CSSProperties
}

/**
 * 量取 `.module-table-shell` 容器可用高度，推算 antd Table 表体滚动高度。
 * 依赖外层 flex 布局为 shell 分配高度，滚动由表体自身承担。
 *
 * <p>顺带量取两个宽度（同一帧内一起量，避免为宽度再挂 ResizeObserver）：</p>
 * <ul>
 *   <li>`shellWidth`：外壳内容宽（`clientWidth`），用于判断"表格是否容器内放得下"；</li>
 *   <li>`bodyWidth`：表体可视宽（`.ant-table-body.clientWidth`）—— 它**不含纵向滚动条占位**。
 *     表格列宽合计要按它来分配富余，否则按 shellWidth 分配会被滚动条再挤出横向滚动条。</li>
 * </ul>
 */
export function useTableBodyScrollY(): TableBodyScrollYResult {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)
  const [shellWidth, setShellWidth] = useState(0)
  const [bodyWidth, setBodyWidth] = useState(0)
  /** 当前被观察的表体元素（表体可能被 rc-table 重建，重建后要重新 observe） */
  const observedBodyRef = useRef<Element | null>(null)

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

      const bodyEl = shell.querySelector('.ant-table-body') ?? shell
      if (bodyEl !== observedBodyRef.current) {
        if (observedBodyRef.current) observer.unobserve(observedBodyRef.current)
        observer.observe(bodyEl)
        observedBodyRef.current = bodyEl
      }
      const nextBodyWidth = bodyEl.clientWidth
      setBodyWidth((prev) => (prev === nextBodyWidth ? prev : nextBodyWidth))
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

  return { shellRef, scrollY, shellWidth, bodyWidth, shellStyle }
}
