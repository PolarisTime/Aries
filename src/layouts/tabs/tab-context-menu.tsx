import { ReloadOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd/es/menu'
import type { TFunction } from 'i18next'
import { isTabPinned, type LayoutTab } from '@/stores/layoutTabsStore'

/** 批量关闭的四种范围（与菜单项 key 一一对应）。 */
export type TabCloseKind = 'others' | 'left' | 'right' | 'all'

/** 某个标签的四个「待关闭集合」：动作与禁用边界共用同一份，避免两者分叉。 */
export interface TabCloseTargets {
  others: string[]
  left: string[]
  right: string[]
  all: string[]
}

/**
 * 计算某个标签的批量关闭范围。
 *
 * <p>钉选（{@link isTabPinned}）标签不算「可关闭的邻居」，也不参与任何批量关闭；工作台是
 * 结构钉选标签，因此它天然被排除在外。「关闭其他」排除目标自身。</p>
 */
export function resolveTabCloseTargets(
  tabs: LayoutTab[],
  tabId: string,
): TabCloseTargets {
  const tabIndex = tabs.findIndex((tab) => tab.id === tabId)
  const removable = tabs.filter((tab) => !isTabPinned(tab))
  return {
    others: removable.flatMap((tab) => (tab.id === tabId ? [] : [tab.id])),
    left:
      tabIndex < 0
        ? []
        : tabs.flatMap((tab, index) =>
            index < tabIndex && !isTabPinned(tab) ? [tab.id] : [],
          ),
    right:
      tabIndex < 0
        ? []
        : tabs.flatMap((tab, index) =>
            index > tabIndex && !isTabPinned(tab) ? [tab.id] : [],
          ),
    all: removable.map((tab) => tab.id),
  }
}

export interface TabContextMenuOptions {
  tab: LayoutTab
  t: TFunction
  targets: TabCloseTargets
}

/**
 * 构造标签右键菜单项。
 *
 * <p>禁用边界与动作共用同一份 {@link TabCloseTargets}：两者各写一遍迟早分叉，出现
 * 「菜单项可点但什么也不发生」（例如末位标签上的「关闭右侧」会白把激活项切到自己身上）。
 * 禁用即软禁用（ContextMenu 实现：仍在键盘序列里、带 `aria-disabled`，激活无效）。</p>
 */
export function buildTabContextMenuItems({
  tab,
  t,
  targets,
}: TabContextMenuOptions): MenuProps['items'] {
  return [
    {
      key: 'refresh',
      icon: <ReloadOutlined />,
      label: t('layouts.tabs.refresh'),
    },
    // 工作台的结构钉选不可由用户解除，因此固定项对它整体不出现
    ...(tab.pinned
      ? []
      : [
          {
            key: tab.userPinned ? 'unpin' : 'pin',
            label: t(
              tab.userPinned ? 'layouts.tabs.unpin' : 'layouts.tabs.pin',
            ),
          },
        ]),
    { type: 'divider' },
    // 不可关闭的标签不出现「关闭当前标签」这一删除类项
    ...(isTabPinned(tab)
      ? []
      : [{ key: 'close', label: t('layouts.tabs.close') }]),
    {
      key: 'closeOthers',
      label: t('layouts.tabs.closeOthers'),
      disabled: targets.others.length === 0,
    },
    {
      key: 'closeLeft',
      label: t('layouts.tabs.closeLeft'),
      disabled: targets.left.length === 0,
    },
    {
      key: 'closeRight',
      label: t('layouts.tabs.closeRight'),
      disabled: targets.right.length === 0,
    },
    {
      key: 'closeAll',
      label: t('layouts.tabs.closeAll'),
      disabled: targets.all.length === 0,
    },
  ]
}

/** 菜单动作需要的外部能力：由调用方注入，本模块不直接依赖 store 与路由。 */
export interface TabContextMenuHandlers {
  onRefresh: (tabId: string) => void
  onClose: (tabId: string) => void
  onSetPinned: (tabId: string, pinned: boolean) => void
  /** 批量关闭：`ids` 为已算好的待关闭集合，脏检查与移除由调用方负责 */
  onCloseMany: (tabId: string, ids: string[], kind: TabCloseKind) => void
}

/** 把菜单项 key 映射为具体动作（未识别的 key 不产生任何动作）。 */
export function applyTabContextMenuAction(
  key: string,
  tab: LayoutTab,
  targets: TabCloseTargets,
  handlers: TabContextMenuHandlers,
): void {
  switch (key) {
    case 'refresh':
      handlers.onRefresh(tab.id)
      break
    case 'pin':
    case 'unpin':
      handlers.onSetPinned(tab.id, key === 'pin')
      break
    case 'close':
      handlers.onClose(tab.id)
      break
    case 'closeOthers':
      handlers.onCloseMany(tab.id, targets.others, 'others')
      break
    case 'closeLeft':
      handlers.onCloseMany(tab.id, targets.left, 'left')
      break
    case 'closeRight':
      handlers.onCloseMany(tab.id, targets.right, 'right')
      break
    case 'closeAll':
      handlers.onCloseMany(tab.id, targets.all, 'all')
      break
    default:
      break
  }
}
