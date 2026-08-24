import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type AnyRouter,
} from '@tanstack/react-router'
import { buildModuleRoutes } from '@/router/index'
import { buildSharedRouterOptions } from '@/router/router-options'

/**
 * 多标签页子 Router 的精简路由树：
 * 仅含「无壳布局路由 + 业务页面路由」，不含 AppLayout 壳、登录/初始化等
 * 全局路由——布局由主 Router 的 AppTabContainer 承载，避免面板内嵌套渲染整套布局。
 */
const tabRootRoute = createRootRoute({ component: Outlet })

const tabLayoutRoute = createRoute({
  getParentRoute: () => tabRootRoute,
  id: 'authenticated-tab-layout',
})

const tabRouteTree = tabRootRoute.addChildren([
  tabLayoutRoute.addChildren(buildModuleRoutes(tabLayoutRoute)),
])

/**
 * 多标签页子 Router：history 用内存栈实现 Tab 内导航隔离；
 * loader/预取与主 Router 走共享 queryClient 缓存。
 */
export function createTabRouter(initialHref: string): AnyRouter {
  return createRouter({
    routeTree: tabRouteTree,
    history: createMemoryHistory({ initialEntries: [initialHref] }),
    ...buildSharedRouterOptions(),
  })
}
