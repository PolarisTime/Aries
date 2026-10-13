import { ReloadOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { Tabs, Tag, Tooltip } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import type { TFunction } from 'i18next'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContextMenu } from '@/components/ContextMenu'
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
  MAX_LAYOUT_TABS,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'
import { message } from '@/utils/antd-app'

function getTabTitle(tab: LayoutTab, t: TFunction): string {
  const definition = getPageDefinition(tab.pathname)
  if (!definition) {
    return tab.pathname
  }
  // 标题在渲染期解析: 注册表只存 i18n key, 避免模块顶层 t() 早于 i18n 初始化求值。
  return t(definition.titleKey)
}

/** 刷新不依赖组件闭包，直接读取最新 store 状态 */
function handleRefresh(tabId: string) {
  useLayoutTabsStore.getState().bumpReloadKey(tabId)
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
 *   菜单补齐 APG 键盘契约(可访问名 / 打开后焦点进首项 / Escape 归还焦点),
 *   并支持 Shift+F10 或上下文菜单键对当前聚焦标签唤起同一菜单；
 * - 工作台标签钉选（不可关闭）。
 * 内容区由 AppTabContainer 渲染，本组件仅承载导航。
 */
export function LayoutTabBar() {
  const { t } = useTranslation()
  const tabs = useLayoutTabsStore((state) => state.tabs)
  const activeTabId = useLayoutTabsStore((state) => state.activeTabId)
  /** 键盘唤起的右键菜单所属标签(鼠标右键由 antd 自行处理)。 */
  const [keyboardMenuTabId, setKeyboardMenuTabId] = useState<string | null>(
    null,
  )

  /**
   * 标签本身不是我们的子节点(由 Tabs 渲染), 上下文菜单键落在标签按钮上,
   * 不会冒泡到菜单触发器, 因此在容器上做一次委托: Shift+F10 / 上下文菜单键
   * 打开当前聚焦标签的菜单, 保证键盘用户可达"关闭其他/关闭右侧/全部关闭"。
   */
  const handleContextKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isContextKey =
      event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
    if (!isContextKey) return
    const tabKey = (event.target as HTMLElement)
      .closest('.ant-tabs-tab')
      ?.getAttribute('data-node-key')
    if (!tabKey) return
    event.preventDefault()
    setKeyboardMenuTabId(tabKey)
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
          const removeIds = tabs.flatMap((item) =>
            !item.pinned && item.id !== tab.id ? [item.id] : [],
          )
          closeManyTabs(t, removeIds, () => store.removeOtherTabs(tab.id))
          break
        }
        case 'closeRight': {
          const tabIndex = tabs.findIndex((item) => item.id === tab.id)
          if (tabIndex < 0) break
          store.activateTab(tab.id)
          const removeIds = tabs.flatMap((item, itemIndex) =>
            itemIndex > tabIndex && !item.pinned ? [item.id] : [],
          )
          closeManyTabs(t, removeIds, () => store.removeRightTabs(tab.id))
          break
        }
        case 'closeAll': {
          const removeIds = tabs.flatMap((item) =>
            !item.pinned ? [item.id] : [],
          )
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

  const items: TabsProps['items'] = tabs.map((tab) => {
    const contextMenu = buildContextMenu(tab)
    const title = getTabTitle(tab, t)
    return {
      key: tab.id,
      label: (
        <ContextMenu
          ariaLabel={t('layouts.tabs.contextMenuLabel', { name: title })}
          items={contextMenu.items ?? []}
          onClick={contextMenu.onClick}
          open={keyboardMenuTabId === tab.id}
          onOpenChange={(next) => setKeyboardMenuTabId(next ? tab.id : null)}
        >
          <span className="leo-tabbar-label">{title}</span>
        </ContextMenu>
      ),
      closable: !tab.pinned,
    }
  })

  /**
   * 候选标签全被保护（持有未保存编辑会话）时淘汰会停止，标签数因此可能超过上限。
   * 这是刻意的降级，但必须让用户看得见并知道要手动清理，否则会被当成「标签自己没了」。
   */
  const overLimit = tabs.length > MAX_LAYOUT_TABS
  const overLimitHint = t('layouts.tabs.overLimitHint', {
    current: tabs.length,
    max: MAX_LAYOUT_TABS,
  })

  /*
   * 淘汰因保护而停止时 evictedIds 为空，调用点不会弹任何提示——超限由此成为用户唯一
   * 的异常信号。因此这里在「首次进入超限」时主动说明一次：角标本身只承载计数，
   * 完整解释不能只依赖鼠标悬停（键盘用户拿不到 Tooltip）。
   */
  const wasOverLimitRef = useRef(false)
  useEffect(() => {
    if (overLimit && !wasOverLimitRef.current) {
      message.warning(overLimitHint)
    }
    wasOverLimitRef.current = overLimit
  }, [overLimit, overLimitHint])

  return (
    // 捕获阶段监听: 上下文菜单键可能被 Tabs 自己的键盘处理消费掉
    <div
      className="leo-tabbar-keyboard-host"
      onKeyDownCapture={handleContextKeyDown}
    >
      <Tabs
        className="leo-tabbar"
        type="editable-card"
        hideAdd
        size="small"
        tabBarExtraContent={
          overLimit ? (
            <Tooltip title={overLimitHint}>
              {/* 非交互元素不进入 Tab 序列（避免死停靠点）；完整说明由首次超限的
                  提示与 aria-label 承载，Tooltip 只服务鼠标用户 */}
              <span
                className="leo-tabbar-overlimit"
                role="status"
                aria-label={overLimitHint}
              >
                <Tag color="warning" aria-hidden>
                  {`${tabs.length}/${MAX_LAYOUT_TABS}`}
                </Tag>
              </span>
            </Tooltip>
          ) : undefined
        }
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
    </div>
  )
}
