import type { RouteRecordRaw } from 'vue-router'
import { appPageDefinitions, getPageRoutePath } from '@/config/page-registry'

const viewLoaders = {
  dashboard: () => import('@/views/dashboard/DashboardView.vue'),
  'business-grid': () => import('@/views/modules/BusinessGridView.vue'),
  'number-rules': () => import('@/views/system/NumberRulesView.vue'),
  'general-settings': () => import('@/views/system/GeneralSettingsView.vue'),
  'company-settings': () => import('@/views/system/CompanySettingsView.vue'),
  'print-templates': () => import('@/views/system/PrintTemplateView.vue'),
  'user-accounts': () => import('@/views/system/UserAccountManagementView.vue'),
  'role-action-editor': () => import('@/views/system/RoleActionEditor.vue'),
  'database-management': () => import('@/views/system/DatabaseBackupView.vue'),
  'session-management': () =>
    import('@/views/system/SessionManagementView.vue'),
  'api-key-management': () => import('@/views/system/ApiKeyManagementView.vue'),
  'security-keys': () => import('@/views/system/SecurityKeyManagementView.vue'),
} as const

// Validate view-loader mappings in development to catch missing imports early.
if (import.meta.env.DEV) {
  const validViewKeys = new Set(Object.keys(viewLoaders))
  for (const def of appPageDefinitions) {
    if (def.view && !validViewKeys.has(def.view)) {
      console.error(
        `[router] Page "${def.key}" references unknown view "${def.view}". ` +
        `Add it to viewLoaders in src/router/routes.ts.`,
      )
    }
  }
}

const childRoutes: RouteRecordRaw[] = appPageDefinitions.map((definition) => {
  const meta = {
    title: definition.title,
    menuKey: definition.menuKey,
    menuParent: definition.menuParent,
    accessMenuKeys: definition.accessMenuKeys,
    activeMenuKey: definition.activeMenuKey,
    hiddenInMenu: definition.hiddenInMenu,
    openPageKey: definition.openPageKey,
  }

  if (definition.hiddenInMenu && definition.openPageKey) {
    return {
      path: getPageRoutePath(definition),
      name: definition.key,
      redirect: (to) => ({
        path: definition.openPageKey!,
        query: to.query,
        hash: to.hash,
      }),
      meta,
    }
  }

  return {
    path: getPageRoutePath(definition),
    name: definition.key,
    component: viewLoaders[definition.view],
    props: definition.moduleKey ? { moduleKey: definition.moduleKey } : undefined,
    meta,
  }
})

childRoutes.push({
  path: 'ops-support',
  redirect: '/database-management',
})

childRoutes.push({
  path: 'api-key-management/:id',
  name: 'api-key-detail',
  component: () => import('@/views/system/ApiKeyDetailView.vue'),
  meta: {
    title: 'API Key 详情',
    menuKey: 'api-key-management',
  },
})

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      public: true,
      title: '登录',
    },
  },
  {
    path: '/setup',
    name: 'initial-setup',
    component: () => import('@/views/auth/InitialSetupView.vue'),
    meta: {
      public: true,
      title: '首次初始化',
    },
  },
  {
    path: '/setup-2fa',
    name: 'setup-2fa',
    component: () => import('@/views/auth/SetupTwoFactorView.vue'),
    meta: {
      title: '首次绑定 2FA',
    },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    redirect: '/dashboard',
    children: childRoutes,
  },
]
