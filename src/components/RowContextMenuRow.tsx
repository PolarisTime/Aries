import { type HTMLAttributes, use, useRef, useState } from 'react'
import { ContextMenu } from './ContextMenu'
import {
  isNativeContextMenuTarget,
  RowContextMenuContext,
} from './row-context-menu'

type RowProps = HTMLAttributes<HTMLTableRowElement> & {
  'data-row-key'?: string
}

/**
 * 表格行容器: 若该行在上下文里有菜单配置, 就把整行包成右键菜单的触发器。
 *
 * <p>挂在 `<tr>` 自身(antd Dropdown 用 cloneElement 注入事件), 不会在 tbody 里
 * 插入非表格元素; 输入控件上的右键完全放行, 保留浏览器原生菜单。</p>
 */
export function RowContextMenuRow(props: RowProps) {
  const menus = use(RowContextMenuContext)
  const rowKey = props['data-row-key']
  const config = rowKey === undefined ? undefined : menus?.get(String(rowKey))
  const { onContextMenuCapture, ...rest } = props
  const [open, setOpen] = useState(false)
  /**
   * 行尾「更多」按钮自己带 contextMenu 触发器: 该按钮上的右键只应由按钮的菜单响应。
   * 这里不能用 stopPropagation(捕获阶段截断会让事件根本到不了按钮), 所以改为在
   * 捕获阶段记下事件来源, 再拒绝行菜单这一次的打开请求。
   */
  const fromRowActionsButtonRef = useRef(false)

  if (!config) {
    return <tr {...props} />
  }

  return (
    <ContextMenu
      ariaLabel={config.ariaLabel}
      items={config.items}
      onClick={config.onClick}
      open={open}
      onOpenChange={(next) => {
        // 打开即把选中态同步到该行(调用方注入), 再走原有开合逻辑
        if (next) config.onOpen?.()
        if (next && fromRowActionsButtonRef.current) return
        setOpen(next)
      }}
    >
      <tr
        {...rest}
        onContextMenuCapture={(event) => {
          if (isNativeContextMenuTarget(event.target)) {
            event.stopPropagation()
            return
          }
          fromRowActionsButtonRef.current = Boolean(
            (event.target as HTMLElement | null)?.closest(
              '.table-row-actions-btn',
            ),
          )
          if (fromRowActionsButtonRef.current) return
          onContextMenuCapture?.(event)
        }}
      />
    </ContextMenu>
  )
}
