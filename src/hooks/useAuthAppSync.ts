import { useEffect } from 'react'
import { reloadCarrierOptions } from '@/api/carrier-options'
import { reloadCustomerOptions } from '@/api/customer-options'
import { reloadMaterialCategories } from '@/api/material-categories'
import { reloadSupplierOptions } from '@/api/supplier-options'
import { reloadWarehouseOptions } from '@/api/warehouse-options'
import { loadPermissionCatalog } from '@/constants/resource-permissions'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSystemMenuStore } from '@/stores/systemMenuStore'
import { isApiKeyToken } from '@/utils/auth-token'
import { logger } from '@/utils/logger'

type IdleCallbackHandle = number
type IdleDeadlineLike = {
  didTimeout: boolean
  timeRemaining: () => number
}

function runWhenIdle(task: () => void, timeout = 1500) {
  if (typeof window === 'undefined') {
    task()
    return () => {}
  }

  type IdleWindow = Window &
    typeof globalThis & {
      requestIdleCallback?: (
        callback: (deadline: IdleDeadlineLike) => void,
        options?: { timeout?: number },
      ) => IdleCallbackHandle
      cancelIdleCallback?: (handle: IdleCallbackHandle) => void
    }

  const idleWindow = window
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => task(), { timeout })
    return () => idleWindow.cancelIdleCallback?.(handle)
  }

  const handle = window.setTimeout(task, 300)
  return () => window.clearTimeout(handle)
}

function refreshMasterDataCaches() {
  void reloadSupplierOptions()
  void reloadCustomerOptions()
  void reloadCarrierOptions()
  void reloadWarehouseOptions()
  void reloadMaterialCategories()
}

export function useAuthAppSync() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const authReady = useAuthStore((state) => state.authReady)
  const syncFromUser = usePermissionStore((state) => state.syncFromUser)
  const clearPermissions = usePermissionStore((state) => state.clearPermissions)
  const loadMenus = useSystemMenuStore((state) => state.loadMenus)
  const clearMenus = useSystemMenuStore((state) => state.clearMenus)

  useEffect(() => {
    if (user) {
      syncFromUser(user)
      if (
        authReady &&
        usePermissionStore.getState().can('permission', 'read')
      ) {
        return runWhenIdle(() => {
          void loadPermissionCatalog()
        })
      }
      return
    }
    clearPermissions()
  }, [authReady, clearPermissions, syncFromUser, user])

  useEffect(() => {
    if (!authReady || !token || !user || isApiKeyToken(token)) {
      clearMenus()
      return
    }

    return runWhenIdle(() => {
      void loadMenus().catch((err) => {
        logger.warn(
          'Failed to load dynamic menus, falling back to local registry',
          err,
        )
      })
    })
  }, [authReady, clearMenus, loadMenus, token, user])

  useEffect(() => {
    if (!authReady || !token || !user) {
      return
    }

    return runWhenIdle(() => {
      refreshMasterDataCaches()
    }, 2500)
  }, [authReady, token, user])
}
