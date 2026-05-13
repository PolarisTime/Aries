/* eslint-disable @typescript-eslint/no-base-to-string, @typescript-eslint/no-unsafe-assignment */
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { lazy } from 'react'
import {
  appPageDefinitions,
  getPageRoutePath,
  type RouteViewKey,
} from '@/config/page-registry'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { useAuthStore } from '@/stores/authStore'
import { checkAccessResources, usePermissionStore } from '@/stores/permissionStore'
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
      throw new Error(String(redirect({ to: '/login' })))
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
      throw new Error(String(redirect({ to: '/login' })))
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
  'database': () =>
    import('@/views/system/DatabaseBackupView').then((m) => ({
      default: m.DatabaseBackupView,
    })),
  'session': () =>
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
    def.view === 'database' ||
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
    pendingMinMs: usesPageSkeleton ? 200 : undefined,
    loader:
      def.view === 'business-grid' && def.moduleKey
        ? async () => loadBusinessPageConfig(def.moduleKey as string)
        : undefined,
    beforeLoad: () => {
      if (def.view === 'dashboard') return
      const store = usePermissionStore.getState()
      if (
        Array.isArray(def.accessResources) &&
        def.accessResources.length > 0
      ) {
        if (!checkAccessResources(def.accessResources, store.can)) {
          throw new Error(String(redirect({ to: '/dashboard' as '/' })))
        }
        return
      }
      if (!store.can(def.resourceKey || def.key, 'read')) {
        throw new Error(String(redirect({ to: '/dashboard' as '/' })))
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
      throw new Error(String(redirect({ to: '/dashboard' as '/' })))
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw new Error(String(redirect({ to: '/dashboard' as '/' })))
  },
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  setupRoute,
  setup2faRoute,
  authenticatedLayoutRoute.addChildren([...moduleRoutes, apiKeyDetailRoute]),
])

export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
