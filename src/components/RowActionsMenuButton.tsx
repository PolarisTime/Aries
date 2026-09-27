import { MoreOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { use } from 'react'
import { useTranslation } from 'react-i18next'
import { ContextMenu } from './ContextMenu'
import { RowContextMenuContext } from './row-context-menu'

/**
 * 行尾可见的「更多」按钮: 与行右键共用同一份菜单。
 *
 * <p>右键是隐藏技能(没有提示、触屏不可用), 之前业务列表的行级动作
 * (编辑/附件)只能靠右键或"选中恰好 1 行后看工具栏"; 这个按钮把同一份菜单
 * 变成可见入口, 并顺带把菜单契约(可访问名/焦点进首项/Escape 归还)带到按钮上。</p>
 */
export function RowActionsMenuButton({ rowKey }: { rowKey: string }) {
  const menus = use(RowContextMenuContext)
  const { t } = useTranslation()
  const config = menus?.get(String(rowKey))
  if (!config) return null

  return (
    <ContextMenu
      ariaLabel={config.ariaLabel}
      items={config.items}
      onClick={config.onClick}
      triggers={['click', 'contextMenu']}
    >
      <Button
        aria-haspopup="menu"
        aria-label={t('common.rowActions')}
        className="table-row-actions-btn"
        icon={<MoreOutlined />}
        size="small"
        type="text"
      />
    </ContextMenu>
  )
}
