import {
  type AnyRoute,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { lazy } from 'react'
import { listBusinessModule } from '@/api/business/business-listing'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import {
  appPageDefinitions,
  getPageRoutePath,
  type RouteViewKey,
} from '@/config/page-registry'
import { QUERY_KEYS } from '@/constants/query-keys'
import { buildDefaultModuleFilters } from '@/hooks/useModuleFilters'
import { queryClient } from '@/lib/query-client'
import { buildSharedRouterOptions } from '@/router/router-options'
import { viewLoaders } from '@/router/view-loaders'
import { useAuthStore } from '@/stores/authStore'
import { useSetupStore } from '@/stores/setupStore'
import type { SearchParams } from '@/types/api-raw'
import {
  getServerErrorReturnPath,
  SERVER_ERROR_ROUTE,
} from '@/utils/server-error-navigation'
import { asString } from '@/utils/type-narrowing'

const SETUP_ROUTE_PATH = '/setup'

function toServerErrorRedirect(
  location: Parameters<typeof getServerErrorReturnPath>[0],
) {
  const from = getServerErrorReturnPath(location)
  return redirect(
    from
      ? {
          to: SERVER_ERROR_ROUTE,
          search: { from },
        }
      : { to: SERVER_ERROR_ROUTE },
  )
}

/** 判断错误是否为网络连接失败（后端不可达） */
function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  // Axios 网络错误
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') return true
  // fetch 网络错误
  if (err.name === 'TypeError' && String(err.message).includes('fetch'))
    return true
  // 包含网络相关关键词
  const message = String(err.message || '')
  return (
    message.includes('Network Error') ||
    message.includes('fetch') ||
    message.includes('ECONNREFUSED') ||
    message.includes('timeout')
  )
}

const rootRoute = createRootRoute({
  component: Outlet,
  beforeLoad: async ({ location }) => {
    const pathname = location.pathname
    const isSetupPage = pathname === SETUP_ROUTE_PATH
    const isErrorPage = pathname === SERVER_ERROR_ROUTE

    // 错误页面不需要检查 setup 状态
    if (isErrorPage) return

    // 优先使用缓存的 setup 状态，避免每次导航都请求
    const cachedStatus = useSetupStore.getState().status
    let setupRequired = cachedStatus?.setupRequired ?? null

    // 如果没有缓存，则请求 API
    if (setupRequired === null) {
      try {
        const response = await queryClient.ensureQueryData({
          queryKey: QUERY_KEYS.runtimeConfig,
          queryFn: getRuntimeConfig,
          staleTime: 30_000,
        })
        setupRequired = response.setup.setupRequired
        useSetupStore.getState().setStatus(response.setup)
      } catch (error) {
        // 重定向错误直接抛出
        if (error && typeof error === 'object' && 'to' in error) {
          throw error
        }
        // 网络错误（后端不可达）→ 显示服务器错误页面
        if (isNetworkError(error)) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw toServerErrorRedirect(location)
        }
        // 其他错误（如 500）→ 也显示服务器错误页面
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw toServerErrorRedirect(location)
      }
    }

    // 严格判断：只有后端明确返回 setupRequired=true 时才跳转
    if (setupRequired === true && !isSetupPage) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: SETUP_ROUTE_PATH })
    }
    if (setupRequired === false && isSetupPage) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/login' })
    }
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: lazy(() =>
    import('@/views/auth/LazyLoginView').then((m) => ({
      default: m.LazyLoginView,
    })),
  ),
})

const serverErrorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/server-error',
  component: lazy(() =>
    import('@/views/error/ServerErrorView').then((m) => ({
      default: m.ServerErrorView,
    })),
  ),
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: lazy(() =>
    import('@/views/auth/InitialSetupView').then((m) => ({
      default: m.InitialSetupView,
    })),
  ),
})

const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated-layout',
  component: lazy(() =>
    import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })),
  ),
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/login' })
  },
})

async function prefetchModuleList(moduleKey: string, filters: SearchParams) {
  const runtimeConfig = await queryClient.ensureQueryData({
    queryKey: QUERY_KEYS.runtimeConfig,
    queryFn: getRuntimeConfig,
    staleTime: 30_000,
  })
  const pageSize = runtimeConfig.ui.defaultPageSize
  await queryClient.ensureQueryData({
    queryKey: QUERY_KEYS.businessGridList(moduleKey, filters, 1, pageSize),
    queryFn: ({ signal }) =>
      listBusinessModule(
        moduleKey,
        filters,
        { currentPage: 1, pageSize },
        { signal },
      ),
    staleTime: 60_000,
  })
}

/**
 * 是否列表型视图（需要预取业务列表）：配置驱动的 business-grid 与主数据专属页 master-*。
 * 两分支初始过滤不同，business-grid 用页面配置的默认过滤，master-* 用空过滤。
 */
function isListPrefetchView(view: RouteViewKey) {
  return view === 'business-grid' || view.startsWith('master-')
}

/**
 * 业务页面路由工厂：主 Router 与多标签页子 Router 共用。
 * 以传入的父路由为挂载点生成全部页面路由（含 loader 预取），避免两份定义漂移。
 */
export function buildModuleRoutes(parent: AnyRoute) {
  return appPageDefinitions.map((def) => {
    const path = `/${getPageRoutePath(def)}`
    return createRoute({
      getParentRoute: () => parent,
      path,
      component: lazy(viewLoaders[def.view]),
      loader:
        isListPrefetchView(def.view) && def.moduleKey
          ? async () => {
              const moduleKey = asString(def.moduleKey)
              try {
                const config =
                  def.view === 'business-grid'
                    ? await loadBusinessPageConfig(moduleKey)
                    : undefined
                // 预取键必须与组件真实初始查询键一致（含默认过滤），否则预取无效。
                await prefetchModuleList(
                  moduleKey,
                  buildDefaultModuleFilters(config),
                )
                return config
              } catch {
                // 预取或配置加载失败不影响页面渲染，组件内 useQuery 会自行重试
                return undefined
              }
            }
          : undefined,
    })
  })
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/dashboard' })
  },
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: lazy(() =>
    import('@/views/error/NotFoundView').then((m) => ({
      default: m.NotFoundView,
    })),
  ),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  setupRoute,
  serverErrorRoute,
  notFoundRoute,
  authenticatedLayoutRoute.addChildren(
    // TanStack Router 子路由需统一 AnyRoute 泛型，否则整棵路由树的类型会丢失
    buildModuleRoutes(authenticatedLayoutRoute) as AnyRoute[],
  ),
])

export { routeTree }

export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  ...buildSharedRouterOptions(),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
