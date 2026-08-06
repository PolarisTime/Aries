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
} from '@/api/system/user-preferences'
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

function toColumnSizesState(settings: ListColumnSettings | null) {
  return settings?.columnSizes ?? {}
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
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>(() =>
    toColumnSizesState(initialSettings),
  )
  const [loaded, setLoaded] = useState(false)
  const remotePagesRef = useRef<UserColumnSettingsPayload['pages']>({})
  const syncWarningShownRef = useRef(false)
  // commit 时读取最新列宽，避免 persist 闭包拿到过期值
  const columnSizesRef = useRef(columnSizes)
  useEffect(() => {
    columnSizesRef.current = columnSizes
  }, [columnSizes])
  const remoteLoadedRef = useRef(false)
  const userChangedRef = useRef(false)
  const retryTimersRef = useRef<Set<ReturnType<typeof setTimeout>> | null>(null)
  if (retryTimersRef.current === null) {
    retryTimersRef.current = new Set()
  }
  const retryTimers = retryTimersRef.current

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoaded(false)
      remoteLoadedRef.current = false

      if (!userKey || userKey === 'anonymous') {
        setLoaded(true)
        remoteLoadedRef.current = true
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
              setColumnSizes(toColumnSizesState(remoteSettings))
            }
          }
        }
        remoteLoadedRef.current = true
        setLoaded(true)
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
    sizes: Record<string, number>,
  ) => {
    const orderedKeys = order.length > 0 ? order : undefined
    const hiddenKeys = Object.entries(visibility).flatMap(([k, v]) =>
      !v ? [k] : [],
    )
    const settings: ListColumnSettings = {
      orderedKeys: orderedKeys || [],
      hiddenKeys,
      // 未拖拽过的用户不写 columnSizes，保持旧 payload 不变
      ...(Object.keys(sizes).length > 0 ? { columnSizes: sizes } : {}),
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

    const waitForRetry = (delay: number) =>
      new Promise<void>((resolve) => {
        const retryTimer = setTimeout(() => {
          retryTimers.delete(retryTimer)
          resolve()
        }, delay)
        retryTimers.add(retryTimer)
      })

    const persistWithRetry = async (attempt: number): Promise<void> => {
      try {
        await saveUserColumnSettings(payload)
        remotePagesRef.current = payload.pages
        syncWarningShownRef.current = false
        return
      } catch (error) {
        if (isNetworkError(error) && attempt < PERSIST_MAX_RETRIES) {
          await waitForRetry(PERSIST_BASE_DELAY_MS * 2 ** attempt)
          return persistWithRetry(attempt + 1)
        }
        throw error
      }
    }

    try {
      await persistWithRetry(0)
    } catch (error) {
      logger.warn('Failed to save roaming column settings', error)
      if (!syncWarningShownRef.current) {
        syncWarningShownRef.current = true
        message.warning(t('hooks.columnSettings.syncRetryLater'))
      }
    }
  }

  useEffect(() => {
    return () => {
      for (const retryTimer of retryTimers) {
        clearTimeout(retryTimer)
      }
      retryTimers.clear()
    }
  }, [retryTimers])

  const handleColumnOrderChange: OnChangeFn<ColumnOrderState> = (updater) => {
    setColumnOrder((current) => {
      const next = resolveUpdater(updater, current)
      void persist(next, columnVisibility, columnSizesRef.current)
      return next
    })
  }

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (
    updater,
  ) => {
    setColumnVisibility((current) => {
      const next = resolveUpdater(updater, current)
      void persist(columnOrder, next, columnSizesRef.current)
      return next
    })
  }

  const handleColumnResizePreview = (columnKey: string, width: number) => {
    setColumnSizes((current) => {
      const rounded = Math.round(width)
      if (current[columnKey] === rounded) return current
      return { ...current, [columnKey]: rounded }
    })
  }

  const handleColumnResizeCommit = () => {
    void persist(columnOrder, columnVisibility, columnSizesRef.current)
  }

  const handleColumnResizeReset = (columnKey?: string) => {
    const current = columnSizesRef.current
    let next: Record<string, number>
    if (columnKey) {
      if (!(columnKey in current)) return
      next = { ...current }
      delete next[columnKey]
    } else {
      next = {}
    }
    setColumnSizes(next)
    columnSizesRef.current = next
    void persist(columnOrder, columnVisibility, next)
  }

  return {
    columnOrder,
    columnVisibility,
    columnSizes,
    loaded,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
    handleColumnResizePreview,
    handleColumnResizeCommit,
    handleColumnResizeReset,
  }
}
