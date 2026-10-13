import { RouterProvider } from '@tanstack/react-router'
import { Layout } from 'antd'
import { useEffect, useMemo, useRef } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppBreadcrumb } from '@/layouts/AppBreadcrumb'
import { EditorSessionScopeProvider } from '@/layouts/editor-session/EditorSessionGuard'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { LayoutTabBar } from '@/layouts/tabs/LayoutTabBar'
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
        {tabs.flatMap((tab) =>
          tab.mountedOnce || tab.id === activeTabId
            ? [
                <div
                  key={tab.id}
                  hidden={tab.id !== activeTabId}
                  className="leo-tab-panel"
                >
                  <AppErrorBoundary resetKey={`${tab.id}:${tab.reloadKey}`}>
                    <EditorSessionScopeProvider tabId={tab.id}>
                      <TabPanelRouter
                        key={`${tab.id}:${tab.reloadKey}`}
                        tab={tab}
                      />
                    </EditorSessionScopeProvider>
                  </AppErrorBoundary>
                </div>,
              ]
            : [],
        )}
      </div>
    </Content>
  )
}
