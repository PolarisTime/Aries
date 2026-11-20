import type {
  ColumnOrderState,
  ColumnVisibilityState,
  OnChangeFn,
  Updater,
} from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveUserColumnSettings } from '@/api/system/user-preferences'
import {
  loadUserAccountSettings,
  rememberUserAccountSettingsPages,
} from '@/services/user-settings-sync'
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
  const nextVisibility: ColumnVisibilityState = {}
  for (const key of settings?.hiddenKeys || []) {
    nextVisibility[key] = false
  }
  return nextVisibility
}

function toColumnSizesState(settings: ListColumnSettings | null) {
  return settings?.columnSizes ?? {}
}

/**
 * 保存的列顺序是否「过期」：引用了当前列定义里已经不存在的列。
 *
 * <p>为什么必须判：`orderedKeys` 是**绝对顺序**，TanStack 会按它把列往前排、
 * 没列进去的列再按定义顺序追加。一旦某次改动调整了列集合（删列、换列、改 include），
 * 旧顺序里留下「已不存在的 key + 仍在的 key」，在仍的列就会保持**旧的相对位置**被推到
 * 前面 —— 表现就是「列顺序莫名其妙乱了」，而且用户自己怎么拖都对不齐。
 * 实测案例：物流单明细把 `materialCode`/`projectName`/`materialName` 从列集合里移除后，
 * 旧顺序把 `仓库/品牌/类别` 甩到了「重量」后面。</p>
 *
 * <p>判定口径：只要有一个 key 找不到，就认为整份顺序来自旧列结构，退回默认顺序 ——
 * 部分复用旧顺序只会得到「半新半旧」的排序，比退回默认更难解释。</p>
 */
function hasStaleOrderedKeys(
  orderedKeys: string[] | undefined,
  columnKeys: readonly string[] | undefined,
): boolean {
  if (!orderedKeys?.length || !columnKeys?.length) return false
  const validKeys = new Set(columnKeys)
  return orderedKeys.some((key) => !validKeys.has(key))
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

interface ResolvedInitialSettings {
  settings: ListColumnSettings | null
  /** 本地存储里的隐藏比例异常且已静默重置, 调用方需要给出一次可感知提示 */
  resetByAbnormalHidden: boolean
}

function resolveInitialSettings(
  pageKey: string,
  userKey: string,
  defaultSettings: ListColumnSettings | null,
  totalColumnCount: number,
  columnKeys?: readonly string[],
  /**
   * 旧版共享 key：该页面从「全局一份」改成「按维度各一份」时，老用户首次进入新 key
   * 读不到设置，会突然看到默认列。传入旧 key 后先继承一次，后续改动只写新 key。
   */
  legacyPageKey?: string,
): ResolvedInitialSettings {
  // config 未就绪时跳过本地存储读取，避免应用旧页面的列设置
  if (totalColumnCount <= 0) {
    return { settings: defaultSettings, resetByAbnormalHidden: false }
  }
  const saved =
    getListColumnSettings(pageKey, userKey) ??
    (legacyPageKey ? getListColumnSettings(legacyPageKey, userKey) : null)
  if (!saved) {
    return { settings: defaultSettings, resetByAbnormalHidden: false }
  }
  /*
   * 陈旧顺序优先判：它直接把列排错位，比「隐藏比例异常」更常发生
   *（每次调整某个模块的列集合都会触发一次）。只清 `orderedKeys`，保留用户的显隐偏好 ——
   * 顺序退默认、隐藏关系仍是用户自己的选择。
   */
  if (hasStaleOrderedKeys(saved.orderedKeys, columnKeys)) {
    logger.warn(
      `Column settings for "${pageKey}" has stale orderedKeys (columns changed), resetting order to default`,
    )
    setListColumnSettings(
      pageKey,
      { orderedKeys: [], hiddenKeys: saved.hiddenKeys },
      userKey,
    )
    return {
      settings: {
        ...saved,
        orderedKeys: [],
      },
      resetByAbnormalHidden: false,
    }
  }
  if (hasAbnormalHiddenKeys(saved.hiddenKeys, totalColumnCount)) {
    logger.warn(
      `Column settings for "${pageKey}" has abnormal hiddenKeys (${saved.hiddenKeys.length}/${totalColumnCount}), resetting to default`,
    )
    setListColumnSettings(pageKey, { orderedKeys: [], hiddenKeys: [] }, userKey)
    return { settings: defaultSettings, resetByAbnormalHidden: true }
  }
  return { settings: saved, resetByAbnormalHidden: false }
}

export function useColumnSettingsSupport(
  pageKey: string,
  defaultHiddenKeys?: string[],
  totalColumnCount = 10,
  /**
   * 当前列定义里的全部列 key。
   *
   * <p>用于识别「保存的列顺序已过期」（见 {@link hasStaleOrderedKeys}）。不传则跳过这项校验，
   * 行为与改造前完全一致 —— 便于逐个页面接入。</p>
   */
  columnKeys?: readonly string[],
  /** 旧版共享 key（见 {@link resolveInitialSettings}）。 */
  legacyPageKey?: string,
) {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const userKey = String(user?.id || user?.loginName || 'anonymous').trim()
  /** 异常隐藏比例重置只提示一次(与 syncWarningShownRef 同一模式) */
  const abnormalResetWarningShownRef = useRef(false)
  /*
   * `columnKeys` 的稳定签名：调用方通常内联 `columns.map(...)`，每次渲染都是新数组。
   * 直接进 effect 依赖会导致每渲染都重新拉一次远端设置（并可能循环），因此只比内容。
   */
  const columnKeysSignature = columnKeys?.join('\u0000') ?? ''
  const resolvedInitialSettings = resolveInitialSettings(
    pageKey,
    userKey,
    buildDefaultSettings(defaultHiddenKeys),
    totalColumnCount,
    columnKeys,
    legacyPageKey,
  )
  const initialSettings = resolvedInitialSettings.settings
  /**
   * 本地存储里的异常隐藏比例(渲染期检测)与远端设置里的异常(异步检测)都汇聚到这里,
   * 由同一个 effect 给出一次可感知提示, 避免在渲染期直接产生副作用。
   */
  const [abnormalHiddenReset, setAbnormalHiddenReset] = useState(
    resolvedInitialSettings.resetByAbnormalHidden,
  )
  useEffect(() => {
    if (!abnormalHiddenReset) return
    if (abnormalResetWarningShownRef.current) return
    abnormalResetWarningShownRef.current = true
    message.warning(t('hooks.columnSettings.resetByAbnormalHidden'))
  }, [abnormalHiddenReset, t])
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    toColumnOrderState(initialSettings),
  )
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>(() => toVisibilityState(initialSettings))
  // 与 state 同步维护的镜像 ref：事件处理器里先算 next 再 setState，
  // 保证 persist 拿到最新值的同时不把副作用塞进 setState updater
  const columnOrderRef = useRef(columnOrder)
  const columnVisibilityRef = useRef(columnVisibility)
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
  /*
   * pageKey 变化（例如报单比价从「全局一份」改成「按项目各一份」后切项目）时，
   * useState 的初始化不会再跑，必须显式按新 key 重读本地设置；否则会沿用上一个项目的显隐。
   * 只比较 key，不因 defaultHiddenKeys 等内联参数变化而重置。
   */
  const pageKeyRef = useRef(pageKey)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅在 pageKey/legacyPageKey 变化时重读；columnKeys 以内容签名参与
  useEffect(() => {
    if (pageKeyRef.current === pageKey) return
    pageKeyRef.current = pageKey
    userChangedRef.current = false
    const settings = resolveInitialSettings(
      pageKey,
      userKey,
      buildDefaultSettings(defaultHiddenKeys),
      totalColumnCount,
      columnKeys,
      legacyPageKey,
    ).settings
    const nextOrder = toColumnOrderState(settings)
    const nextVisibility = toVisibilityState(settings)
    const nextSizes = toColumnSizesState(settings)
    columnOrderRef.current = nextOrder
    columnVisibilityRef.current = nextVisibility
    columnSizesRef.current = nextSizes
    setColumnOrder(nextOrder)
    setColumnVisibility(nextVisibility)
    setColumnSizes(nextSizes)
  }, [pageKey, legacyPageKey, userKey, totalColumnCount, columnKeysSignature])
  const remoteLoadedRef = useRef(false)
  const userChangedRef = useRef(false)
  const [retryTimers] = useState<Set<ReturnType<typeof setTimeout>>>(
    () => new Set(),
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: columnKeys 以内容签名（columnKeysSignature）参与依赖——调用方多以内联数组传入，直接用数组引用会让每次渲染都重拉一次远端设置；这里只关心内容是否变化
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
        /*
         * 与个人设置同步共用**同一次** GET `/account/settings`（引擎里的单飞请求）：
         * 两处各发一次请求时，同一份账户设置会被读两遍、也可能读到不一致的两份快照。
         */
        const accountSettings = await loadUserAccountSettings()
        if (cancelled) {
          return
        }

        remotePagesRef.current = accountSettings?.pages || {}
        const remoteSettings =
          accountSettings?.pages?.[pageKey] ||
          (legacyPageKey
            ? accountSettings?.pages?.[legacyPageKey]
            : undefined) ||
          null
        if (remoteSettings) {
          // 从旧共享 key 继承来的设置立刻落到新 key，下次进入不再依赖旧 key
          if (!accountSettings?.pages?.[pageKey]) {
            setListColumnSettings(pageKey, remoteSettings, userKey)
          }
          /*
           * 远端也可能存着旧列结构下的顺序（同一账号在多台设备/多个版本用过）。
           * 处理与本地一致：只清顺序、保留显隐；同步回存，避免每次加载都重算。
           */
          if (hasStaleOrderedKeys(remoteSettings.orderedKeys, columnKeys)) {
            logger.warn(
              `Remote column settings for "${pageKey}" has stale orderedKeys, resetting order to default`,
            )
            const cleaned: ListColumnSettings = {
              ...remoteSettings,
              orderedKeys: [],
            }
            setListColumnSettings(pageKey, cleaned, userKey)
            const healedPages = {
              ...remotePagesRef.current,
              [pageKey]: cleaned,
            }
            remotePagesRef.current = healedPages
            /*
             * 同步回存：否则每次换设备/清缓存都会重新拉到脏顺序再自愈一遍，
             * 服务端也会一直留着引用已删列的旧数据。失败不影响本次渲染，只记日志。
             */
            void saveUserColumnSettings({ pages: healedPages })
              .then(() => rememberUserAccountSettingsPages(healedPages))
              .catch((error) => {
                logger.warn('Failed to persist healed column order', error)
              })
            if (!userChangedRef.current) {
              columnOrderRef.current = []
              columnVisibilityRef.current = toVisibilityState(cleaned)
              setColumnOrder([])
              setColumnVisibility(toVisibilityState(cleaned))
              setColumnSizes(toColumnSizesState(cleaned))
            }
            remoteLoadedRef.current = true
            setLoaded(true)
            return
          }
          if (
            hasAbnormalHiddenKeys(remoteSettings.hiddenKeys, totalColumnCount)
          ) {
            logger.warn(
              `Remote column settings for "${pageKey}" has abnormal hiddenKeys, resetting`,
            )
            setAbnormalHiddenReset(true)
            setListColumnSettings(
              pageKey,
              { orderedKeys: [], hiddenKeys: [] },
              userKey,
            )
          } else {
            setListColumnSettings(pageKey, remoteSettings, userKey)
            if (!userChangedRef.current) {
              const nextOrder = toColumnOrderState(remoteSettings)
              const nextVisibility = toVisibilityState(remoteSettings)
              columnOrderRef.current = nextOrder
              columnVisibilityRef.current = nextVisibility
              setColumnOrder(nextOrder)
              setColumnVisibility(nextVisibility)
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
  }, [pageKey, legacyPageKey, userKey, totalColumnCount, columnKeysSignature])

  const persist = async (
    order: ColumnOrderState,
    visibility: ColumnVisibilityState,
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
        // 回填共享快照：同一次会话里其它页面复用这份 GET 结果时不会读到过期的 pages
        rememberUserAccountSettingsPages(payload.pages)
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
    const next = resolveUpdater(updater, columnOrderRef.current)
    columnOrderRef.current = next
    setColumnOrder(next)
    void persist(next, columnVisibilityRef.current, columnSizesRef.current)
  }

  const handleColumnVisibilityChange: OnChangeFn<ColumnVisibilityState> = (
    updater,
  ) => {
    const next = resolveUpdater(updater, columnVisibilityRef.current)
    columnVisibilityRef.current = next
    setColumnVisibility(next)
    void persist(columnOrderRef.current, next, columnSizesRef.current)
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
