import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  COLUMN_WIDTH_STEP,
  clampColumnWidth,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from './supplier-quote-column-widths'

/**
 * 把手根元素的稳定类名。
 *
 * <p>命中区尺寸（≥24×24）、`cursor: col-resize` 与视觉竖线都由 `supplier-price.css`
 * 按这个类名提供 —— 组件只负责语义与交互，**不在这里写死尺寸**，否则样式表里的
 * 统一调整对这个把手失效。</p>
 */
export const COLUMN_RESIZE_HANDLE_CLASS = 'supplier-price-col-resize'

export interface ColumnResizeHandleProps {
  /** 列的可读名称（例如「中天 直条 12m」），只用于可访问名，不做业务定位。 */
  label: string
  /** 当前列宽（px）：既是 `aria-valuenow` 的来源，也是键盘调整的起点。 */
  width: number
  /** 键盘一档调整量，默认与逻辑模块共用 `COLUMN_WIDTH_STEP`。 */
  step?: number
  /** 调整后的宽度，已经夹在 `[MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH]` 内。 */
  onResize: (next: number) => void
  /** 恢复该列默认宽度（Home / 双击）。 */
  onReset: () => void
}

/**
 * 报价表列宽把手：可拖动、可键盘调整的竖直 splitter。
 *
 * <p>为什么必须有键盘路径（WCAG 2.2 SC 2.5.7 Dragging Movements）：纯拖动调整列宽的
 * 能力对键盘 / 读屏 / 运动障碍用户不可用，规范要求提供等价的不拖动操作。这里用
 * `role="separator"`（focusable separator = window splitter，可带 aria-valuenow）
 * + 左右方向键 ±`step` + Home 复位；`title` 同时把这条替代路径告诉鼠标用户。</p>
 *
 * <p>拖动只改宽度、不存偏好：是否落 localStorage 由 `SupplierQuoteBoard` 决定，
 * 组件保持纯受控（`width` 进、`onResize` 出），因此同一个组件也能被测试直接驱动。</p>
 */
export function ColumnResizeHandle({
  label,
  width,
  step = COLUMN_WIDTH_STEP,
  onResize,
  onReset,
}: ColumnResizeHandleProps) {
  const { t } = useTranslation()
  /**
   * 对外声明的当前宽度。
   *
   * <p>夹一遍再上报给无障碍树：`aria-valuenow` 超出 `aria-valuemin/max` 是非法取值，
   * 读屏会播报一个自相矛盾的数字。键盘调整同样以它为起点，保证"念到的宽度"
   * 与"按一下之后得到的宽度"一致。</p>
   */
  const currentWidth = clampColumnWidth(width)
  /**
   * window 上的拖动监听器只有一份，卸载时必然摘掉：组件被移除后还能收到 pointermove
   * 就会去调已经卸载实例的回调（父级表头重排时尤其容易踩到）。
   */
  const stopDragRef = useRef<(() => void) | null>(null)
  /**
   * 拖动跨越多个渲染帧，期间 props 可能更新（父级重渲染换了回调）。
   * ref 让 window 原生监听器始终读到最新回调，而不是 pointerdown 那一刻的闭包。
   */
  const callbacksRef = useRef({ onResize, onReset })

  useEffect(() => {
    callbacksRef.current = { onResize, onReset }
  }, [onResize, onReset])

  useEffect(() => {
    return () => {
      stopDragRef.current?.()
    }
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 只响应左键：右键/中键按下不进入拖动（右键还要留给上下文菜单）。
    if (event.button !== 0) return
    // 拖动列宽时不要顺带选中文本，也不要让表格行拖拽 / 排序收到这次按下。
    event.preventDefault()
    event.stopPropagation()
    stopDragRef.current?.()
    const startX = event.clientX
    // 起点取 pointerdown 那一刻的宽度：拖动期间父级会随 onResize 更新 width，
    // 若从最新 props 反推就会把"已拖过的位移"再叠加一次，越拖越偏。
    const startWidth = currentWidth
    const handleMove = (moveEvent: PointerEvent) => {
      callbacksRef.current.onResize(
        clampColumnWidth(startWidth + moveEvent.clientX - startX),
      )
    }
    const stopDrag = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
      if (stopDragRef.current === stopDrag) stopDragRef.current = null
    }
    stopDragRef.current = stopDrag
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stopDrag)
    // pointercancel：触屏被系统手势抢走时也要收尾，否则监听器永远留着。
    window.addEventListener('pointercancel', stopDrag)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // 必须消费掉方向键：否则焦点被移到相邻单元格，表格还会横向滚动。
      event.preventDefault()
      event.stopPropagation()
      const delta = event.key === 'ArrowRight' ? step : -step
      callbacksRef.current.onResize(clampColumnWidth(currentWidth + delta))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      event.stopPropagation()
      callbacksRef.current.onReset()
    }
  }

  /*
   * 用显式 role="separator" 的 div 而不是 <hr>：`<hr>` 自带 UA 的 border / margin
   * （主题分隔的版式），要被 CSS 全部推翻才能当绝对定位的把手用；而本元素是带
   * aria-valuenow 的 window splitter，不是文档里的主题分隔。语义等价（两者在
   * 无障碍树里都是 separator），结构与样式成本不同。
   */
  return (
    // biome-ignore lint/a11y/useSemanticElements: 可聚焦 window splitter（带 aria-valuenow）而不是 <hr> 的主题分隔语义；<hr> 的 UA 边框/外边距会干扰把手定位
    <div
      className={COLUMN_RESIZE_HANDLE_CLASS}
      role="separator"
      aria-orientation="vertical"
      aria-label={t('priceCompare.supplierPrice.resizeColumn', { name: label })}
      aria-valuemin={MIN_COLUMN_WIDTH}
      aria-valuemax={MAX_COLUMN_WIDTH}
      aria-valuenow={currentWidth}
      aria-valuetext={`${currentWidth}px`}
      title={t('priceCompare.supplierPrice.resizeColumnHint')}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => callbacksRef.current.onReset()}
    />
  )
}
