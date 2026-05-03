import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { routes } from './routes'
import { appTitle } from '@/utils/env'
import type { LoginUser } from '@/types/auth'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import { loadPermissionCatalog } from '@/constants/resource-permissions'
import {
  clearRouteLoadRecoveryMarker,
  isRecoverableRouteLoadError,
  recoverRouteLoadError,
} from './route-load-recovery'

function resolveRoutePath(route: RouteRecordRaw) {
  if (!route.path) {
    return ''
  }
  return route.path.startsWith('/') ? route.path : `/${route.path}`
}

function canAccessRoute(route: RouteRecordRaw, permissionStore: ReturnType<typeof usePermissionStore>) {
  if (route.meta?.hiddenInMenu) {
    return false
  }
  const accessMenuKeys = Array.isArray(route.meta?.accessMenuKeys)
    ? route.meta.accessMenuKeys.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  if (accessMenuKeys.length > 0) {
    return accessMenuKeys.some((menuKey) => permissionStore.canAccessMenuKey(menuKey))
  }
  const menuKey = typeof route.meta?.menuKey === 'string' ? route.meta.menuKey : ''
  return permissionStore.canAccessMenuKey(menuKey)
}

function canAccessTargetRoute(
  menuKey: unknown,
  accessMenuKeys: unknown,
  permissionStore: ReturnType<typeof usePermissionStore>,
) {
  if (Array.isArray(accessMenuKeys)) {
    const normalizedKeys = accessMenuKeys
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    if (normalizedKeys.length > 0) {
      return normalizedKeys.some((key) => permissionStore.canAccessMenuKey(key))
    }
  }
  return permissionStore.canAccessMenuKey(typeof menuKey === 'string' ? menuKey : '')
}

export function requiresForcedTotpSetup(user: LoginUser | null | undefined) {
  return Boolean(user?.forceTotpSetup && user?.totpEnabled !== true)
}

function sanitizeRedirectPath(candidate: unknown) {
  if (typeof candidate !== 'string' || !candidate.startsWith('/')) {
    return ''
  }
  if (/^https?:\/\//i.test(candidate)) {
    return ''
  }
  return candidate
}

function buildSetupTotpRedirect(targetPath: string) {
  const redirect = sanitizeRedirectPath(targetPath)
  return redirect
    ? {
        path: '/setup-2fa',
        query: { redirect },
      }
    : '/setup-2fa'
}

function getFirstAccessiblePath(permissionStore: ReturnType<typeof usePermissionStore>) {
  const appRoute = routes.find((route) => route.path === '/')
  const childRoutes = appRoute?.children || []

  const firstAccessibleRoute = childRoutes.find((route) => canAccessRoute(route, permissionStore))
  return firstAccessibleRoute ? resolveRoutePath(firstAccessibleRoute) : '/login'
}

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | ${appTitle}` : appTitle

  const authStore = useAuthStore()
  const permissionStore = usePermissionStore()
  authStore.hydrate()
  permissionStore.syncFromAuth()

  const hasToken = Boolean(authStore.token)
  if (hasToken) {
    loadPermissionCatalog()
  }
  const currentUser = authStore.user
  const forceTotpSetupRequired = requiresForcedTotpSetup(currentUser)

  if (to.path === '/setup-2fa' && !hasToken) {
    return {
      path: '/login',
      query: {
        redirect: '/setup-2fa',
      },
    }
  }

  if (hasToken && forceTotpSetupRequired) {
    if (to.path === '/setup-2fa') {
      return true
    }

    const redirectTarget = to.path === '/login'
      ? sanitizeRedirectPath(to.query.redirect)
      : to.fullPath
    return buildSetupTotpRedirect(redirectTarget)
  }

  if (hasToken && to.path === '/setup-2fa') {
    const fallbackPath = getFirstAccessiblePath(permissionStore)
    return fallbackPath === '/login' ? '/dashboard' : fallbackPath
  }

  if (to.meta.public) {
    if (hasToken && to.path === '/login') {
      const fallbackPath = getFirstAccessiblePath(permissionStore)
      return fallbackPath === '/login' ? true : fallbackPath
    }
    return true
  }

  if (hasToken) {
    if (canAccessTargetRoute(to.meta?.menuKey, to.meta?.accessMenuKeys, permissionStore)) {
      return true
    }

    const fallbackPath = getFirstAccessiblePath(permissionStore)
    if (fallbackPath === to.path) {
      return false
    }

    return fallbackPath
  }

  return {
    path: '/login',
    query: {
      redirect: to.fullPath,
    },
  }
})

router.afterEach(() => {
  clearRouteLoadRecoveryMarker()
})

router.onError((error, to) => {
  if (isRecoverableRouteLoadError(error)) {
    recoverRouteLoadError(to?.fullPath)
  }
})
