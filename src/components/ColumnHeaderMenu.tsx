import {
  EyeInvisibleOutlined,
  SettingOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { type ReactElement, use } from 'react'
import { useTranslation } from 'react-i18next'
import { ContextMenu } from './ContextMenu'
import { ColumnSettingsRequestContext } from './column-settings-request-context'

export interface ColumnHeaderMenuProps {
  /** 列标题, 用于拼出菜单的可访问名 */
  columnTitle: string
  /** 该列已经是第一/最后一列: 对应项禁用而不是隐藏, 让读屏用户能发现边界 */
  isFirst: boolean
  isLast: boolean
  onHide: () => void
  onMoveFirst: () => void
  onMoveLast: () => void
  /** 表头区域节点 */
  children: ReactElement
}

/**
 * 表格列头的右键菜单: 隐藏该列 / 移到最前 / 移到最后 / 列设置…
 *
 * <p>列头此前完全没有逐列入口(要隐藏某列必须打开工具栏的「列设置」再找),
 * 这里是右键补充入口; 可见的「列设置」按钮保持不变。</p>
 */
export function ColumnHeaderMenu({
  columnTitle,
  isFirst,
  isLast,
  onHide,
  onMoveFirst,
  onMoveLast,
  children,
}: ColumnHeaderMenuProps) {
  const { t } = useTranslation()
  const requestColumnSettings = use(ColumnSettingsRequestContext)

  const items: MenuProps['items'] = [
    {
      key: 'hide',
      icon: <EyeInvisibleOutlined />,
      label: t('common.columnMenu.hide'),
    },
    { type: 'divider' },
    {
      key: 'move-first',
      icon: <VerticalAlignTopOutlined />,
      label: t('common.columnMenu.moveFirst'),
      disabled: isFirst,
    },
    {
      key: 'move-last',
      icon: <VerticalAlignBottomOutlined />,
      label: t('common.columnMenu.moveLast'),
      disabled: isLast,
    },
  ]
  if (requestColumnSettings) {
    items.push(
      { type: 'divider' },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: t('common.columnMenu.settings'),
      },
    )
  }

  return (
    <ContextMenu
      ariaLabel={t('common.columnMenu.label', { column: columnTitle })}
      items={items}
      onClick={({ key }) => {
        if (key === 'hide') {
          onHide()
          return
        }
        if (key === 'move-first') {
          onMoveFirst()
          return
        }
        if (key === 'move-last') {
          onMoveLast()
          return
        }
        if (key === 'settings') {
          requestColumnSettings?.()
        }
      }}
    >
      {children}
    </ContextMenu>
  )
}
