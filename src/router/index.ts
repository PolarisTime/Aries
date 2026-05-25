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
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import {
  appPageDefinitions,
  getPageRoutePath,
  type RouteViewKey,
} from '@/config/page-registry'
import { queryClient } from '@/lib/query-client'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useAuthStore } from '@/stores/authStore'
import {
  checkAccessResources,
  usePermissionStore,
} from '@/stores/permissionStore'
import { asString } from '@/utils/type-narrowing'
import { LazyLoginView } from '@/views/auth/LazyLoginView'
import { LazyDashboardView } from '@/views/dashboard/LazyDashboardView'
import { BusinessGridPageSkeleton } from '@/views/modules/components/BusinessGridPageSkeleton'

const rootRoute = createRootRoute({ component: Outlet })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LazyLoginView,
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
  'project-ar-detail': () =>
    import('@/pages/finance/ProjectArDetailPage').then((m) => ({
      default: m.ProjectArDetailPage,
    })),
  'database-backup': () =>
    import('@/views/system/DatabaseBackupView').then((m) => ({
      default: m.DatabaseBackupView,
    })),
}

const moduleRoutes = appPageDefinitions.map((def) => {
  const path = `/${getPageRoutePath(def)}`
  const usesPageSkeleton =
    def.view === 'business-grid' ||
    def.view === 'number-rules' ||
    def.view === 'general-setting' ||
    def.view === 'company-setting' ||
    def.view === 'print-template' ||
    def.view === 'access-control' ||
    def.view === 'session' ||
    def.view === 'api-key' ||
    def.view === 'security-key'

  return createRoute({
    getParentRoute: () => authenticatedLayoutRoute,
    path,
    component:
      def.view === 'dashboard'
        ? LazyDashboardView
        : lazy(viewLoaders[def.view]),
    pendingComponent: usesPageSkeleton ? BusinessGridPageSkeleton : undefined,
    pendingMinMs: usesPageSkeleton ? 50 : undefined,
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
                  staleTime: 5_000,
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
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Router 类型推断限制，dashboard 由 moduleRoutes 动态生成
    // eslint-disable-next-line @typescript-eslint/only-throw-error, @typescript-eslint/no-explicit-any
    throw redirect({ to: '/dashboard' as any })
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
  notFoundRoute,
  authenticatedLayoutRoute.addChildren([...moduleRoutes, apiKeyDetailRoute]),
])

export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  defaultPreload: 'intent',
  defaultErrorComponent: lazy(() =>
    import('@/views/error/ErrorView').then((m) => ({
      default: m.ErrorView,
    })),
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
