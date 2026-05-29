import type {
  ColumnOrderState,
  OnChangeFn,
  Updater,
  VisibilityState,
} from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const PERSIST_MAX_RETRIES = 3
const PERSIST_BASE_DELAY_MS = 1000

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code: string }).code === 'ERR_NETWORK'
  }
  return false
}

function resolveUpdater<T>(updater: Updater<T>, current: T) {
  return typeof updater === 'function'
    ? (updater as (value: T) => T)(current)
    : updater
}

function buildDefaultSettings(
  defaultHiddenKeys?: string[],
): ListColumnSettings | null {
  if (!defaultHiddenKeys?.length) {
    return null
  }
  return {
    orderedKeys: [],
    hiddenKeys: [...defaultHiddenKeys],
  }
}

function toColumnOrderState(settings: ListColumnSettings | null) {
  return settings?.orderedKeys || []
}

function toVisibilityState(settings: ListColumnSettings | null) {
  const nextVisibility: VisibilityState = {}
  for (const key of settings?.hiddenKeys || []) {
    nextVisibility[key] = false
  }
  return nextVisibility
}

function hasAbnormalHiddenKeys(
  hiddenKeys: string[],
  totalColumnCount: number,
): boolean {
  // totalColumnCount = 0 说明配置异常，应视为脏数据
  if (totalColumnCount === 0) return hiddenKeys.length > 0
  // 隐藏列数 >= 60% 视为异常
  return hiddenKeys.length >= totalColumnCount * 0.6
}

function resolveInitialSettings(
  pageKey: string,
  userKey: string,
  defaultSettings: ListColumnSettings | null,
  totalColumnCount: number,
) {
  // config 未就绪时跳过本地存储读取，避免应用旧页面的列设置
  if (totalColumnCount <= 0) {
    return defaultSettings
  }
  const saved = getListColumnSettings(pageKey, userKey)
  if (!saved) {
    return defaultSettings
  }
  if (hasAbnormalHiddenKeys(saved.hiddenKeys, totalColumnCount)) {
    logger.warn(
      `Column settings for "${pageKey}" has abnormal hiddenKeys (${saved.hiddenKeys.length}/${totalColumnCount}), resetting to default`,
    )
    setListColumnSettings(pageKey, { orderedKeys: [], hiddenKeys: [] }, userKey)
    return defaultSettings
  }
  return saved
}

export function useColumnSettingsSupport(
  pageKey: string,
  defaultHiddenKeys?: string[],
  totalColumnCount = 10,
) {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const userKey = String(user?.id || user?.loginName || 'anonymous').trim()
  const initialSettings = resolveInitialSettings(
    pageKey,
    userKey,
    buildDefaultSettings(defaultHiddenKeys),
    totalColumnCount,
  )
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    toColumnOrderState(initialSettings),
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => toVisibilityState(initialSettings),
  )
  const [loaded, setLoaded] = useState(false)
  const remotePagesRef = useRef<UserColumnSettingsPayload['pages']>({})
  const syncWarningShownRef = useRef(false)
  const defaultSettingsRef = useRef<ListColumnSettings | null>(
    buildDefaultSettings(defaultHiddenKeys),
  )
  const remoteLoadedRef = useRef(false)
  const userChangedRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    defaultSettingsRef.current = buildDefaultSettings(defaultHiddenKeys)
  }, [defaultHiddenKeys])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoaded(false)
      remoteLoadedRef.current = false

      if (!userKey || userKey === 'anonymous') {
        if (!cancelled) {
          setLoaded(true)
          remoteLoadedRef.current = true
        }
        return
      }

      try {
        const remote = await getUserColumnSettings()
        if (cancelled) {
          return
        }

        remotePagesRef.current = remote?.pages || {}
        const remoteSettings = remote?.pages?.[pageKey] || null
        if (remoteSettings) {
          if (
            hasAbnormalHiddenKeys(remoteSettings.hiddenKeys, totalColumnCount)
          ) {
            logger.warn(
              `Remote column settings for "${pageKey}" has abnormal hiddenKeys, resetting`,
            )
            setListColumnSettings(
              pageKey,
              { orderedKeys: [], hiddenKeys: [] },
              userKey,
            )
          } else {
            setListColumnSettings(pageKey, remoteSettings, userKey)
            if (!userChangedRef.current) {
              setColumnOrder(toColumnOrderState(remoteSettings))
              setColumnVisibility(toVisibilityState(remoteSettings))
            }
          }
        }
        if (!cancelled) {
          remoteLoadedRef.current = true
          setLoaded(true)
        }
      } catch (error) {
        logger.warn('Failed to load roaming column settings', error)
        if (!cancelled) {
          remoteLoadedRef.current = true
          setLoaded(true)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [pageKey, userKey, totalColumnCount])

  const persist = async (
    order: ColumnOrderState,
    visibility: VisibilityState,
  ) => {
    const orderedKeys = order.length > 0 ? order : undefined
    const hiddenKeys = Object.entries(visibility).flatMap(([k, v]) =>
      !v ? [k] : [],
    )
    const settings: ListColumnSettings = {
      orderedKeys: orderedKeys || [],
      hiddenKeys,
    }

    setListColumnSettings(pageKey, settings, userKey)
    userChangedRef.current = true

    if (!userKey || userKey === 'anonymous') {
      return
    }

    if (!remoteLoadedRef.current) {
      return
    }

    const payload: UserColumnSettingsPayload = {
      pages: {
        ...remotePagesRef.current,
        [pageKey]: settings,
      },
    }

    const attempts = Array.from(
      { length: PERSIST_MAX_RETRIES + 1 },
      (_, attempt) => attempt,
    )
    let lastError: unknown
    for (const attempt of attempts) {
      const saveSucceeded = await saveUserColumnSettings(payload)
        .then(() => true)
        .catch(async (error: unknown) => {
          lastError = error
          if (isNetworkError(error) && attempt < PERSIST_MAX_RETRIES) {
            await new Promise<void>((resolve) => {
              retryTimerRef.current = setTimeout(
                resolve,
                PERSIST_BASE_DELAY_MS * 2 ** attempt,
              )
            })
          }
          return false
        })

      if (saveSucceeded) {
        remotePagesRef.current = payload.pages
        syncWarningShownRef.current = false
        return
      }

      if (!(isNetworkError(lastError) && attempt < PERSIST_MAX_RETRIES)) {
        break
      }
    }

    logger.warn('Failed to save roaming column settings', lastError)
    if (!syncWarningShownRef.current) {
      syncWarningShownRef.current = true
      message.warning(t('hooks.columnSettings.syncRetryLater'))
    }
  }

  useEffect(() => {
    return () => {
      const retryTimer = retryTimerRef.current
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
    }
  }, [])

  const handleColumnOrderChange: OnChangeFn<ColumnOrderState> = (updater) => {
    setColumnOrder((current) => {
      const next = resolveUpdater(updater, current)
      void persist(next, columnVisibility)
      return next
    })
  }

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (
    updater,
  ) => {
    setColumnVisibility((current) => {
      const next = resolveUpdater(updater, current)
      void persist(columnOrder, next)
      return next
    })
  }

  return {
    columnOrder,
    columnVisibility,
    loaded,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
  }
}
