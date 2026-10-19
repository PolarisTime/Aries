import type { ParsedLocation } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SearchParams } from '@/types/api-raw'
import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface Props {
  location: ParsedLocation
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  setPage: (page: number) => void
  clearSelection: () => void
  defaultFilters?: SearchParams
  setFilters?: (filters: SearchParams) => void
  setSubmittedFilters: (filters: SearchParams) => void
  updateFilter: (key: string, value: unknown) => void
  /**
   * 列表当前的关键字筛选值（`filters.keyword`）。
   *
   * <p>用于发现「URL 上的 `docNo`/`trackId` 与界面关键字已经不一致」：用户在深链进入后
   * 手动清空/改写搜索框时，URL 若不跟着清掉，刷新会把旧单号重新应用回去
   * （见 {@link shouldConsumeRouteKeyword}）。</p>
   */
  currentKeyword?: string
  openDetail: (target: string | ModuleRecord) => Promise<void>
  openEditor: (
    record: null,
    options?: {
      parentImportSource?: ModuleParentImportSource | null
      initialValues?: Record<string, unknown>
    },
  ) => Promise<void>
}

const EMPTY_FILTERS: SearchParams = {}

/**
 * TanStack Router 默认会把可解析为 JSON 的字符串编码为 `%22...%22`。
 * 只还原 JSON 字符串，数字/布尔值继续保留原始文本，避免雪花 ID 精度丢失。
 */
function readRouteSearchParam(params: URLSearchParams, key: string): string {
  const value = params.get(key) || ''
  if (!value) return ''

  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}

/** URL 查询参数解析（导出供单元测试与外部意图消费方复用） */
export function parseRouteParams(searchStr: string) {
  const params = new URLSearchParams(searchStr)
  const docNo = readRouteSearchParam(params, 'docNo')
  const trackId = readRouteSearchParam(params, 'trackId')
  const customerId = readRouteSearchParam(params, 'customerId')
  const referencedBy = readRouteSearchParam(params, 'referencedBy')
  return {
    docNo,
    sourceModule: readRouteSearchParam(params, 'sourceModule'),
    sourceRecordId: readRouteSearchParam(params, 'sourceRecordId'),
    status: readRouteSearchParam(params, 'status'),
    referencedBy,
    trackId,
    customerId,
    routeKeyword: docNo || trackId,
    shouldOpenDetail: readRouteSearchParam(params, 'openDetail') === '1',
    shouldCreate: readRouteSearchParam(params, 'create') === '1',
    initialValues: Object.fromEntries(
      [
        'counterpartyType',
        'counterpartyId',
        'counterpartyName',
        'settlementCompanyId',
        'settlementCompanyName',
      ].flatMap((key) => {
        const value = readRouteSearchParam(params, key)
        return value ? [[key, value]] : []
      }),
    ),
  }
}

/**
 * 一次性 URL 意图参数登记表。
 *
 * <p><b>约定</b>: 任何「带参数跳转后应只生效一次」的 URL 参数都必须在此登记,
 * 并在对应动作成功后调用 {@link consumeIntentSearch} 消费。</p>
 *
 * <p><b>为什么必须消费</b>: 标签页(Tab)的 pathname+search 会持久化到 localStorage,
 * 且已挂载 Tab 常驻 DOM。未消费的一次性参数会在刷新 / Tab 重挂载(reloadKey 变化)后
 * 再次命中, 导致重复触发(如重复填入上次明细、详情被反复弹开)。</p>
 *
 * <p>注意: 只登记「触发动作」的参数。仅用于预填且不触发副作用的业务字段
 * (如 counterpartyId/docNo)保留在 URL, 不属于一次性意图; 持续型筛选(docNo/status 等)同理。</p>
 */
export const ONE_SHOT_INTENT_PARAMS = {
  /** 新建弹窗意图。 */
  create: ['create'],
  /** 自动打开详情意图; docNo/trackId 同时驱动列表关键字, 故不在此列。 */
  openDetail: ['openDetail'],
  /** 父级导入意图(如采购订单 -> 采购入库)。 */
  parentImport: ['sourceModule', 'sourceRecordId'],
} as const

/** 通用一次性意图消费: 从查询串移除指定参数, 保留其它业务字段。 */
export function consumeIntentSearch(
  searchStr: string,
  keys: readonly string[],
): string {
  const params = new URLSearchParams(searchStr)
  for (const key of keys) {
    params.delete(key)
  }
  return params.toString()
}

/** 消费一次性新建意图，保留调用方带入的业务字段。 */
export function consumeCreateIntentSearch(searchStr: string): string {
  return consumeIntentSearch(searchStr, ONE_SHOT_INTENT_PARAMS.create)
}

/** 消费一次性父级导入意图，保留其它业务字段。 */
export function consumeParentImportIntentSearch(searchStr: string): string {
  return consumeIntentSearch(searchStr, ONE_SHOT_INTENT_PARAMS.parentImport)
}

/**
 * 消费一次性自动打开详情意图，仅移除 openDetail。
 * <p>docNo/trackId 同时驱动列表关键字筛选，必须保留；只清 openDetail 避免刷新/重挂载后
 * 再次自动弹开详情。</p>
 */
export function consumeOpenDetailIntentSearch(searchStr: string): string {
  return consumeIntentSearch(searchStr, ONE_SHOT_INTENT_PARAMS.openDetail)
}

/**
 * URL 里的**持续型筛选参数**清单(唯一来源)。
 *
 * <p>这些参数会驱动列表筛选(`buildRouteFilterSyncState` 消费), 与一次性意图不同:
 * 它们不消费, 而是每次路由同步都重新生效 —— 因此「重置筛选」必须把 URL 一起清掉,
 * 否则刷新 / 切回页签 / 重挂载都会把它们静默灌回界面。</p>
 *
 * <p>实测缺陷: 由「采购入库」点引用跳转进入 `/purchase-order?docNo=…`, 手动清空筛选框
 * 后点「重置」—— 界面清空、列表恢复 30 条, 但 URL 仍带 `docNo`; 按 F5 后筛选框被
 * 自动填回、列表只剩 1 条, 用户第一反应是"数据丢了"。根因就是「重置」只清本地 state。</p>
 *
 * @see buildRouteFilterSyncState —— 上述参数的唯一消费点(两处共用同一份清单)
 */
export const ROUTE_FILTER_PARAMS = [
  'docNo',
  'trackId',
  'customerId',
  'status',
  'referencedBy',
] as const

/**
 * 清掉 URL 里的持续型筛选参数, 保留一次性意图与业务字段。
 *
 * <p>与 {@link consumeIntentSearch} 同源(同一实现、不同清单), 避免两处各写一份
 * "要清哪些参数"的判断。重置按钮调用它, 让 URL 与界面同步清空。</p>
 */
export function consumeRouteFilterSearch(searchStr: string): string {
  return consumeIntentSearch(searchStr, ROUTE_FILTER_PARAMS)
}

/**
 * URL 里**驱动关键字**的那两个参数（`docNo`/`trackId`，见 `routeKeyword`）。
 *
 * <p>只清它们、不动 `status`/`customerId`/`referencedBy`：用户手动改搜索框时
 * 并没有动状态/客户这些筛选，把它们一起摘掉会让「界面还在筛状态、URL 却没了」，
 * 刷新后反而丢掉用户保留的条件。</p>
 */
export const ROUTE_KEYWORD_PARAMS = ['docNo', 'trackId'] as const

/** 只清掉 URL 关键字参数（供「用户手动改搜索框」消费，区别于「重置」的全量清理）。 */
export function consumeRouteKeywordSearch(searchStr: string): string {
  return consumeIntentSearch(searchStr, ROUTE_KEYWORD_PARAMS)
}

/**
 * URL 上的路由关键字（`docNo`/`trackId` 驱动的 `keyword`）是否应被判定为「已被用户消费」。
 *
 * <p><b>要解决的缺陷</b>：从引用跳转/全局搜索进入 `/purchase-order?docNo=…` 后，
 * 用户手动清空（或改写）搜索框 —— 界面筛选变了、列表也变了，但 URL 仍带着旧 `docNo`。
 * 此时按 F5，路由同步会把这个 `docNo` 重新写回筛选框，用户看到「刚清掉的单号又回来了」。
 * 「重置」按钮那条路径已由 {@link consumeRouteFilterSearch} 处理，而手动改搜索框这条路
 * 此前没有任何消费动作。</p>
 *
 * <p><b>为什么要 `appliedRouteKeyword`</b>：深链刚进入时界面关键字还是空的，
 * 而同步 effect 要等下一次渲染才把 `docNo` 写进筛选框。若只看「界面与 URL 不一致」
 * 就消费，会在深链生效前把 URL 清掉，深链直接失效。因此只有在**该 URL 关键字确实
 * 已经应用到界面之后**，出现的不一致才算用户手动改动。</p>
 *
 * @returns true 表示应清掉 URL 上的路由筛选参数（保留 `create`/`openDetail` 等一次性意图）
 */
export function shouldConsumeRouteKeyword({
  routeKeyword,
  currentKeyword,
  appliedRouteKeyword,
}: {
  /** URL 当前携带的路由关键字（空串表示没有） */
  routeKeyword: string
  /** 界面当前的关键字筛选值 */
  currentKeyword: string
  /** 最近一次由路由同步写入界面的关键字（空串表示尚未应用过） */
  appliedRouteKeyword: string
}): boolean {
  if (!routeKeyword) return false
  // 还没被应用到界面：这是深链刚进入的那一帧，不能消费
  if (appliedRouteKeyword !== routeKeyword) return false
  // URL 与界面一致：用户没动过（或改了又改回来），无需处理
  return currentKeyword !== routeKeyword
}

function resolveParentImportSource(
  config: ModulePageConfig | undefined,
  sourceModule: string,
  sourceRecordId: string,
): ModuleParentImportSource | null {
  const parentModuleKey = config?.parentImport?.parentModuleKey
  if (!parentModuleKey || sourceModule !== parentModuleKey) {
    return null
  }

  try {
    const parentRecordId = parseOptionalEntityId(
      sourceRecordId,
      'sourceRecordId',
    )
    return parentRecordId ? { parentModuleKey, parentRecordId } : null
  } catch {
    return null
  }
}

function resolveAutoOpenDetailTarget({
  config,
  records,
  searchStr,
  autoOpenedRouteKey,
}: {
  config?: ModulePageConfig
  records: ModuleRecord[]
  searchStr: string
  autoOpenedRouteKey: string
}): {
  nextAutoOpenedRouteKey: string
  target: string | ModuleRecord
} | null {
  if (!config) return null

  const routeParams = parseRouteParams(searchStr)
  if (!routeParams.shouldOpenDetail) {
    return null
  }

  const routeKey = routeParams.trackId
    ? `track:${routeParams.trackId}`
    : routeParams.docNo
      ? `doc:${routeParams.docNo}`
      : ''
  if (!routeKey || autoOpenedRouteKey === routeKey) {
    return null
  }

  const primaryNoKey = config.primaryNoKey || 'id'
  const matchedRecord = routeParams.trackId
    ? records.find((record) => String(record.id || '') === routeParams.trackId)
    : records.find(
        (record) => asString(record[primaryNoKey]) === routeParams.docNo,
      )

  if (matchedRecord) {
    return {
      nextAutoOpenedRouteKey: routeKey,
      target: matchedRecord,
    }
  }

  if (routeParams.trackId) {
    return {
      nextAutoOpenedRouteKey: routeKey,
      target: routeParams.trackId,
    }
  }

  return null
}

/** 模块筛选白名单中是否包含指定字段 */
export function supportsFilterField(
  config: ModulePageConfig | undefined,
  filterKey: string,
): boolean {
  return Boolean(config?.filters.some((filter) => filter.key === filterKey))
}

type RouteParams = ReturnType<typeof parseRouteParams>

interface RouteFilterSyncInput {
  config: ModulePageConfig | undefined
  defaultFilters: SearchParams
  routeParams: RouteParams
}

/** 根据路由意图合并列表默认筛选条件。 */
export function buildRouteFilterSyncState({
  config,
  defaultFilters,
  routeParams,
}: RouteFilterSyncInput): SearchParams {
  const hasStatusFilter = Boolean(
    routeParams.status && supportsFilterField(config, 'status'),
  )
  const hasReferenceFilter = Boolean(
    routeParams.referencedBy && supportsFilterField(config, 'referencedBy'),
  )
  const filters = { ...defaultFilters }
  // Explicit status selection represents an all-records query. Do not retain
  // the list's default pending-only mode, which excludes completed statuses.
  if (hasStatusFilter || hasReferenceFilter) {
    delete filters.pendingOnly
  }

  if (routeParams.routeKeyword) {
    return {
      ...filters,
      keyword: routeParams.routeKeyword,
      ...(routeParams.customerId && supportsFilterField(config, 'customerId')
        ? { customerId: routeParams.customerId }
        : {}),
    }
  }

  return {
    ...filters,
    ...(routeParams.customerId && supportsFilterField(config, 'customerId')
      ? { customerId: routeParams.customerId }
      : {}),
    ...(routeParams.status && supportsFilterField(config, 'status')
      ? { status: routeParams.status }
      : {}),
    ...(routeParams.referencedBy && supportsFilterField(config, 'referencedBy')
      ? { referencedBy: routeParams.referencedBy }
      : {}),
  }
}

/**
 * 仅由会影响筛选结果的业务输入组成，避免回调引用变化重复同步状态。
 */
export function buildRouteFilterSyncKey({
  config,
  defaultFilters,
  routeParams,
  hasSetFilters,
}: RouteFilterSyncInput & { hasSetFilters: boolean }): string {
  const serializedDefaults = JSON.stringify(
    Object.entries(defaultFilters).toSorted(([left], [right]) =>
      left.localeCompare(right),
    ),
  )
  return JSON.stringify([
    config?.key || '',
    supportsFilterField(config, 'customerId'),
    supportsFilterField(config, 'status'),
    supportsFilterField(config, 'referencedBy'),
    serializedDefaults,
    routeParams.routeKeyword,
    routeParams.customerId,
    routeParams.status,
    routeParams.referencedBy,
    hasSetFilters,
  ])
}

export function useBusinessGridRouteSync({
  location,
  config,
  records,
  setPage,
  clearSelection,
  defaultFilters = EMPTY_FILTERS,
  setFilters,
  setSubmittedFilters,
  updateFilter,
  currentKeyword = '',
  openDetail,
  openEditor,
}: Props) {
  const router = useRouter()
  const autoOpenedRouteKeyRef = useRef('')
  const autoOpenedParentImportKeyRef = useRef('')
  const autoOpenedCreateKeyRef = useRef('')
  const routeFilterSyncKeyRef = useRef<string | null>(null)
  /** 最近一次由路由同步写进界面筛选框的关键字；用于区分"深链生效中"与"用户手动改了"。 */
  const appliedRouteKeywordRef = useRef('')
  /**
   * 在本次提交里刚刚应用过路由关键字 —— 该帧的 `currentKeyword` 仍是旧值，
   * 必须跳过消费判定，否则深链会在生效前被清掉。
   */
  const justAppliedRouteKeywordRef = useRef('')
  /** 请求跳过下一次「路由 → 筛选」重置（用户手动消费关键字后，URL 变化不该覆盖界面筛选）。 */
  const skipRouteFilterResetRef = useRef(false)
  // react-doctor-disable-next-line react-doctor/no-event-handler -- URL 查询串是模块列表的外部入口，变化时需要同步列表过滤条件。
  const rawSearchStr = location.searchStr
  const routeParams = useMemo(
    () => parseRouteParams(rawSearchStr),
    [rawSearchStr],
  )
  const routeFilterSyncKey = buildRouteFilterSyncKey({
    config,
    defaultFilters,
    routeParams,
    hasSetFilters: Boolean(setFilters),
  })

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state -- 路由入口变化需要同时重置分页、选中行和过滤条件。
  useEffect(() => {
    if (routeFilterSyncKeyRef.current === routeFilterSyncKey) {
      return
    }
    routeFilterSyncKeyRef.current = routeFilterSyncKey

    /*
     * 这次 URL 变化是「用户手动改了搜索框 → 我们清掉旧 docNo」造成的。
     * 按路由默认值重置会把用户刚输入的筛选覆盖掉（例如刚搜了 ABC，结果被清回空），
     * 所以只记录 key、不碰筛选状态。
     */
    if (skipRouteFilterResetRef.current) {
      skipRouteFilterResetRef.current = false
      appliedRouteKeywordRef.current = ''
      return
    }

    setPage(1)
    clearSelection()
    autoOpenedRouteKeyRef.current = ''

    const nextRouteFilters = buildRouteFilterSyncState({
      config,
      defaultFilters,
      routeParams,
    })

    if (!routeParams.routeKeyword) {
      // 过滤状态由父级列表持有，这里只同步路由入口。
      if (setFilters) {
        // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步路由入口过滤条件到父级列表。
        setFilters(nextRouteFilters)
      } else {
        // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- 同步路由入口过滤条件到父级列表。
        updateFilter('keyword', '')
      }
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步已提交过滤条件，保证详情跳转后的列表立即收敛到目标单据。
      setSubmittedFilters(nextRouteFilters)
      return
    }

    if (setFilters) {
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步深链关键词到父级列表。
      setFilters(nextRouteFilters)
    } else {
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- 同步深链关键词到父级列表。
      updateFilter('keyword', routeParams.routeKeyword)
    }
    // 记录「路由关键字已写进界面」：后续只有它之后出现的不一致才判定为用户手动改动。
    appliedRouteKeywordRef.current = routeParams.routeKeyword
    justAppliedRouteKeywordRef.current = routeParams.routeKeyword
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步已提交过滤条件，保证详情跳转后的列表立即收敛到目标单据。
    setSubmittedFilters(nextRouteFilters)
  }, [
    clearSelection,
    config,
    defaultFilters,
    routeFilterSyncKey,
    routeParams,
    setPage,
    setFilters,
    setSubmittedFilters,
    updateFilter,
  ])

  /*
   * 用户手动改动/清空搜索框后，把 URL 上不再成立的 `docNo`/`trackId` 一起摘掉。
   *
   * <p>缺陷现场：单据号搜索会把 docNo 写进 URL；用户在界面上手动清空搜索框时，
   * 只有筛选状态变了、URL 没变，于是按 F5 后路由同步又把旧单号写回筛选框
   * （「刚清掉的单号又回来了」）。「重置」按钮这条路由已经清 URL，这里补的是
   * 手动改动这条路径。</p>
   *
   * <p>判定走 {@link shouldConsumeRouteKeyword}：只有该 URL 关键字**已经应用到界面**
   * 之后出现的不一致才算用户改动，避免深链在生效前被误清。</p>
   */
  // react-doctor-disable-next-line react-doctor/no-event-handler -- URL 查询串与界面筛选需要保持同步，任一侧变化都要对齐另一侧。
  useEffect(() => {
    // 本次提交刚把路由关键字写进界面，currentKeyword 仍是旧值，跳过。
    if (justAppliedRouteKeywordRef.current === routeParams.routeKeyword) {
      justAppliedRouteKeywordRef.current = ''
      return
    }
    const consumed = shouldConsumeRouteKeyword({
      routeKeyword: routeParams.routeKeyword,
      currentKeyword,
      appliedRouteKeyword: appliedRouteKeywordRef.current,
    })
    if (!consumed) {
      return
    }
    appliedRouteKeywordRef.current = ''
    skipRouteFilterResetRef.current = true
    // 只清关键字参数：用户改的是搜索框，没有动状态/客户等筛选。
    const nextSearch = consumeRouteKeywordSearch(rawSearchStr)
    const nextHref = nextSearch
      ? `${location.pathname}?${nextSearch}`
      : location.pathname
    router.history.replace(nextHref)
  }, [
    currentKeyword,
    location.pathname,
    rawSearchStr,
    routeParams.routeKeyword,
    router,
  ])

  useEffect(() => {
    if (!routeParams.shouldOpenDetail) {
      autoOpenedRouteKeyRef.current = ''
      return
    }

    const resolvedTarget = resolveAutoOpenDetailTarget({
      config,
      records,
      searchStr: rawSearchStr,
      autoOpenedRouteKey: autoOpenedRouteKeyRef.current,
    })
    if (!resolvedTarget) {
      return
    }

    autoOpenedRouteKeyRef.current = resolvedTarget.nextAutoOpenedRouteKey
    void (async () => {
      try {
        await openDetail(resolvedTarget.target)
        // 自动打开详情是一次性意图: 打开后清除 openDetail, 避免刷新或 Tab 重挂载时重复弹开。
        if (location.searchStr !== rawSearchStr) return
        const nextSearch = consumeOpenDetailIntentSearch(rawSearchStr)
        const nextHref = nextSearch
          ? `${location.pathname}?${nextSearch}`
          : location.pathname
        router.history.replace(nextHref)
      } catch {
        autoOpenedRouteKeyRef.current = ''
      }
    })()
  }, [
    config,
    location.pathname,
    location.searchStr,
    openDetail,
    rawSearchStr,
    records,
    router,
    routeParams.shouldOpenDetail,
  ])

  useEffect(() => {
    if (!routeParams.shouldCreate) {
      autoOpenedCreateKeyRef.current = ''
      return
    }
    if (!config || autoOpenedCreateKeyRef.current === rawSearchStr) return
    autoOpenedCreateKeyRef.current = rawSearchStr
    void (async () => {
      try {
        await openEditor(null, { initialValues: routeParams.initialValues })
        if (location.searchStr !== rawSearchStr) return
        const nextSearch = consumeCreateIntentSearch(rawSearchStr)
        const nextHref = nextSearch
          ? `${location.pathname}?${nextSearch}`
          : location.pathname
        // 新建弹窗打开后消费 URL 意图，避免刷新或再次点击时重复触发。
        router.history.replace(nextHref)
      } catch {
        autoOpenedCreateKeyRef.current = ''
      }
    })()
  }, [
    config,
    location.pathname,
    location.searchStr,
    router,
    openEditor,
    rawSearchStr,
    routeParams.initialValues,
    routeParams.shouldCreate,
  ])

  useEffect(() => {
    const parentImportSource = resolveParentImportSource(
      config,
      routeParams.sourceModule,
      routeParams.sourceRecordId,
    )
    if (!parentImportSource) {
      autoOpenedParentImportKeyRef.current = ''
      return
    }

    const routeKey = `${parentImportSource.parentModuleKey}:${parentImportSource.parentRecordId}`
    if (autoOpenedParentImportKeyRef.current === routeKey) {
      return
    }

    autoOpenedParentImportKeyRef.current = routeKey
    void (async () => {
      try {
        await openEditor(null, { parentImportSource })
        // 父级导入是一次性意图: 打开后清除 URL 参数, 避免 tab 常驻/重挂载时
        // 再次命中残留的 sourceModule/sourceRecordId 而重复填入上次的明细。
        if (location.searchStr !== rawSearchStr) return
        const nextSearch = consumeParentImportIntentSearch(rawSearchStr)
        const nextHref = nextSearch
          ? `${location.pathname}?${nextSearch}`
          : location.pathname
        router.history.replace(nextHref)
      } catch {
        autoOpenedParentImportKeyRef.current = ''
      }
    })()
  }, [
    config,
    location.pathname,
    location.searchStr,
    openEditor,
    rawSearchStr,
    router,
    routeParams.sourceModule,
    routeParams.sourceRecordId,
  ])

  /**
   * 清掉 URL 里驱动筛选的参数(供「重置」调用)。
   *
   * <p>与上面三个一次性意图消费同走 `router.history.replace`, 但语义不同:
   * 这是一次**用户主动的重置**, 不是自动消费, 因此不判断 `searchStr` 是否变化、
   * 也不消费意图参数 —— 只把 {@link ROUTE_FILTER_PARAMS} 摘掉, 保留 `create` /
   * `openDetail` 等一次性意图与 `counterpartyId` 一类预填字段。</p>
   */
  const clearRouteFilters = useCallback(() => {
    const nextSearch = consumeRouteFilterSearch(router.state.location.searchStr)
    if (
      nextSearch ===
      new URLSearchParams(router.state.location.searchStr).toString()
    ) {
      return
    }
    const nextHref = nextSearch
      ? `${router.state.location.pathname}?${nextSearch}`
      : router.state.location.pathname
    router.history.replace(nextHref)
  }, [router])

  return { clearRouteFilters }
}
