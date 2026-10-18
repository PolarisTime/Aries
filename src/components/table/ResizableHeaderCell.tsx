import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

/** 可拖拽列宽的下限/上限（与后端服务端 clamp、本地存储归一化共用） */
export const MIN_COLUMN_WIDTH = 80
export const MAX_COLUMN_WIDTH = 800

/** 键盘方向键单次调整步长 */
const KEYBOARD_RESIZE_STEP = 10

/**
 * 把列头文字压成一句可访问名用的短文本。
 *
 * <p>列头可能是「文字 + 排序图标 + 筛选图标」的组合，`textContent` 里只有文字部分有内容，
 * 图标只带 `aria-label`；因此折叠空白后即可当作列名。空标题列（明细/操作列）返回空串，
 * 由调用处退化成不带括号的通用名称，**绝不回退到内部字段 key**。</p>
 */
function normalizeColumnTitle(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** 可读列名 → 把手的可访问名（唯一拼接处，避免多处各拼一份）。 */
function buildResizeHandleLabel(columnTitle: string): string {
  return columnTitle ? `调整列宽（${columnTitle}）` : '调整列宽'
}

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
  /** 列 key（dataIndex）。**仅供拖拽/持久化定位，不得用作可访问名** —— 它是内部字段名 */
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

  const thRef = useRef<HTMLTableCellElement>(null)
  /**
   * 表头单元格的可读列名。
   *
   * <p>用于把手的可访问名。**不能**直接用 `data-column-key`：那是内部字段名
   * （`orderNo` / `settlementCompanyName` / `detail-toggle`…），读屏念出来是英文标识符，
   * 用户无法与界面上的中文表头对应。列头内容由 antd 透传到 `children`，
   * 折叠空白后即列名；空标题列（明细/操作列）退化为不带括号的通用名称。</p>
   */
  const [columnTitle, setColumnTitle] = useState('')
  /**
   * 把手当前对应列宽（像素），驱动 `aria-valuenow` / `aria-valuetext`。
   *
   * <p>**必须与实际渲染宽度同步**：`aria-valuenow` 只写默认宽度会在拖拽/键盘调整后
   * 过期（实测默认 160 的列被键盘调到 182 后，无障碍树里的 value 仍是 160），
   * 读屏播报的是错误数字。「声明了但不准」比不声明更糟。</p>
   */
  const [handleWidth, setHandleWidth] = useState(defaultWidth)

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

  /*
   * 每次渲染后把「列名 + 实际列宽」同步到 state。
   *
   * 宽度不靠回调推算：拖拽走 onResizePreview → 父级 state → 重渲染，
   * 键盘走 onResizePreview/onResizeCommit 同样回到重渲染，但从 props 反推宽度要重复一遍
   * 列宽解析口径（列宽可能来自本地存储覆盖、服务端 clamp）。直接读布局宽度只有一个来源。
   * 写入前比对，保证不会自触发循环。
   */
  useLayoutEffect(() => {
    const cell = thRef.current
    if (!resizable || !cell) {
      return
    }
    const nextTitle = normalizeColumnTitle(cell.textContent ?? '')
    setColumnTitle((previous) =>
      previous === nextTitle ? previous : nextTitle,
    )
    const nextWidth = Math.round(cell.getBoundingClientRect().width)
    if (nextWidth > 0) {
      setHandleWidth((previous) =>
        previous === nextWidth ? previous : nextWidth,
      )
    }
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
    <th ref={thRef} className={className} style={style} {...thProps}>
      {children}
      {resizable && (
        /*
         * 把手语义说明（P2-9）：
         * ① 可访问名用**列的可读标题**，不再用内部字段 key（`data-column-key` 只服务
         *    拖拽与持久化定位，读屏念 `settlementCompanyName` 毫无意义）；
         * ② `<hr>` 的隐式 role 是 separator，且本元素是 focusable —— 按 ARIA 规范，
         *    focusable separator 可带 aria-valuenow/min/max，实测无障碍树里确实生效
         *    （role=separator、value=当前宽度、settable=true）。因此这些属性**保留并修正**：
         *    原实现的缺陷是 valuenow 恒等于默认宽度、调整后不更新（实测 160 → 实际 182
         *    仍报 160），读屏播报错误数字。现在由 useLayoutEffect 跟随真实布局宽度同步。
         */
        <hr
          className="table-resize-handle"
          aria-orientation="vertical"
          aria-label={buildResizeHandleLabel(columnTitle)}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={handleWidth}
          aria-valuetext={`${handleWidth} 像素`}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onDoubleClick={onResizeReset}
          onKeyDown={handleHandleKeyDown}
        />
      )}
    </th>
  )
}
