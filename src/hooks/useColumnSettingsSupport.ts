import type {
  ColumnOrderState,
  OnChangeFn,
  Updater,
  VisibilityState,
} from '@tanstack/react-table'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getUserColumnSettings,
  saveUserColumnSettings,
} from '@/api/user-preferences'
import { useAuthStore } from '@/stores/authStore'
import type {
  ListColumnSettings,
  UserColumnSettingsPayload,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { logger } from '@/utils/logger'
import { getListColumnSettings, setListColumnSettings } from '@/utils/storage'

function resolveUpdater<T>(updater: Updater<T>, current: T) {
  return typeof updater === 'function'
    ? (updater as (value: T) => T)(current)
    : updater
}

export function useColumnSettingsSupport(pageKey: string) {
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [loaded, setLoaded] = useState(false)
  const user = useAuthStore((state) => state.user)
  const userKey = String(user?.id || user?.loginName || 'anonymous').trim()
  const remotePagesRef = useRef<UserColumnSettingsPayload['pages']>({})
  const syncWarningShownRef = useRef(false)

  const applySettings = useCallback((settings: ListColumnSettings | null) => {
    if (!settings) {
      setColumnOrder([])
      setColumnVisibility({})
      return
    }

    setColumnOrder(settings.orderedKeys || [])

    const nextVisibility: VisibilityState = {}
    for (const key of settings.hiddenKeys || []) {
      nextVisibility[key] = false
    }
    setColumnVisibility(nextVisibility)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoaded(false)

      const localSettings = getListColumnSettings(pageKey, userKey)
      if (localSettings && !cancelled) {
        applySettings(localSettings)
      }

      if (!userKey || userKey === 'anonymous') {
        if (!cancelled) {
          setLoaded(true)
        }
        return
      }

      try {
        const remote = await getUserColumnSettings()
        remotePagesRef.current = remote?.pages || {}
        const remoteSettings = remote?.pages?.[pageKey] || null
        if (remoteSettings) {
          setListColumnSettings(pageKey, remoteSettings, userKey)
        }
        if (!cancelled) {
          applySettings(remoteSettings || localSettings)
        }
      } catch (error) {
        logger.warn('Failed to load roaming column settings', error)
        if (!cancelled) {
          applySettings(localSettings)
        }
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [applySettings, pageKey, userKey])

  const persist = useCallback(
    async (order: ColumnOrderState, visibility: VisibilityState) => {
      const orderedKeys = order.length > 0 ? order : undefined
      const hiddenKeys = Object.entries(visibility)
        .filter(([, v]) => !v)
        .map(([k]) => k)
      const settings: ListColumnSettings = {
        orderedKeys: orderedKeys || [],
        hiddenKeys,
      }

      setListColumnSettings(pageKey, settings, userKey)

      if (!userKey || userKey === 'anonymous') {
        return
      }

      try {
        await saveUserColumnSettings({
          pages: {
            ...remotePagesRef.current,
            [pageKey]: settings,
          },
        })
        remotePagesRef.current = {
          ...remotePagesRef.current,
          [pageKey]: settings,
        }
        syncWarningShownRef.current = false
      } catch (error) {
        logger.warn('Failed to save roaming column settings', error)
        if (!syncWarningShownRef.current) {
          syncWarningShownRef.current = true
          message.warning('列设置已保存到本地，云同步稍后重试')
        }
      }
    },
    [pageKey, userKey],
  )

  const handleColumnOrderChange = useCallback<OnChangeFn<ColumnOrderState>>(
    (updater) => {
      setColumnOrder((current) => {
        const next = resolveUpdater(updater, current)
        void persist(next, columnVisibility)
        return next
      })
    },
    [columnVisibility, persist],
  )

  const handleColumnVisibilityChange = useCallback<OnChangeFn<VisibilityState>>(
    (updater) => {
      setColumnVisibility((current) => {
        const next = resolveUpdater(updater, current)
        void persist(columnOrder, next)
        return next
      })
    },
    [columnOrder, persist],
  )

  return {
    columnOrder,
    columnVisibility,
    loaded,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
  }
}
