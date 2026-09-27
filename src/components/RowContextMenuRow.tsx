import type { HTMLAttributes } from 'react'
import { use } from 'react'
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

  if (!config) {
    return <tr {...props} />
  }

  return (
    <ContextMenu
      ariaLabel={config.ariaLabel}
      items={config.items}
      onClick={config.onClick}
    >
      <tr
        {...rest}
        onContextMenuCapture={(event) => {
          if (isNativeContextMenuTarget(event.target)) {
            event.stopPropagation()
            return
          }
          onContextMenuCapture?.(event)
        }}
      />
    </ContextMenu>
  )
}
