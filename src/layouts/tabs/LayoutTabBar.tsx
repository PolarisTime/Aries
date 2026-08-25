import { ReloadOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { Dropdown, Tabs } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { getPageDefinition } from '@/config/page-registry'
import {
  confirmBatchTabClose,
  requestEditorSessionClose,
} from '@/layouts/editor-session/request-close'
import {
  detachTabRouter,
  replaceMainRouterHref,
} from '@/layouts/tabs/tab-location-sync'
import {
  buildTabHref,
  getNextActiveTabAfterClose,
  type LayoutTab,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

function getTabTitle(tab: LayoutTab): string {
  return getPageDefinition(tab.pathname)?.title ?? tab.pathname
}

/** 关闭一组 Tab：统一脏检查后逐个销毁子 Router 与编辑器会话 */
function closeManyTabs(
  t: TFunction,
  tabIds: string[],
  applyRemoval: () => void,
): void {
  confirmBatchTabClose(t, tabIds, () => {
    tabIds.forEach((tabId) => {
      detachTabRouter(tabId)
    })
    applyRemoval()
  })
}

/**
 * 全局多标签页导航条：
 * - antd editable-card Tabs 提供溢出滚动与关闭交互；
 * - 标签右键菜单提供 刷新/关闭/关闭其他/关闭右侧/全部关闭；
 * - 工作台标签钉选（不可关闭）。
 * 内容区由 AppTabContainer 渲染，本组件仅承载导航。
 */
export function LayoutTabBar() {
  const { t } = useTranslation()
  const tabs = useLayoutTabsStore((state) => state.tabs)
  const activeTabId = useLayoutTabsStore((state) => state.activeTabId)

  const handleRefresh = (tabId: string) => {
    useLayoutTabsStore.getState().bumpReloadKey(tabId)
  }

  const handleClose = (tabId: string) => {
    requestEditorSessionClose(t, tabId, () => {
      const store = useLayoutTabsStore.getState()
      const nextActiveTab = getNextActiveTabAfterClose(
        store.tabs,
        tabId,
        store.activeTabId,
      )
      if (store.activeTabId === tabId && nextActiveTab) {
        replaceMainRouterHref(
          buildTabHref(nextActiveTab.pathname, nextActiveTab.search),
        )
      }
      detachTabRouter(tabId)
      store.removeTab(tabId)
    })
  }

  const buildContextMenu = (tab: LayoutTab): MenuProps => ({
    items: [
      {
        key: 'refresh',
        icon: <ReloadOutlined />,
        label: t('layouts.tabs.refresh'),
      },
      ...(tab.pinned ? [] : [{ key: 'close', label: t('layouts.tabs.close') }]),
      { key: 'closeOthers', label: t('layouts.tabs.closeOthers') },
      { key: 'closeRight', label: t('layouts.tabs.closeRight') },
      { key: 'closeAll', label: t('layouts.tabs.closeAll') },
    ],
    onClick: ({ key }) => {
      const store = useLayoutTabsStore.getState()
      switch (key) {
        case 'refresh': {
          handleRefresh(tab.id)
          break
        }
        case 'close': {
          handleClose(tab.id)
          break
        }
        case 'closeOthers': {
          store.activateTab(tab.id)
          const removeIds = tabs
            .filter((item) => !item.pinned && item.id !== tab.id)
            .map((item) => item.id)
          closeManyTabs(t, removeIds, () => store.removeOtherTabs(tab.id))
          break
        }
        case 'closeRight': {
          const tabIndex = tabs.findIndex((item) => item.id === tab.id)
          if (tabIndex < 0) break
          store.activateTab(tab.id)
          const removeIds = tabs
            .filter((item, index) => index > tabIndex && !item.pinned)
            .map((item) => item.id)
          closeManyTabs(t, removeIds, () => store.removeRightTabs(tab.id))
          break
        }
        case 'closeAll': {
          const removeIds = tabs
            .filter((item) => !item.pinned)
            .map((item) => item.id)
          const dashboardId = tabs.find((item) => item.pinned)?.id
          if (dashboardId) {
            store.activateTab(dashboardId)
          }
          closeManyTabs(t, removeIds, () => store.removeAllTabs())
          break
        }
        default:
          break
      }
    },
  })

  const items: TabsProps['items'] = tabs.map((tab) => ({
    key: tab.id,
    label: (
      <Dropdown trigger={['contextMenu']} menu={buildContextMenu(tab)}>
        <span className="leo-tabbar-label">{getTabTitle(tab)}</span>
      </Dropdown>
    ),
    closable: !tab.pinned,
  }))

  return (
    <Tabs
      className="leo-tabbar"
      type="editable-card"
      hideAdd
      size="small"
      /* 内容区由 AppTabContainer 渲染，本组件仅保留导航头部：
       * 经 v6 语义 styles 内联关闭 nav 默认 margin；
       * 外层 body-holder 无对应语义 key，经 layout-shell.css 提升特异性隐藏 */
      styles={{
        header: { margin: 0 },
      }}
      activeKey={activeTabId ?? undefined}
      items={items}
      onChange={(key) => useLayoutTabsStore.getState().activateTab(key)}
      onEdit={(targetKey, action) => {
        if (action === 'remove') {
          handleClose(String(targetKey))
        }
      }}
    />
  )
}
