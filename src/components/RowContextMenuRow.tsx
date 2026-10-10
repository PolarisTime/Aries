import {
  type HTMLAttributes,
  type KeyboardEvent,
  type Ref,
  type TouchEvent,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ContextMenu } from './ContextMenu'
import {
  isNativeContextMenuTarget,
  RowContextMenuContext,
} from './row-context-menu'

type RowProps = HTMLAttributes<HTMLTableRowElement> & {
  'data-row-key'?: string
  /** 表格行元素引用: 供 dnd-kit 等需要挂节点的场景透传到 <tr>。 */
  ref?: Ref<HTMLTableRowElement>
  /**
   * 是否启用「触摸长按打开菜单」这条入口, 默认开启。
   *
   * <p>同一个长按手势只能服务一个动作: 调用方若要把长按让给整行拖动(如提货单
   * 明细行), 传 false 关闭本入口。此时键盘(Shift+F10)与鼠标右键仍然可用;
   * 调用方必须另行保证触摸下这组命令有非拖动替代(见 WCAG 2.2 SC 2.5.7)。</p>
   */
  longPressToOpen?: boolean
}

/** 触摸长按打开行菜单的等待时长(与移动端长按唤起菜单的习惯一致)。 */
export const ROW_CONTEXT_MENU_LONG_PRESS_MS = 600
/** 长按期间允许的手指抖动像素: 超过即视为滚动/拖拽, 取消长按。 */
export const ROW_CONTEXT_MENU_LONG_PRESS_MOVE_TOLERANCE_PX = 10

/**
 * 表格行容器: 若该行在上下文里有菜单配置, 就把整行包成上下文菜单的触发器。
 *
 * <p>挂在 `<tr>` 自身(antd Dropdown 用 cloneElement 注入事件), 不会在 tbody 里
 * 插入非表格元素; 输入控件上的右键完全放行, 保留浏览器原生菜单。</p>
 *
 * <p>三个等价入口共用同一份菜单与同一套无障碍契约(可访问名、打开后焦点进首项、
 * Escape 归还焦点):</p>
 * <ol>
 *   <li>鼠标右键行内区域;</li>
 *   <li>键盘: 行可聚焦(tabIndex=0)后按 Shift+F10 或上下文菜单键;</li>
 *   <li>触摸: 长按 600ms(移动超过阈值、滚动或提前抬手都取消);可用
 *     {@link RowProps.longPressToOpen} 关闭, 把长按让给其它手势。</li>
 * </ol>
 */
export function RowContextMenuRow(props: RowProps) {
  const menus = use(RowContextMenuContext)
  const rowKey = props['data-row-key']
  const config = rowKey === undefined ? undefined : menus?.get(String(rowKey))
  const {
    onContextMenuCapture,
    onKeyDown,
    longPressToOpen = true,
    ref,
    ...rest
  } = props
  const [open, setOpen] = useState(false)
  /** 当前开合状态(避免同一轮事件里重复触发 onOpen)。 */
  const openRef = useRef(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null)
  /** 是否有待决的长按(用于只在长按期间监听滚动)。 */
  const [pressPending, setPressPending] = useState(false)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartRef.current = null
  }, [])

  const cancelLongPress = useCallback(() => {
    clearLongPressTimer()
    setPressPending(false)
  }, [clearLongPressTimer])

  const onOpenChange = useCallback(
    (next: boolean) => {
      // 打开即把选中态同步到该行(调用方注入), 再走原有开合逻辑
      if (next && !openRef.current) config?.onOpen?.()
      openRef.current = next
      setOpen(next)
    },
    [config],
  )

  // 触摸滚动必须取消待决长按: 否则滚动到别的行却弹出原行菜单
  useEffect(() => {
    if (!pressPending) return
    const handleScroll = () => cancelLongPress()
    window.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    })
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true })
    }
  }, [cancelLongPress, pressPending])

  useEffect(
    () => () => {
      clearLongPressTimer()
    },
    [clearLongPressTimer],
  )

  if (!config) {
    // 没有菜单的行保持普通 tr(不引入键盘/触摸入口, 也不占用 Tab 序)
    return <tr {...rest} ref={ref} />
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    // APG: Shift+F10 / 上下文菜单键是"键盘右键", 必须与鼠标右键等价
    const isContextMenuKey =
      event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
    if (!isContextMenuKey) return
    event.preventDefault()
    onOpenChange(true)
  }

  const handleTouchStart = (event: TouchEvent<HTMLTableRowElement>) => {
    // 输入控件上保留原生长按(选择/粘贴), 不劫持
    if (isNativeContextMenuTarget(event.target)) return
    if (event.touches.length !== 1) {
      cancelLongPress()
      return
    }
    const touch = event.touches[0]
    clearLongPressTimer()
    longPressStartRef.current = { x: touch.clientX, y: touch.clientY }
    setPressPending(true)
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      longPressStartRef.current = null
      setPressPending(false)
      onOpenChange(true)
    }, ROW_CONTEXT_MENU_LONG_PRESS_MS)
  }

  const handleTouchMove = (event: TouchEvent<HTMLTableRowElement>) => {
    const start = longPressStartRef.current
    if (!start || event.touches.length !== 1) {
      cancelLongPress()
      return
    }
    const touch = event.touches[0]
    const moved =
      Math.abs(touch.clientX - start.x) >
        ROW_CONTEXT_MENU_LONG_PRESS_MOVE_TOLERANCE_PX ||
      Math.abs(touch.clientY - start.y) >
        ROW_CONTEXT_MENU_LONG_PRESS_MOVE_TOLERANCE_PX
    if (moved) cancelLongPress()
  }

  const keyboardShortcuts = [rest['aria-keyshortcuts'], 'Shift+F10']
    .filter(Boolean)
    .join(' ')

  /**
   * 长按让给别人时不再挂 touch 处理: 否则同一手势会同时触发菜单与拖动。
   * 键盘(Shift+F10)与鼠标右键不受影响。
   */
  const touchHandlers = longPressToOpen
    ? {
        onTouchCancel: cancelLongPress,
        onTouchEnd: cancelLongPress,
        onTouchMove: handleTouchMove,
        onTouchStart: handleTouchStart,
      }
    : {}

  return (
    <ContextMenu
      ariaLabel={config.ariaLabel}
      items={config.items}
      onClick={config.onClick}
      open={open}
      onOpenChange={onOpenChange}
    >
      <tr
        {...rest}
        {...touchHandlers}
        ref={ref}
        aria-keyshortcuts={keyboardShortcuts}
        tabIndex={rest.tabIndex ?? 0}
        onContextMenuCapture={(event) => {
          if (isNativeContextMenuTarget(event.target)) {
            event.stopPropagation()
            return
          }
          onContextMenuCapture?.(event)
        }}
        onKeyDown={handleKeyDown}
      />
    </ContextMenu>
  )
}
