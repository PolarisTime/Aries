import { RouterProvider } from '@tanstack/react-router'
import { Layout } from 'antd'
import { useEffect, useMemo, useRef } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppBreadcrumb } from '@/layouts/AppBreadcrumb'
import { EditorSessionScopeProvider } from '@/layouts/editor-session/EditorSessionGuard'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { LayoutTabBar } from '@/layouts/tabs/LayoutTabBar'
import { tabLabelDomId, tabPanelDomId } from '@/layouts/tabs/tab-aria-ids'
import {
  attachTabRouter,
  detachTabRouter,
} from '@/layouts/tabs/tab-location-sync'
import { useTabRouteReconciliation } from '@/layouts/tabs/useTabRouteReconciliation'
import { type LayoutTab, useLayoutTabsStore } from '@/stores/layoutTabsStore'

const { Content } = Layout

/** 单个面板内的子 Router 挂载点；reloadKey 变化时经 key 重建（「刷新当前页」） */
function TabPanelRouter({ tab }: { tab: LayoutTab }) {
  // attach 幂等：同 tabId 返回既有实例；reloadKey 变化时内部先 detach 再重建
  const router = useMemo(() => attachTabRouter(tab), [tab])
  return <RouterProvider router={router} />
}

/**
 * 多标签页内容容器：替代原 <Outlet key={openPageKey}> 强制重挂载方案。
 * 已挂载过的 Tab 常驻 DOM（hidden 切换显隐），实现表单/筛选/滚动位置保留；
 * 当前激活的 Tab 无论是否挂载过都立即渲染（激活即挂载），
 * 其余恢复自持久化的 Tab 保持惰性，首次激活才创建子 Router。
 */
export function AppTabContainer() {
  const tabs = useLayoutTabsStore((state) => state.tabs)
  const activeTabId = useLayoutTabsStore((state) => state.activeTabId)

  useTabRouteReconciliation()

  /**
   * 不变式：**激活的标签一定"已挂载过"**。
   *
   * <p>本组件在激活时无条件渲染该标签的面板（见下方 `mounted` 计算），因此提交后必须把它记为
   * {@link LayoutTab.mountedOnce}，否则会漏掉一条路径：`hydrateForUser` 为当前深链新建/选中的
   * 标签。原因是 React **先跑子组件 effect**（AppTabContainer 是 AppLayout 的子节点），
   * `useTabRouteReconciliation` 的定位 effect 在 hydrate 之前就已跑完，而它的依赖
   * `location.href/pathname/searchStr` 之后不再变化，于是 hydrate 出来的那个标签永远不会被
   * `markTabMounted`。后果是该标签一旦转成非激活，面板就被**卸载重建**，它的筛选草稿、
   * 已打开的编辑浮层与未保存编辑会话一起丢失（用户口述的"点新标签后整页重载"）。</p>
   *
   * <p>放在这里而不是改协调层的依赖数组：协调 effect 的依赖是围绕"主路由↔子 Router 乒乓"
   * 调过的，加依赖会让切换语言/重复渲染重跑整套协调逻辑；而"激活即已挂载"本就是本组件自己
   * 的事实，记在自己这里最贴近真相。`markTabMounted` 对已标记者是 no-op，不会形成渲染环。</p>
   */
  useEffect(() => {
    if (!activeTabId) return
    useLayoutTabsStore.getState().markTabMounted(activeTabId)
  }, [activeTabId])

  /**
   * 兜底资源回收：任何让 Tab 消失的路径（关闭、超上限淘汰、hydration 截断、切换用户）
   * 都要释放它的子 Router 与编辑器会话槽。
   *
   * <p>关闭路径已在 LayoutTabBar 显式 detach；这里再收敛一次是为了覆盖「超上限淘汰」——
   * 淘汰发生在 store 内部，调用方拿不到时机。放在 effect 而非调用点，可保证 React 完成
   * 卸载后才 dispose，不会对已销毁的 Router 继续渲染。</p>
   *
   * <p>`detachTabRouter` 与 `endSession` 都是幂等的（对不存在的 id 是 no-op），
   * 因此与关闭路径重复执行无害。</p>
   */
  const previousTabIdsRef = useRef<string[]>([])
  useEffect(() => {
    const currentIds = new Set(tabs.map((tab) => tab.id))
    for (const tabId of previousTabIdsRef.current) {
      if (!currentIds.has(tabId)) {
        detachTabRouter(tabId)
        editorSessionStore.endSession(tabId)
      }
    }
    previousTabIdsRef.current = tabs.map((tab) => tab.id)
  }, [tabs])

  return (
    <Content className="leo-content">
      <LayoutTabBar />
      <AppBreadcrumb />
      <div className="leo-content-inner leo-tab-viewport">
        {tabs.map((tab) => {
          const mounted = tab.mountedOnce || tab.id === activeTabId
          return (
            <div
              key={tab.id}
              /* 真实内容面板才是 tab 的 panel：rc-tabs 自己渲染的面板是空的,
                 且被 CSS 整体隐藏(见 layout-shell.css 的 .ant-tabs-body-holder)。
                 刻意不加 tabIndex —— APG 只在面板内无可聚焦元素时才要求 tabindex="0",
                 而本项目面板内有表单与表格, Tab 键会自然落到其中。 */
              id={tabPanelDomId(tab.id)}
              role="tabpanel"
              aria-labelledby={tabLabelDomId(tab.id)}
              hidden={tab.id !== activeTabId}
              className="leo-tab-panel"
            >
              {/* 面板外壳始终存在, 内容仍按需挂载(恢复自持久化的标签保持惰性)。
                 若外壳也惰性渲染, 非激活标签的 aria-controls 会指向不存在的元素,
                 形成悬空引用 —— 实测 Playwright 可复现。 */}
              {mounted ? (
                <AppErrorBoundary resetKey={`${tab.id}:${tab.reloadKey}`}>
                  <EditorSessionScopeProvider tabId={tab.id}>
                    <TabPanelRouter
                      key={`${tab.id}:${tab.reloadKey}`}
                      tab={tab}
                    />
                  </EditorSessionScopeProvider>
                </AppErrorBoundary>
              ) : null}
            </div>
          )
        })}
      </div>
    </Content>
  )
}
