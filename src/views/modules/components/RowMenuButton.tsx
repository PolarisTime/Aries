import { MoreOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { ContextMenu } from '@/components/ContextMenu'
import type { RowContextMenuConfig } from '@/components/row-context-menu'

interface Props {
  /** 该行的行菜单配置（由 `buildRowContextMenus` 生成）；缺省表示该行没有行级动作 */
  menu: RowContextMenuConfig | undefined
}

/**
 * 行菜单的**可见按钮**（⋮）。
 *
 * <p>按钮与右键 / 触摸长按 / Shift+F10 共用同一份 `RowContextMenuConfig`
 * （items、onClick、aria-label 都来自 `buildRowContextMenus` 一处），因此不会出现
 * "按钮能点、右键点不动"的漂移；焦点进首项、Escape 归还焦点由 `ContextMenu` 保证。</p>
 *
 * <p>渲染在首位身份列里（见 `business-grid-table` 的 IDENTITY_COLUMN_WIDTH），
 * 该列固定左侧，横向滚动时行操作入口始终可见。</p>
 */
export function RowMenuButton({ menu }: Props) {
  if (!menu) return null
  return (
    <ContextMenu
      ariaLabel={menu.ariaLabel}
      items={menu.items}
      onClick={menu.onClick}
      onOpenChange={(next) => {
        if (next) menu.onOpen?.()
      }}
      // 可见按钮与右键共用同一份菜单及其无障碍契约（焦点进首项 / Escape 归还焦点）
      triggers={['click', 'contextMenu']}
    >
      <Button
        aria-haspopup="menu"
        aria-label={menu.ariaLabel}
        className="module-row-more-actions"
        icon={<MoreOutlined />}
        size="small"
        type="text"
      />
    </ContextMenu>
  )
}
