import {
  type AnyRouter,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { routeTree } from '@/router/index'
import { buildSharedRouterOptions } from '@/router/router-options'

/**
 * 多标签页子 Router：复用主路由树（loader/beforeLoad/notFound 零改动继承，
 * 预取走共享 queryClient 缓存），history 用内存栈实现 Tab 内导航隔离。
 */
export function createTabRouter(initialHref: string): AnyRouter {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialHref] }),
    ...buildSharedRouterOptions(),
  })
}
