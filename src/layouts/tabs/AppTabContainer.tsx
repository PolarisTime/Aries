import { RouterProvider } from '@tanstack/react-router'
import { Layout } from 'antd'
import { useMemo } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { EditorSessionScopeProvider } from '@/layouts/editor-session/EditorSessionGuard'
import { LayoutTabBar } from '@/layouts/tabs/LayoutTabBar'
import { attachTabRouter } from '@/layouts/tabs/tab-location-sync'
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

  return (
    <Content className="leo-content">
      <LayoutTabBar />
      <div className="leo-content-inner leo-tab-viewport">
        {tabs
          .filter((tab) => tab.mountedOnce || tab.id === activeTabId)
          .map((tab) => (
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
            </div>
          ))}
      </div>
    </Content>
  )
}
