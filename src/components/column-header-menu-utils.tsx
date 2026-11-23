import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EyeInvisibleOutlined,
  SettingOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { TFunction } from 'i18next'

/**
 * 列头右键菜单的「菜单项装配」「点击分发」「键盘激活」三块纯逻辑。
 *
 * <p>从 ColumnHeaderMenu.tsx 抽出的原因：组件内联这三块会把控制流复杂度推到 20 以上
 * （react-doctor/no-high-complexity-react-function），而它们本身不依赖任何 React 状态，
 * 只是「按可用动作拼条目 → 按 key 分发 → 判断按键是否等价于打开菜单」。
 * 抽成纯函数后组件只负责渲染与受控开关，分支数大幅下降，且这三块可以直接单测。</p>
 *
 * <p>注意：这里只搬运判断，不改变任何行为——条目顺序（业务追加项 → 隐藏 → 移到最前/左移/右移/最后 →
 * 列设置）、分隔线的插入条件、边界项的禁用与文案回退完全保持原样。</p>
 */

export interface ColumnHeaderMenuItemsInput {
  /** 隐藏该列; 表格不支持列显隐时不传, 对应项不渲染 */
  onHide?: () => void
  /** 移到最前/左移/右移/最后; 表格不支持对应排序时不传, 对应项不渲染 */
  onMoveFirst?: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onMoveLast?: () => void
  /** 该列已经是第一/最后一列: 对应项禁用而不是隐藏, 让读屏用户能发现边界 */
  isFirst?: boolean
  isLast?: boolean
  /** 是否存在列设置上下文; 为真时追加「列设置…」 */
  hasColumnSettings: boolean
  /** 追加业务自定义菜单项(渲染在「隐藏该列」之前) */
  extraItems?: MenuProps['items']
  t: TFunction
}

function buildMoveMenuItems({
  onMoveFirst,
  onMoveLeft,
  onMoveRight,
  onMoveLast,
  isFirst,
  isLast,
  t,
}: Pick<
  ColumnHeaderMenuItemsInput,
  | 'onMoveFirst'
  | 'onMoveLeft'
  | 'onMoveRight'
  | 'onMoveLast'
  | 'isFirst'
  | 'isLast'
  | 't'
>): NonNullable<MenuProps['items']> {
  const moveItems: NonNullable<MenuProps['items']> = []
  if (onMoveFirst) {
    moveItems.push({
      key: 'move-first',
      icon: <VerticalAlignTopOutlined />,
      // 已在最前时不禁用隐藏, 而是保留条目并在文案里说明原因(禁用项由 ContextMenu 保证可聚焦)
      label: isFirst
        ? t('common.columnMenu.moveFirstDisabled')
        : t('common.columnMenu.moveFirst'),
      disabled: Boolean(isFirst),
    })
  }
  if (onMoveLeft) {
    moveItems.push({
      key: 'move-left',
      icon: <ArrowLeftOutlined />,
      label: isFirst
        ? t('common.columnMenu.moveLeftDisabled')
        : t('common.columnMenu.moveLeft'),
      disabled: Boolean(isFirst),
    })
  }
  if (onMoveRight) {
    moveItems.push({
      key: 'move-right',
      icon: <ArrowRightOutlined />,
      label: isLast
        ? t('common.columnMenu.moveRightDisabled')
        : t('common.columnMenu.moveRight'),
      disabled: Boolean(isLast),
    })
  }
  if (onMoveLast) {
    moveItems.push({
      key: 'move-last',
      icon: <VerticalAlignBottomOutlined />,
      label: isLast
        ? t('common.columnMenu.moveLastDisabled')
        : t('common.columnMenu.moveLast'),
      disabled: Boolean(isLast),
    })
  }
  return moveItems
}

export function buildColumnHeaderMenuItems({
  onHide,
  onMoveFirst,
  onMoveLeft,
  onMoveRight,
  onMoveLast,
  isFirst,
  isLast,
  hasColumnSettings,
  extraItems,
  t,
}: ColumnHeaderMenuItemsInput): NonNullable<MenuProps['items']> {
  const items: NonNullable<MenuProps['items']> = []
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
  // 只有支持列排序的表才出现移动项(基础数据/资料表只能隐藏, 不能换序)
  const moveItems = buildMoveMenuItems({
    onMoveFirst,
    onMoveLeft,
    onMoveRight,
    onMoveLast,
    isFirst,
    isLast,
    t,
  })
  if (moveItems.length) {
    if (items.length) items.push({ type: 'divider' })
    items.push(...moveItems)
  }
  if (hasColumnSettings) {
    if (items.length) items.push({ type: 'divider' })
    items.push({
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('common.columnMenu.settings'),
    })
  }
  return items
}

export interface ColumnHeaderMenuActionHandlers {
  onHide?: () => void
  onMoveFirst?: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onMoveLast?: () => void
  onRequestColumnSettings?: () => void
  /** 追加项(非基元内部 key)的点击回调 */
  onExtraItem?: (key: string) => void
}

/** 内部 key 在此收敛, 其余一律交给业务方。 */
export function resolveColumnHeaderMenuAction(
  itemKey: string,
  {
    onHide,
    onMoveFirst,
    onMoveLeft,
    onMoveRight,
    onMoveLast,
    onRequestColumnSettings,
    onExtraItem,
  }: ColumnHeaderMenuActionHandlers,
) {
  const handlers: Record<string, (() => void) | undefined> = {
    hide: onHide,
    'move-first': onMoveFirst,
    'move-left': onMoveLeft,
    'move-right': onMoveRight,
    'move-last': onMoveLast,
    settings: onRequestColumnSettings,
  }
  if (itemKey in handlers) {
    handlers[itemKey]?.()
    return
  }
  onExtraItem?.(itemKey)
}

/**
 * APG: role="button" 必须同时响应 Enter 与 Space(否则键盘用户打不开这个菜单,
 * WCAG 2.1.1); Shift+F10 / ContextMenu 键等价于"在焦点处打开上下文菜单"。
 */
export function isColumnHeaderMenuActivationKey(event: {
  key: string
  shiftKey: boolean
}) {
  const activatesButton =
    event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar'
  const opensContextMenu =
    event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)
  return activatesButton || opensContextMenu
}
