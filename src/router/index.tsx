import { lazy } from 'react'
import { createRouter, createRootRoute, createRoute, Outlet, redirect, createBrowserHistory } from '@tanstack/react-router'
import { appPageDefinitions, getPageRoutePath, type RouteViewKey } from '@/config/page-registry'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'

const rootRoute = createRootRoute({ component: Outlet })

// Direct-import LoginView (no lazy) — avoids React 19 Suspense issues
import { LoginView } from '@/views/auth/LoginView'

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginView,
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: lazy(() => import('@/views/auth/InitialSetupView').then((m) => ({ default: m.InitialSetupView }))),
})

const setup2faRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup-2fa',
  component: lazy(() => import('@/views/auth/SetupTwoFactorView').then((m) => ({ default: m.SetupTwoFactorView }))),
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' as '/' })
  },
})

const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated-layout',
  component: lazy(() => import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout }))),
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' as '/' })
  },
})

const viewLoaders: Record<RouteViewKey, () => Promise<{ default: React.ComponentType }>> = {
  dashboard: () => import('@/views/dashboard/DashboardView').then((m) => ({ default: m.DashboardView })),
  'business-grid': () => import('@/views/modules/BusinessGridView').then((m) => ({ default: m.BusinessGridView })),
  'number-rules': () => import('@/views/system/NumberRulesView').then((m) => ({ default: m.NumberRulesView })),
  'general-settings': () => import('@/views/system/GeneralSettingsView').then((m) => ({ default: m.GeneralSettingsView })),
  'company-settings': () => import('@/views/system/CompanySettingsView').then((m) => ({ default: m.CompanySettingsView })),
  'print-templates': () => import('@/views/system/PrintTemplateView').then((m) => ({ default: m.PrintTemplateView })),
  'user-accounts': () => import('@/views/system/UserAccountManagementView').then((m) => ({ default: m.UserAccountManagementView })),
  'role-action-editor': () => import('@/views/system/RoleActionEditor').then((m) => ({ default: m.RoleActionEditor })),
  'database-management': () => import('@/views/system/DatabaseBackupView').then((m) => ({ default: m.DatabaseBackupView })),
  'session-management': () => import('@/views/system/SessionManagementView').then((m) => ({ default: m.SessionManagementView })),
  'api-key-management': () => import('@/views/system/ApiKeyManagementView').then((m) => ({ default: m.ApiKeyManagementView })),
  'security-keys': () => import('@/views/system/SecurityKeyManagementView').then((m) => ({ default: m.SecurityKeyManagementView })),
}

const moduleRoutes = appPageDefinitions.map((def) => {
  const path = `/${getPageRoutePath(def)}`
  return createRoute({
    getParentRoute: () => authenticatedLayoutRoute,
    path,
    component: lazy(viewLoaders[def.view]),
    beforeLoad: () => {
      if (def.view === 'dashboard') return
      const accessMenuKeys =
        Array.isArray(def.accessMenuKeys) && def.accessMenuKeys.length > 0
          ? def.accessMenuKeys
          : [def.resourceKey || def.menuKey]

      if (!accessMenuKeys.some((menuKey) => usePermissionStore.getState().canAccessMenuKey(menuKey))) {
        throw redirect({ to: '/dashboard' as '/' })
      }
    },
  })
})

const apiKeyDetailRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/api-key-management/$id',
  component: lazy(() => import('@/views/system/ApiKeyDetailView').then((m) => ({ default: m.ApiKeyDetailView }))),
  beforeLoad: () => {
    if (!usePermissionStore.getState().canAccessMenuKey('/api-key-management')) {
      throw redirect({ to: '/dashboard' as '/' })
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/dashboard' as '/' }) },
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  setupRoute,
  setup2faRoute,
  authenticatedLayoutRoute.addChildren([
    ...moduleRoutes,
    apiKeyDetailRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
