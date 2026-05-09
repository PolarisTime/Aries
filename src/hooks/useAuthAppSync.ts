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

function refreshMasterDataCaches() {
  reloadSupplierOptions()
  reloadCustomerOptions()
  reloadCarrierOptions()
  reloadWarehouseOptions()
  reloadMaterialCategories()
}

export function useAuthAppSync() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const syncFromUser = usePermissionStore((state) => state.syncFromUser)
  const clearPermissions = usePermissionStore((state) => state.clearPermissions)
  const loadMenus = useSystemMenuStore((state) => state.loadMenus)
  const clearMenus = useSystemMenuStore((state) => state.clearMenus)

  useEffect(() => {
    if (user) {
      syncFromUser(user)
      if (usePermissionStore.getState().can('permission', 'read')) {
        void loadPermissionCatalog()
      }
      return
    }
    clearPermissions()
  }, [clearPermissions, syncFromUser, user])

  useEffect(() => {
    if (!token || !user || isApiKeyToken(token)) {
      clearMenus()
      return
    }

    void loadMenus().catch((err) => {
      logger.warn(
        'Failed to load dynamic menus, falling back to local registry',
        err,
      )
    })
  }, [clearMenus, loadMenus, token, user])

  useEffect(() => {
    if (!token || !user) {
      return
    }
    refreshMasterDataCaches()
  }, [token, user])
}
