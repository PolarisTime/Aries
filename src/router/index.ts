import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { lazy } from 'react'
import { listBusinessModule } from '@/api/business-listing'
import { getInitialSetupStatus } from '@/api/setup'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import {
  appPageDefinitions,
  getPageRoutePath,
  type RouteViewKey,
} from '@/config/page-registry'
import { QUERY_KEYS } from '@/constants/query-keys'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/authStore'
import {
  checkAccessResources,
  usePermissionStore,
} from '@/stores/permissionStore'
import { useSetupStore } from '@/stores/setupStore'
import { asString } from '@/utils/type-narrowing'
import { LazyLoginView } from '@/views/auth/LazyLoginView'
import { LazyDashboardView } from '@/views/dashboard/LazyDashboardView'

const SETUP_ROUTE_PATH = '/setup'
const SERVER_ERROR_ROUTE = '/server-error'

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
        const response = await getInitialSetupStatus()
        setupRequired = response.data.setupRequired
        useSetupStore.getState().setStatus(response.data)
      } catch (error) {
        // 重定向错误直接抛出
        if (error && typeof error === 'object' && 'to' in error) {
          throw error
        }
        // 网络错误（后端不可达）→ 显示服务器错误页面
        if (isNetworkError(error)) {
          if (!isErrorPage) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw redirect({ to: SERVER_ERROR_ROUTE })
          }
          return
        }
        // 其他错误（如 500）→ 也显示服务器错误页面
        if (!isErrorPage) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw redirect({ to: SERVER_ERROR_ROUTE })
        }
        return
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
  component: LazyLoginView,
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

const setup2faRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup-2fa',
  component: lazy(() =>
    import('@/views/auth/SetupTwoFactorView').then((m) => ({
      default: m.SetupTwoFactorView,
    })),
  ),
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated)
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/login' })
  },
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

const viewLoaders: Record<
  Exclude<RouteViewKey, 'dashboard'>,
  () => Promise<{ default: React.ComponentType }>
> = {
  'business-grid': () =>
    import('@/views/modules/BusinessGridView').then((m) => ({
      default: m.BusinessGridView,
    })),
  'number-rules': () =>
    import('@/views/system/NumberRulesView').then((m) => ({
      default: m.NumberRulesView,
    })),
  'general-setting': () =>
    import('@/views/system/GeneralSettingsView').then((m) => ({
      default: m.GeneralSettingsView,
    })),
  'company-setting': () =>
    import('@/views/system/CompanySettingsView').then((m) => ({
      default: m.CompanySettingsView,
    })),
  'print-template': () =>
    import('@/views/system/PrintTemplateView').then((m) => ({
      default: m.PrintTemplateView,
    })),
  session: () =>
    import('@/views/system/SessionManagementView').then((m) => ({
      default: m.SessionManagementView,
    })),
  'api-key': () =>
    import('@/views/system/ApiKeyManagementView').then((m) => ({
      default: m.ApiKeyManagementView,
    })),
  'access-control': () =>
    import('@/views/system/AccessControlView').then((m) => ({
      default: m.AccessControlView,
    })),
  'security-key': () =>
    import('@/views/system/SecurityKeyManagementView').then((m) => ({
      default: m.SecurityKeyManagementView,
    })),
  'database-backup': () =>
    import('@/views/system/DatabaseBackupView').then((m) => ({
      default: m.DatabaseBackupView,
    })),
}

const moduleRoutes = appPageDefinitions.map((def) => {
  const path = `/${getPageRoutePath(def)}`
  return createRoute({
    getParentRoute: () => authenticatedLayoutRoute,
    path,
    component:
      def.view === 'dashboard'
        ? LazyDashboardView
        : lazy(viewLoaders[def.view]),
    loader:
      def.view === 'business-grid' && def.moduleKey
        ? async () => {
            const moduleKey = asString(def.moduleKey)
            const resourceKey = def.resourceKey || moduleKey
            const canView = usePermissionStore
              .getState()
              .can(resourceKey, 'read')

            const config = await loadBusinessPageConfig(moduleKey)

            if (canView) {
              try {
                await queryClient.ensureQueryData({
                  queryKey: QUERY_KEYS.businessGridPage(moduleKey),
                  queryFn: ({ signal }) =>
                    listBusinessModule(
                      moduleKey,
                      {},
                      { currentPage: 1, pageSize: 20 },
                      { signal },
                    ),
                  staleTime: 60_000,
                })
              } catch {
                // 预取失败不影响页面渲染，组件内 useQuery 会自行重试
              }
            }

            return config
          }
        : undefined,
    beforeLoad: () => {
      if (def.view === 'dashboard') return
      const store = usePermissionStore.getState()
      if (
        Array.isArray(def.accessResources) &&
        def.accessResources.length > 0
      ) {
        if (!checkAccessResources(def.accessResources, store.can)) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw redirect({ to: '/' })
        }
        return
      }
      if (!store.can(def.resourceKey || def.key, 'read')) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({ to: '/' })
      }
    },
  })
})

const apiKeyDetailRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/api-key/$id',
  component: lazy(() =>
    import('@/views/system/ApiKeyDetailView').then((m) => ({
      default: m.ApiKeyDetailView,
    })),
  ),
  beforeLoad: () => {
    if (!usePermissionStore.getState().can('api-key', 'read')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/' })
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/dashboard' as never })
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
  setup2faRoute,
  serverErrorRoute,
  notFoundRoute,
  authenticatedLayoutRoute.addChildren([...moduleRoutes, apiKeyDetailRoute]),
])

export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  defaultPreload: 'intent',
  defaultPendingComponent: lazy(() =>
    import('@/views/modules/components/BusinessGridPageSkeleton').then((m) => ({
      default: m.BusinessGridPageSkeleton,
    })),
  ),
  defaultPendingMs: 100,
  defaultErrorComponent: lazy(() =>
    import('@/views/error/ErrorView').then((m) => ({
      default: m.ErrorView,
    })),
  ),
  defaultNotFoundComponent: lazy(() =>
    import('@/views/error/NotFoundView').then((m) => ({
      default: m.NotFoundView,
    })),
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
