import { useEffect } from 'react'
import { AUTH_STATE_CHANGED_EVENT } from '@/constants/auth'
import { reloadCarrierOptions } from '@/queries/master/carrier-options'
import { reloadCustomerOptions } from '@/queries/master/customer-options'
import { reloadMaterialCategories } from '@/queries/master/material-categories'
import { reloadSupplierOptions } from '@/queries/master/supplier-options'
import { reloadWarehouseOptions } from '@/queries/master/warehouse-options'
import { reloadSettlementCompanyOptions } from '@/queries/system/company-settings'
import { useAuthStore } from '@/stores/authStore'

type IdleCallbackHandle = number
type IdleDeadlineLike = {
  didTimeout: boolean
  timeRemaining: () => number
}

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: (deadline: IdleDeadlineLike) => void,
      options?: { timeout?: number },
    ) => IdleCallbackHandle
    cancelIdleCallback?: (handle: IdleCallbackHandle) => void
  }

function runWhenIdle(task: () => void, timeout = 1500) {
  const idleWindow: IdleWindow = window
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
  void reloadSettlementCompanyOptions()
  void reloadWarehouseOptions()
  void reloadMaterialCategories()
}

export function useAuthAppSync() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const authReady = useAuthStore((state) => state.authReady)

  useEffect(() => {
    const syncAuthState = () => {
      useAuthStore.getState().syncFromStorage()
    }
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState)
    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState)
    }
  }, [])

  useEffect(() => {
    if (!authReady || !token || !user) {
      return
    }

    return runWhenIdle(() => {
      refreshMasterDataCaches()
    }, 2500)
  }, [authReady, token, user])
}
