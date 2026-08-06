import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react'

/** 可拖拽列宽的下限/上限（与后端服务端 clamp、本地存储归一化共用） */
export const MIN_COLUMN_WIDTH = 80
export const MAX_COLUMN_WIDTH = 800

/** 键盘方向键单次调整步长 */
const KEYBOARD_RESIZE_STEP = 10

function clampWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toNumber(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export interface ResizableHeaderCellProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** 列 key（dataIndex） */
  'data-column-key'?: string
  /** 该列是否可拖拽调整宽度 */
  'data-resizable'?: string
  /** 双击把手复位的默认宽度 */
  'data-default-width'?: string
  'data-min-width'?: string
  'data-max-width'?: string
  /** 拖拽中实时回调（仅更新 UI，不持久化） */
  onResizePreview?: (width: number) => void
  /** 拖拽结束回调（触发持久化） */
  onResizeCommit?: () => void
  /** 双击把手复位该列宽度 */
  onResizeReset?: () => void
}

/**
 * 表格表头单元格，为可调整列在最右侧渲染拖拽把手。
 * 通过 antd Table 的 `components={{ header: { cell } }}` 注入，
 * onHeaderCell 返回的附加 props 会透传到此组件（已核实 @rc-component/table 的透传行为）。
 */
export function ResizableHeaderCell(props: ResizableHeaderCellProps) {
  const {
    children,
    className,
    style,
    onResizePreview,
    onResizeCommit,
    onResizeReset,
    ...thProps
  } = props
  const resizable = props['data-resizable'] === 'true'
  const defaultWidth = toNumber(props['data-default-width'], MIN_COLUMN_WIDTH)
  const minWidth = Math.min(
    toNumber(props['data-min-width'], MIN_COLUMN_WIDTH),
    defaultWidth,
  )
  const maxWidth = toNumber(props['data-max-width'], MAX_COLUMN_WIDTH)

  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const currentWidthRef = useRef(0)
  const rafIdRef = useRef(0)
  const boundHandlersRef = useRef<{
    move: (event: PointerEvent) => void
    up: () => void
  } | null>(null)

  // 供 window 原生监听器读取最新回调，避免闭包捕获旧 props
  const callbacksRef = useRef({ onResizePreview, onResizeCommit })
  useEffect(() => {
    callbacksRef.current = { onResizePreview, onResizeCommit }
  })

  useEffect(() => {
    return () => {
      const bound = boundHandlersRef.current
      if (bound) {
        window.removeEventListener('pointermove', bound.move)
        window.removeEventListener('pointerup', bound.up)
        window.removeEventListener('pointercancel', bound.up)
      }
      if (rafIdRef.current !== 0) {
        cancelAnimationFrame(rafIdRef.current)
      }
      document.body.classList.remove('table-column-resizing')
    }
  }, [])

  const handlePointerMove = (event: PointerEvent) => {
    currentWidthRef.current = clampWidth(
      startWidthRef.current + event.clientX - startXRef.current,
      minWidth,
      maxWidth,
    )
    // rAF 合并高频 pointermove，降低拖拽期间 setState 频率
    if (rafIdRef.current !== 0) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0
      callbacksRef.current.onResizePreview?.(currentWidthRef.current)
    })
  }

  const handlePointerUp = () => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
    boundHandlersRef.current = null
    document.body.classList.remove('table-column-resizing')
    callbacksRef.current.onResizeCommit?.()
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const headerCell = event.currentTarget.closest('th')
    if (!headerCell) return
    event.preventDefault()
    event.stopPropagation()
    startXRef.current = event.clientX
    startWidthRef.current =
      headerCell.getBoundingClientRect().width || defaultWidth
    boundHandlersRef.current = { move: handlePointerMove, up: handlePointerUp }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    document.body.classList.add('table-column-resizing')
  }

  const adjustByKeyboard = (
    headerCell: HTMLTableCellElement | null,
    delta: number,
  ) => {
    const currentWidth =
      headerCell?.getBoundingClientRect().width || defaultWidth
    const next = clampWidth(currentWidth + delta, minWidth, maxWidth)
    onResizePreview?.(next)
    onResizeCommit?.()
  }

  const handleHandleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const headerCell = event.currentTarget.closest('th')
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      adjustByKeyboard(headerCell, -KEYBOARD_RESIZE_STEP)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      adjustByKeyboard(headerCell, KEYBOARD_RESIZE_STEP)
    } else if (event.key === 'Home') {
      event.preventDefault()
      onResizeReset?.()
    }
  }

  return (
    <th className={className} style={style} {...thProps}>
      {children}
      {resizable && (
        <hr
          className="table-resize-handle"
          aria-orientation="vertical"
          aria-label={`调整列宽（${props['data-column-key'] ?? ''}）`}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={defaultWidth}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onDoubleClick={onResizeReset}
          onKeyDown={handleHandleKeyDown}
        />
      )}
    </th>
  )
}
