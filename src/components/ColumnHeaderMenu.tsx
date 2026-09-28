import {
  EyeInvisibleOutlined,
  SettingOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { type ReactElement, use, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContextMenu } from './ContextMenu'
import { ColumnSettingsRequestContext } from './column-settings-request-context'

export interface ColumnHeaderMenuProps {
  /** 列标题, 用于拼出菜单的可访问名 */
  columnTitle: string
  /** 自定义菜单可访问名(默认按 columnTitle 拼「列操作菜单」) */
  ariaLabel?: string
  /** 该列已经是第一/最后一列: 对应项禁用而不是隐藏, 让读屏用户能发现边界 */
  isFirst?: boolean
  isLast?: boolean
  /** 隐藏该列; 表格不支持列显隐时不传, 对应项不渲染 */
  onHide?: () => void
  /** 移到最前/最后; 表格不支持列排序时不传, 对应项不渲染 */
  onMoveFirst?: () => void
  onMoveLast?: () => void
  /** 追加业务自定义菜单项(渲染在「隐藏该列」之前) */
  extraItems?: MenuProps['items']
  /** 追加项(非基元内部 key)的点击回调 */
  onExtraItem?: (key: string) => void
  /** 表头区域节点 */
  children: ReactElement
}

/**
 * 表格列头的右键菜单: 隐藏该列 / 移到最前 / 移到最后 / 列设置…
 *
 * <p>列头此前完全没有逐列入口(要隐藏某列必须打开工具栏的「列设置」再找),
 * 这里是右键补充入口; 可见的「列设置」按钮保持不变。</p>
 *
 * <p>右键是隐藏技能, 因此触发器本身是键盘可达的(WCAG 2.1.1): 聚焦后按
 * Shift+F10 或 ContextMenu 键即可打开菜单, Escape 关闭后焦点回到该列头。</p>
 */
export function ColumnHeaderMenu({
  columnTitle,
  ariaLabel,
  isFirst,
  isLast,
  onHide,
  onMoveFirst,
  onMoveLast,
  extraItems,
  onExtraItem,
  children,
}: ColumnHeaderMenuProps) {
  const { t } = useTranslation()
  const requestColumnSettings = use(ColumnSettingsRequestContext)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  const items: MenuProps['items'] = []
  // 业务追加项(如「一键填入供应商…」)排在基元项之前
  if (extraItems?.length) {
    items.push(...extraItems)
  }
  if (onHide) {
    if (items.length) items.push({ type: 'divider' })
    items.push({
      key: 'hide',
      icon: <EyeInvisibleOutlined />,
      label: t('common.columnMenu.hide'),
    })
  }
  // 只有支持列排序的表才出现这两项(基础数据/资料表只能隐藏, 不能换序)
  if (onMoveFirst || onMoveLast) {
    if (items.length) items.push({ type: 'divider' })
    if (onMoveFirst) {
      items.push({
        key: 'move-first',
        icon: <VerticalAlignTopOutlined />,
        // 已在最前时不禁用隐藏, 而是保留条目并在文案里说明原因(禁用项由 ContextMenu 保证可聚焦)
        label: isFirst
          ? t('common.columnMenu.moveFirstDisabled')
          : t('common.columnMenu.moveFirst'),
        disabled: Boolean(isFirst),
      })
    }
    if (onMoveLast) {
      items.push({
        key: 'move-last',
        icon: <VerticalAlignBottomOutlined />,
        label: isLast
          ? t('common.columnMenu.moveLastDisabled')
          : t('common.columnMenu.moveLast'),
        disabled: Boolean(isLast),
      })
    }
  }
  if (requestColumnSettings) {
    if (items.length) items.push({ type: 'divider' })
    items.push({
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('common.columnMenu.settings'),
    })
  }
  // 一个可用动作都没有时不要挂菜单: 空菜单比没有菜单更糟(读屏只会念"菜单")
  if (!items.length) return children

  return (
    <ContextMenu
      ariaLabel={
        ariaLabel ?? t('common.columnMenu.label', { column: columnTitle })
      }
      items={items}
      open={open}
      onOpenChange={setOpen}
      // Escape 关闭后焦点归还列头, 而不是打开菜单时恰好持有焦点的任意元素
      returnFocusRef={triggerRef}
      onClick={({ key }) => {
        const itemKey = String(key)
        if (itemKey === 'hide') {
          onHide?.()
          return
        }
        if (itemKey === 'move-first') {
          onMoveFirst?.()
          return
        }
        if (itemKey === 'move-last') {
          onMoveLast?.()
          return
        }
        if (itemKey === 'settings') {
          requestColumnSettings?.()
          return
        }
        // 内部 key 上面都已 return, 其余一律交给业务方
        onExtraItem?.(itemKey)
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: 列头需要保持表格标题的既有版式, 不能换成原生 button; role="button" 是项目既有可聚焦包装模式 */}
      <span
        aria-haspopup="menu"
        aria-keyshortcuts="Shift+F10"
        className="column-header-menu-trigger"
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onKeyDownCapture={(event) => {
          /*
           * APG: role="button" 必须同时响应 Enter 与 Space(否则键盘用户打不开这个菜单,
           * WCAG 2.1.1); Shift+F10 / ContextMenu 键等价于"在焦点处打开上下文菜单"。
           * Space 必须 preventDefault, 否则会滚动页面。
           */
          const activatesButton =
            event.key === 'Enter' ||
            event.key === ' ' ||
            event.key === 'Spacebar'
          const opensContextMenu =
            event.key === 'ContextMenu' ||
            (event.key === 'F10' && event.shiftKey)
          if (!activatesButton && !opensContextMenu) return
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </span>
    </ContextMenu>
  )
}
