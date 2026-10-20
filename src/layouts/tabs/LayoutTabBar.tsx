import type { TabsProps } from 'antd'
import { Tabs, Tag, Tooltip } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import type { TFunction } from 'i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContextMenu } from '@/components/ContextMenu'
import { getPageDefinition } from '@/config/page-registry'
import {
  confirmBatchTabClose,
  requestEditorSessionClose,
} from '@/layouts/editor-session/request-close'
import { tabLabelDomId } from '@/layouts/tabs/tab-aria-ids'
import {
  applyTabContextMenuAction,
  buildTabContextMenuItems,
  resolveTabCloseTargets,
  type TabCloseKind,
} from '@/layouts/tabs/tab-context-menu'
import {
  detachTabRouter,
  replaceMainRouterHref,
} from '@/layouts/tabs/tab-location-sync'
import { getTabTitle } from '@/layouts/tabs/tab-title'
import { useTabAriaWiring } from '@/layouts/tabs/useTabAriaWiring'
import { prefetchPage } from '@/router/page-prefetch'
import {
  buildTabHref,
  getNextActiveTabAfterClose,
  isTabPinned,
  type LayoutTab,
  MAX_LAYOUT_TABS,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'
import { message } from '@/utils/antd-app'

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

  const hostRef = useRef<HTMLDivElement>(null)

  /**
   * 菜单关闭（Escape / 点击别处）时的焦点兜底目标：**当前激活标签**的 tab 元素。
   *
   * <p>必须惰性解析而不能在渲染期固化节点引用：激活标签随点击变化，缓存的旧节点会变成
   * 已脱离文档的僵尸元素。ContextMenu 只在打开前焦点元素已不存在、或焦点本就不在可停靠
   * 元素上（body）时才回退到这里。</p>
   */
  const resolveActiveTabReturnFocus = useCallback(
    () =>
      hostRef.current?.querySelector<HTMLElement>(
        '.ant-tabs-tab-active [role="tab"]',
      ) ?? null,
    [],
  )

  /**
   * 右键**不得**把焦点移到被点的标签上。
   *
   * <p>浏览器默认行为是 mousedown 即聚焦被点元素，右键也不例外。被点标签一旦拿到焦点，
   * 菜单关闭时"归还给打开前的焦点元素"就会把焦点还给这个标签——既让键盘用户停在非激活
   * 标签上，也把"右键只是看看菜单"变成了对被点标签的隐式选中。阻止 mousedown 默认行为
   * 可让焦点原地不动，菜单关闭后自然回到右键前的焦点元素（ContextMenu 的 openerRef）。</p>
   *
   * <p>之所以不依赖"聚焦即激活"来兜底：antd Tabs 的 `activeKey` 由 store 受控，
   * rc-tabs 的 onFocus 只改内部 focusKey，实测程序化 focus 非激活标签不会激活它。
   * 真正会切走标签的是菜单项点击事件沿 React 树冒泡到标签 onClick（见 ContextMenu）。</p>
   *
   * <p>仅拦右键：左键点击标签仍须照常获得焦点，键盘用户随后可用方向键在标签间移动。</p>
   */
  const handleHostMouseDownCapture = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.button === 2) {
      event.preventDefault()
    }
  }

  // 把 antd 渲染出的标签与 AppTabContainer 渲染的真实面板接成 APG 语义
  useTabAriaWiring({ hostRef, tabs, t })

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

  /**
   * 标签本身不是我们的子节点(由 Tabs 渲染), 键盘事件落在标签按钮上,
   * 不会冒泡到菜单触发器, 因此在容器上做一次委托: Shift+F10 / 上下文菜单键
   * 打开当前聚焦标签的菜单, 保证键盘用户可达「关闭其他 / 关闭右侧 / 全部关闭」。
   *
   * <p>Delete / Backspace 关闭标签**刻意不在此实现**：rc-tabs 的 TabNavList 已内置
   * `handleRemoveTab`，它用 getRemovable 尊重 closable（钉选标签天然免疫），并经
   * onOffset 把焦点移到相邻标签，正是 APG 要求的行为。此前这里重复实现过一次，
   * 结果是两个处理器先后对同一事件动作：本处理器先移除标签，rc-tabs 随后在已经变化的
   * 标签序列上再执行一次 onOffset，焦点最终丢失。键盘关闭与焦点归还交给框架统一负责。</p>
   */
  const handleHostKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isContextKey =
      event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
    if (!isContextKey) return
    const tabId = (event.target as HTMLElement)
      .closest('.ant-tabs-tab')
      ?.getAttribute('data-node-key')
    if (!tabId) return
    event.preventDefault()
    setKeyboardMenuTabId(tabId)
  }

  /**
   * 批量关闭的落点：脏检查确认后按范围移除标签。
   *
   * <p>激活必须放在确认之后：confirmBatchTabClose 是异步的，先切换会让用户点「取消」时
   * 仍被切走，并顺带推出一条本不该产生的浏览器历史。</p>
   */
  const handleCloseMany = (
    tabId: string,
    ids: string[],
    kind: TabCloseKind,
  ): void => {
    const store = useLayoutTabsStore.getState()
    closeManyTabs(t, ids, () => {
      if (kind === 'all') {
        // 全部关闭后落到工作台（它是唯一的结构钉选标签）
        const dashboardId = tabs.find((item) => item.pinned)?.id
        if (dashboardId) {
          store.activateTab(dashboardId)
        }
        store.removeAllTabs()
        return
      }
      store.activateTab(tabId)
      if (kind === 'others') {
        store.removeOtherTabs(tabId)
      } else if (kind === 'left') {
        store.removeLeftTabs(tabId)
      } else {
        store.removeRightTabs(tabId)
      }
    })
  }

  /** 菜单项装配与 key→动作的映射都在 tab-context-menu 里（纯函数，便于单测与边界复用）。 */
  const buildContextMenu = (tab: LayoutTab): MenuProps => {
    const targets = resolveTabCloseTargets(tabs, tab.id)
    return {
      items: buildTabContextMenuItems({ tab, t, targets }),
      onClick: ({ key }) =>
        applyTabContextMenuAction(String(key), tab, targets, {
          onRefresh: handleRefresh,
          onClose: handleClose,
          onSetPinned: (tabId, pinned) =>
            useLayoutTabsStore.getState().setTabPinned(tabId, pinned),
          onCloseMany: handleCloseMany,
        }),
    }
  }

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
          resolveReturnFocus={resolveActiveTabReturnFocus}
        >
          {/*
           * 该 span 的 id 是真实面板 aria-labelledby 的目标（见 AppTabContainer）。
           * 悬停时预取该标签页的视图 chunk：未挂载过的标签首次点开要现下载 chunk
           * （dev 实测 200~300ms），期间只有骨架；预热后点开即见内容。
           * 键盘切换标签（方向键+Enter）不产生悬停，仍会看到一次骨架，是有意取舍。
           */}
          <span
            id={tabLabelDomId(tab.id)}
            className="leo-tabbar-label"
            onMouseEnter={() => {
              const definition = getPageDefinition(tab.pathname)
              if (definition) prefetchPage(definition)
            }}
          >
            {title}
          </span>
        </ContextMenu>
      ),
      closable: !isTabPinned(tab),
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
    // 捕获阶段监听: 上下文菜单键与 Delete 键可能被 Tabs 自己的键盘处理消费掉
    <div
      ref={hostRef}
      className="leo-tabbar-keyboard-host"
      onKeyDownCapture={handleHostKeyDown}
      onMouseDownCapture={handleHostMouseDownCapture}
    >
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
      {/* 超限指示器必须是 Tabs 的兄弟节点，不能放进 tabBarExtraContent：
          rc-tabs 把 extraContent 渲染在 role="tablist" 内部（上游 open 缺陷 #1013，
          重述了 antd #49502/#53584），会让 tablist 拥有非 tab 子元素，触发
          aria-required-children 违规。放在这里可保持视觉相邻但无障碍归属隔离。 */}
      {overLimit ? (
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
      ) : null}
    </div>
  )
}
