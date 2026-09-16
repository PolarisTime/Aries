import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readRequestError } from '@/api/core/request-errors'
import {
  fetchQuoteProjectConfig,
  type QuoteProjectConfigPayload,
  type QuoteProjectConfigRecord,
  saveQuoteProjectConfig,
} from '@/api/market/quote-project-configs'
import {
  createQuoteSheet,
  deleteQuoteSheet,
  fetchQuoteSheet,
  fetchQuoteSheets,
  type QuoteSheetPayload,
  type QuoteSheetRecord,
  updateQuoteSheet,
} from '@/api/market/quote-sheets'
import { useAuthStore } from '@/stores/authStore'
import { message, modal } from '@/utils/antd-app'
import { DEFAULT_LENGTH_PREMIUM, makeSheet } from './core'
import type {
  Brand,
  PriceRow,
  PriceSheet,
  ProjectConfig,
  SheetInput,
  SheetInputs,
} from './types'

const HISTORY_LIMIT = 50
const COALESCE_MS = 800
const SAVE_DEBOUNCE_MS = 800
/** 跨标签同步频道。 */
const SYNC_CHANNEL = 'aries-price-compare'
/** 聚焦/轮询刷新间隔。 */
const REFRESH_INTERVAL_MS = 30_000
/** 有未保存改动时"服务器有更新"提示的去重 key。 */
const STALE_NOTICE_KEY = 'price-compare-stale'
const CONFLICT_STATUS = 409
const CONFLICT_CODE = 4090

const CONFLICT_TITLE = '单据已被他人修改'
const CONFLICT_CONTENT =
  '服务器上的内容已被其他设备更新，请选择处理方式。重新加载将丢弃本地改动，以我的覆盖将用当前内容覆盖服务器。'
const CONFLICT_OVERWRITE_TEXT = '以我的覆盖'
const CONFLICT_RELOAD_TEXT = '重新加载（丢弃我的改动）'
const STALE_NOTICE_TEXT = '服务器有更新，保存后请刷新'

/** 同一资源串行执行: 在飞行中则排队一次, 结束后补跑最新任务。 */
async function runSerializedTask(
  inflight: Set<string>,
  pending: Set<string>,
  key: string,
  task: () => Promise<void>,
): Promise<void> {
  if (inflight.has(key)) {
    pending.add(key)
    return
  }
  inflight.add(key)
  try {
    await task()
  } finally {
    inflight.delete(key)
    if (pending.delete(key)) {
      void runSerializedTask(inflight, pending, key, task)
    }
  }
}

type Snapshot = {
  sheets: PriceSheet[]
  activeId: string
  /** 项目级配置: projectId -> 配置 */
  configs: Record<string, ProjectConfig>
}

/** 服务端冲突: 409 / 4090。 */
function isConflictError(error: unknown): boolean {
  const { status, code } = readRequestError(error)
  return status === CONFLICT_STATUS || code === CONFLICT_CODE
}

/** 服务端项目配置记录 -> 本地配置(无品牌时回退单据品牌快照)。 */
function buildConfigFromRecord(
  record: QuoteProjectConfigRecord,
  fallbackBrands?: Brand[],
): ProjectConfig {
  const brands: Brand[] = record.brands.length
    ? record.brands.map((brand) => ({
        name: brand.brandName,
        freight: brand.freight,
        ...(brand.categories.length ? { categories: brand.categories } : {}),
      }))
    : (fallbackBrands ?? []).map((brand) => ({
        name: brand.name,
        freight: brand.freight,
      }))
  return {
    brands,
    lengthPremium: record.lengthPremium,
    hrb400eFallback: record.hrb400eFallback,
    ...(record.products.length ? { products: record.products } : {}),
    ...(record.designatedBrands.length
      ? { designatedBrands: record.designatedBrands }
      : {}),
    ...(record.remark ? { remark: record.remark } : {}),
    ...(record.version ? { version: record.version } : {}),
  }
}

/** 本地配置 -> 保存请求体。 */
function buildConfigPayload(config: ProjectConfig): QuoteProjectConfigPayload {
  return {
    lengthPremium: config.lengthPremium,
    hrb400eFallback: Boolean(config.hrb400eFallback),
    products: config.products ?? [],
    designatedBrands: config.designatedBrands ?? [],
    ...(config.remark ? { remark: config.remark } : {}),
    brands: config.brands.map((brand, index) => ({
      brandName: brand.name,
      freight: brand.freight,
      categories: brand.categories ?? [],
      sortOrder: index,
    })),
  }
}

const emptyConfig = (): ProjectConfig => ({
  brands: [],
  lengthPremium: DEFAULT_LENGTH_PREMIUM,
  hrb400eFallback: false,
})

/** 行是否具备完整商品信息(后端要求 category/material/spec/length 非空)。 */
function isCompleteRow(row: PriceRow): boolean {
  return Boolean(row.category && row.material && row.spec && row.length)
}

/** 单据是否可持久化: 有品牌、有完整商品行、参照与报单日期齐备。 */
function isPersistable(sheet: PriceSheet, config: ProjectConfig): boolean {
  if (!sheet.orderDate || !sheet.refDate || !sheet.refPeriod) return false
  if (!config.brands.length) return false
  return sheet.rows.some(isCompleteRow)
}

/** 组装后端保存请求体; 不可持久化时返回 null。 */
function buildPayload(
  sheet: PriceSheet,
  config: ProjectConfig,
): QuoteSheetPayload | null {
  if (!isPersistable(sheet, config)) return null
  const brands = config.brands
  return {
    name: sheet.name || '未命名批次',
    orderDate: sheet.orderDate,
    refDate: sheet.refDate,
    refPeriod: sheet.refPeriod,
    lengthPremium: sheet.lengthPremium,
    locked: Boolean(sheet.locked),
    ...(sheet.projectId ? { projectId: sheet.projectId } : {}),
    ...(sheet.projectName ? { projectName: sheet.projectName } : {}),
    ...(sheet.status ? { status: sheet.status } : {}),
    ...(sheet.remark ? { remark: sheet.remark } : {}),
    brands: brands.map((brand, index) => ({
      brandName: brand.name,
      freight: brand.freight,
      sortOrder: index,
    })),
    items: sheet.rows.flatMap((row) => {
      if (!isCompleteRow(row)) return []
      const prices = brands.flatMap((brand) => {
        const input = sheet.inputs[`${brand.name}:${row.id}`]
        if (!input || (input.spot === undefined && !input.supplierId)) return []
        return [
          {
            brandName: brand.name,
            ...(input.spot !== undefined ? { spotPrice: input.spot } : {}),
            ...(input.supplierId ? { supplierId: input.supplierId } : {}),
          },
        ]
      })
      return [
        {
          category: row.category,
          material: row.material,
          spec: Number(row.spec),
          length: row.length,
          ...(row.ton !== undefined ? { ton: row.ton } : {}),
          prices,
        },
      ]
    }),
  }
}

/** 乐观并发冲突: 单据或项目配置。 */
export type SheetsConflict = { kind: 'sheet' | 'config'; id: string }

export type SheetsStore = {
  loading: boolean
  sheets: PriceSheet[]
  activeId: string
  active: PriceSheet
  rows: PriceRow[]
  /** 未处理的乐观并发冲突; 由冲突弹窗驱动处理 */
  conflict: SheetsConflict | null
  /** 当前项目配置 */
  config: ProjectConfig
  setConfig: (patch: Partial<ProjectConfig>) => void
  setBrands: (value: Brand[] | ((current: Brand[]) => Brand[])) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  setActiveId: (id: string) => void
  patchSheet: (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) => void
  addSheet: (
    projectId: string,
    projectName: string,
    orderDate: string,
    refDate: string,
    refPeriod: string,
  ) => void
  assignProjectToUnassigned: (projectId: string, projectName: string) => void
  removeSheet: (id: string) => void
}

type History = {
  past: Snapshot[]
  future: Snapshot[]
  lastKey: string
  lastTime: number
}

function defaultState(): Snapshot {
  const a = makeSheet('批次 1', '', '', '', '', '')
  const b = makeSheet('批次 2', '', '', '', '', '')
  return { sheets: [a, b], activeId: a.id, configs: {} }
}

/** 多单据状态: 服务端为数据源, 本地乐观更新 + 防抖自动保存; 支持撤销/重做。 */
export function useSheetsStore(): SheetsStore {
  const token = useAuthStore((state) => state.token)
  const [state, setState] = useState<Snapshot>(defaultState)
  const [loading, setLoading] = useState(true)
  const [, forceRender] = useState(0)
  const stateRef = useRef(state)
  const historyRef = useRef<History>({
    past: [],
    future: [],
    lastKey: '',
    lastTime: 0,
  })
  /** 本地单据 id -> 服务端单据 id(新建成功后填充)。 */
  const serverIdRef = useRef<Map<string, string>>(new Map())
  const sheetTimersRef = useRef<Map<string, number>>(new Map())
  const configTimerRef = useRef<number | null>(null)
  const hydratedRef = useRef(false)
  /** 同一资源(单据/项目配置)串行保存, 避免并发 PUT 触发乐观锁 409。 */
  const inflightRef = useRef<Set<string>>(new Set())
  const pendingRef = useRef<Set<string>>(new Set())
  const [conflict, setConflict] = useState<SheetsConflict | null>(null)
  const syncChannelRef = useRef<BroadcastChannel | null>(null)
  const reloadSheetRef = useRef<(sheetId: string) => Promise<void>>(
    async () => {},
  )
  const overrideSheetRef = useRef<(sheetId: string) => Promise<void>>(
    async () => {},
  )
  const reloadConfigRef = useRef<(projectId: string) => Promise<void>>(
    async () => {},
  )
  const overrideConfigRef = useRef<(projectId: string) => Promise<void>>(
    async () => {},
  )

  const runSerialized = useCallback(
    (key: string, task: () => Promise<void>) =>
      runSerializedTask(inflightRef.current, pendingRef.current, key, task),
    [],
  )

  /** 静默写入状态(不进入撤销/重做历史), 用于回填服务端版本与刷新。 */
  const mutate = useCallback((updater: (current: Snapshot) => Snapshot) => {
    const next = updater(stateRef.current)
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
    forceRender((version) => version + 1)
  }, [])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const commit = useCallback((next: Snapshot, coalesceKey?: string) => {
    const history = historyRef.current
    const now = Date.now()
    const coalesce =
      Boolean(coalesceKey) &&
      coalesceKey === history.lastKey &&
      now - history.lastTime < COALESCE_MS
    if (!coalesce) {
      history.past = [
        ...history.past.slice(-(HISTORY_LIMIT - 1)),
        stateRef.current,
      ]
      history.future = []
    }
    history.lastKey = coalesceKey ?? ''
    history.lastTime = now
    stateRef.current = next
    setState(next)
    forceRender((version) => version + 1)
  }, [])

  const apply = useCallback(
    (updater: (current: Snapshot) => Snapshot, coalesceKey?: string) => {
      const next = updater(stateRef.current)
      if (next === stateRef.current) return
      commit(next, coalesceKey)
    },
    [commit],
  )

  const configOf = useCallback(
    (projectId: string): ProjectConfig =>
      (projectId && stateRef.current.configs[projectId]) || emptyConfig(),
    [],
  )

  /** 回填单据服务端版本(不进入撤销历史)。 */
  const applySheetVersion = useCallback(
    (sheetId: string, version: string | undefined) => {
      if (!version) return
      mutate((current) => ({
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.id === sheetId ? { ...sheet, version } : sheet,
        ),
      }))
    },
    [mutate],
  )

  /** 回填项目配置服务端版本(不进入撤销历史)。 */
  const applyConfigVersion = useCallback(
    (projectId: string, version: string | undefined) => {
      if (!version) return
      mutate((current) => {
        const currentConfig = current.configs[projectId]
        if (!currentConfig || currentConfig.version === version) return current
        return {
          ...current,
          configs: {
            ...current.configs,
            [projectId]: { ...currentConfig, version },
          },
        }
      })
    },
    [mutate],
  )

  /** 广播本标签保存成功, 触发其他标签按同一规则刷新。 */
  const broadcastSaved = useCallback(() => {
    syncChannelRef.current?.postMessage({ type: 'saved' })
  }, [])

  /** 乐观并发冲突: 提示并以"重新加载/以我的覆盖"驱动处理。 */
  const handleConflict = useCallback((kind: 'sheet' | 'config', id: string) => {
    setConflict({ kind, id })
    modal.confirm({
      title: CONFLICT_TITLE,
      content: CONFLICT_CONTENT,
      okText: CONFLICT_OVERWRITE_TEXT,
      cancelText: CONFLICT_RELOAD_TEXT,
      closable: false,
      maskClosable: false,
      onOk: async () => {
        setConflict(null)
        if (kind === 'sheet') await overrideSheetRef.current(id)
        else await overrideConfigRef.current(id)
      },
      onCancel: async () => {
        setConflict(null)
        if (kind === 'sheet') await reloadSheetRef.current(id)
        else await reloadConfigRef.current(id)
      },
    })
  }, [])

  /** 重新加载(丢弃本地改动): 拉取服务端最新覆盖本地。 */
  const reloadSheet = useCallback(
    async (sheetId: string) => {
      try {
        const serverId = serverIdRef.current.get(sheetId) ?? sheetId
        const record = await fetchQuoteSheet(serverId)
        serverIdRef.current.set(sheetId, record.id)
        const fresh: PriceSheet = { ...toPriceSheet(record), id: sheetId }
        mutate((current) => ({
          ...current,
          sheets: current.sheets.map((sheet) =>
            sheet.id === sheetId ? fresh : sheet,
          ),
        }))
      } catch (error) {
        console.error('重新加载比价单失败', error)
        message.error('重新加载比价单失败，请稍后重试')
      }
    },
    [mutate],
  )

  /** 以我的覆盖: 取服务端最新版本后原样重发本地内容。 */
  const overrideSheet = useCallback(
    async (sheetId: string) => {
      const sheet = stateRef.current.sheets.find((item) => item.id === sheetId)
      if (!sheet) return
      const payload = buildPayload(sheet, configOf(sheet.projectId))
      if (!payload) return
      const serverId = serverIdRef.current.get(sheetId)
      if (!serverId) return
      try {
        const latest = await fetchQuoteSheet(serverId)
        const saved = await updateQuoteSheet(serverId, payload, latest.version)
        applySheetVersion(sheetId, saved.version)
        broadcastSaved()
      } catch (error) {
        if (isConflictError(error)) {
          handleConflict('sheet', sheetId)
          return
        }
        message.error(
          error instanceof Error
            ? `保存比价单失败：${error.message}`
            : '保存比价单失败',
        )
      }
    },
    [applySheetVersion, broadcastSaved, configOf, handleConflict],
  )

  /** 重新加载(丢弃本地改动)项目配置。 */
  const reloadConfig = useCallback(
    async (projectId: string) => {
      try {
        const record = await fetchQuoteProjectConfig(projectId)
        const fallbackBrands = stateRef.current.sheets.find(
          (sheet) => sheet.projectId === projectId && sheet.brands?.length,
        )?.brands
        const fresh = buildConfigFromRecord(record, fallbackBrands)
        mutate((current) => ({
          ...current,
          configs: { ...current.configs, [projectId]: fresh },
        }))
      } catch (error) {
        console.error('重新加载比价配置失败', error)
        message.error('重新加载比价配置失败，请稍后重试')
      }
    },
    [mutate],
  )

  /** 以我的覆盖: 取服务端最新版本后原样重发本地项目配置。 */
  const overrideConfig = useCallback(
    async (projectId: string) => {
      const config = stateRef.current.configs[projectId]
      if (!config) return
      try {
        const latest = await fetchQuoteProjectConfig(projectId)
        const saved = await saveQuoteProjectConfig(
          projectId,
          buildConfigPayload(config),
          latest.version,
        )
        applyConfigVersion(projectId, saved.version)
        broadcastSaved()
      } catch (error) {
        if (isConflictError(error)) {
          handleConflict('config', projectId)
          return
        }
        message.error(
          error instanceof Error
            ? `保存比价配置失败：${error.message}`
            : '保存比价配置失败',
        )
      }
    },
    [applyConfigVersion, broadcastSaved, handleConflict],
  )

  useEffect(() => {
    reloadSheetRef.current = reloadSheet
    overrideSheetRef.current = overrideSheet
    reloadConfigRef.current = reloadConfig
    overrideConfigRef.current = overrideConfig
  }, [reloadSheet, overrideSheet, reloadConfig, overrideConfig])

  const saveSheetNow = useCallback(
    async (sheetId: string) => {
      await runSerialized(`sheet:${sheetId}`, async () => {
        const sheet = stateRef.current.sheets.find(
          (item) => item.id === sheetId,
        )
        if (!sheet) return
        const payload = buildPayload(sheet, configOf(sheet.projectId))
        if (!payload) return
        const serverId = serverIdRef.current.get(sheet.id)
        try {
          if (serverId) {
            const saved = await updateQuoteSheet(
              serverId,
              payload,
              sheet.version,
            )
            applySheetVersion(sheet.id, saved.version)
          } else {
            const created = await createQuoteSheet(payload)
            serverIdRef.current.set(sheet.id, created.id)
            applySheetVersion(sheet.id, created.version)
          }
          broadcastSaved()
        } catch (error) {
          if (isConflictError(error)) {
            handleConflict('sheet', sheetId)
            return
          }
          message.error(
            error instanceof Error
              ? `保存比价单失败：${error.message}`
              : '保存比价单失败',
          )
        }
      })
    },
    [
      applySheetVersion,
      broadcastSaved,
      configOf,
      handleConflict,
      runSerialized,
    ],
  )

  const scheduleSaveSheet = useCallback(
    (sheetId: string) => {
      const existing = sheetTimersRef.current.get(sheetId)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        sheetTimersRef.current.delete(sheetId)
        void saveSheetNow(sheetId)
      }, SAVE_DEBOUNCE_MS)
      sheetTimersRef.current.set(sheetId, timer)
    },
    [saveSheetNow],
  )

  const saveConfigNow = useCallback(
    async (projectId: string) => {
      if (!projectId) return
      await runSerialized(`config:${projectId}`, async () => {
        const config = stateRef.current.configs[projectId]
        if (!config) return
        try {
          const saved = await saveQuoteProjectConfig(
            projectId,
            buildConfigPayload(config),
            config.version,
          )
          applyConfigVersion(projectId, saved.version)
          broadcastSaved()
        } catch (error) {
          if (isConflictError(error)) {
            handleConflict('config', projectId)
            return
          }
          message.error(
            error instanceof Error
              ? `保存比价配置失败：${error.message}`
              : '保存比价配置失败',
          )
        }
      })
    },
    [applyConfigVersion, broadcastSaved, handleConflict, runSerialized],
  )

  const scheduleSaveConfig = useCallback(
    (projectId: string) => {
      if (!projectId) return
      if (configTimerRef.current) window.clearTimeout(configTimerRef.current)
      configTimerRef.current = window.setTimeout(() => {
        configTimerRef.current = null
        void saveConfigNow(projectId)
      }, SAVE_DEBOUNCE_MS)
    },
    [saveConfigNow],
  )

  /** 拉取服务端单据覆盖本地; 有未保存改动时跳过(返回 false)。 */
  const refreshSheets = useCallback(async (): Promise<boolean> => {
    if (
      sheetTimersRef.current.size > 0 ||
      [...inflightRef.current, ...pendingRef.current].some((key) =>
        key.startsWith('sheet:'),
      )
    ) {
      return false
    }
    const records = await fetchQuoteSheets()
    if (!records.length) return true
    const localOnly = stateRef.current.sheets.filter(
      (sheet) => !serverIdRef.current.has(sheet.id),
    )
    const serverSheets = records.map(toPriceSheet)
    serverIdRef.current = new Map(
      serverSheets.map((sheet) => [sheet.id, sheet.id] as const),
    )
    const next = [...serverSheets, ...localOnly]
    if (!next.length) return true
    mutate((current) => ({
      ...current,
      sheets: next,
      activeId: next.some((sheet) => sheet.id === current.activeId)
        ? current.activeId
        : next[0].id,
    }))
    return true
  }, [mutate])

  /** 拉取服务端项目配置覆盖本地; 有未保存改动时跳过(返回 false)。 */
  const refreshConfig = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (!projectId) return true
      if (
        configTimerRef.current !== null ||
        inflightRef.current.has(`config:${projectId}`) ||
        pendingRef.current.has(`config:${projectId}`)
      ) {
        return false
      }
      const record = await fetchQuoteProjectConfig(projectId)
      const fallbackBrands = stateRef.current.sheets.find(
        (sheet) => sheet.projectId === projectId && sheet.brands?.length,
      )?.brands
      const fresh = buildConfigFromRecord(record, fallbackBrands)
      mutate((current) => ({
        ...current,
        configs: { ...current.configs, [projectId]: fresh },
      }))
      return true
    },
    [mutate],
  )

  /** 聚焦/轮询/跨标签共用的刷新入口: 有未保存改动时轻提示。 */
  const refreshFromServer = useCallback(async () => {
    if (!token || !hydratedRef.current) return
    try {
      const sheetsFresh = await refreshSheets()
      const projectId =
        stateRef.current.sheets.find(
          (sheet) => sheet.id === stateRef.current.activeId,
        )?.projectId ?? ''
      const configFresh = projectId ? await refreshConfig(projectId) : true
      if (!sheetsFresh || !configFresh) {
        message.info({ content: STALE_NOTICE_TEXT, key: STALE_NOTICE_KEY })
      }
    } catch (error) {
      console.error('刷新比价数据失败', error)
    }
  }, [refreshConfig, refreshSheets, token])

  // 聚焦与每 30s 轮询: 无未保存改动时静默刷新, 否则轻提示避免覆盖本地编辑
  useEffect(() => {
    const onFocus = () => {
      void refreshFromServer()
    }
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(() => {
      void refreshFromServer()
    }, REFRESH_INTERVAL_MS)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [refreshFromServer])

  // 跨标签同步: 本标签保存成功后广播, 其他标签收到后按同一规则刷新
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    let channel: BroadcastChannel
    try {
      channel = new window.BroadcastChannel(SYNC_CHANNEL)
    } catch {
      return
    }
    syncChannelRef.current = channel
    channel.onmessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'saved') {
        void refreshFromServer()
      }
    }
    return () => {
      channel.onmessage = null
      channel.close()
      syncChannelRef.current = null
    }
  }, [refreshFromServer])

  // 初次加载: 拉取全部单据(服务端为唯一数据源)
  useEffect(() => {
    if (hydratedRef.current) return
    if (!token) {
      setLoading(false)
      return
    }
    hydratedRef.current = true
    const controller = new AbortController()
    fetchQuoteSheets(controller.signal)
      .then((records) => {
        if (!records.length) return
        const sheets = records.map(toPriceSheet)
        for (const sheet of sheets) serverIdRef.current.set(sheet.id, sheet.id)
        commit({
          sheets,
          activeId: sheets[0].id,
          configs: stateRef.current.configs,
        })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('加载比价单失败', error)
          message.error('加载比价单失败，请稍后重试')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [token, commit])

  const active = useMemo(
    () =>
      state.sheets.find((sheet) => sheet.id === state.activeId) ??
      state.sheets[0],
    [state.sheets, state.activeId],
  )
  const config = configOf(active?.projectId ?? '')

  // 切换项目时按需加载项目配置; 后端无品牌时用单据品牌兜底(保留运费)
  useEffect(() => {
    const projectId = active?.projectId
    if (!token || !projectId || state.configs[projectId]) return
    const controller = new AbortController()
    void (async () => {
      try {
        const record = await fetchQuoteProjectConfig(
          projectId,
          controller.signal,
        )
        apply((current) => {
          if (current.configs[projectId]) return current
          const sheetBrands = current.sheets.find(
            (sheet) => sheet.projectId === projectId && sheet.brands?.length,
          )?.brands
          const brands = record.brands.length
            ? record.brands.map((brand) => ({
                name: brand.brandName,
                freight: brand.freight,
                ...(brand.categories.length
                  ? { categories: brand.categories }
                  : {}),
              }))
            : (sheetBrands ?? []).map((brand) => ({
                name: brand.name,
                freight: brand.freight,
              }))
          return {
            ...current,
            configs: {
              ...current.configs,
              [projectId]: {
                brands,
                lengthPremium: record.lengthPremium,
                hrb400eFallback: record.hrb400eFallback,
                ...(record.products.length
                  ? { products: record.products }
                  : {}),
                ...(record.designatedBrands.length
                  ? { designatedBrands: record.designatedBrands }
                  : {}),
                ...(record.remark ? { remark: record.remark } : {}),
              },
            },
          }
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('加载比价配置失败', error)
        }
      }
    })()
    return () => controller.abort()
  }, [token, active?.projectId, state.configs, apply])

  const undo = useCallback(() => {
    const history = historyRef.current
    if (!history.past.length) return
    const target = history.past[history.past.length - 1]
    history.past = history.past.slice(0, -1)
    history.future = [stateRef.current, ...history.future].slice(
      0,
      HISTORY_LIMIT,
    )
    history.lastKey = ''
    stateRef.current = target
    setState(target)
    forceRender((version) => version + 1)
    for (const sheet of target.sheets) scheduleSaveSheet(sheet.id)
    if (target.activeId) {
      const projectId = target.sheets.find(
        (sheet) => sheet.id === target.activeId,
      )?.projectId
      if (projectId) scheduleSaveConfig(projectId)
    }
  }, [scheduleSaveSheet, scheduleSaveConfig])

  const redo = useCallback(() => {
    const history = historyRef.current
    if (!history.future.length) return
    const target = history.future[0]
    history.future = history.future.slice(1)
    history.past = [
      ...history.past.slice(-(HISTORY_LIMIT - 1)),
      stateRef.current,
    ]
    history.lastKey = ''
    stateRef.current = target
    setState(target)
    forceRender((version) => version + 1)
    for (const sheet of target.sheets) scheduleSaveSheet(sheet.id)
    if (target.activeId) {
      const projectId = target.sheets.find(
        (sheet) => sheet.id === target.activeId,
      )?.projectId
      if (projectId) scheduleSaveConfig(projectId)
    }
  }, [scheduleSaveSheet, scheduleSaveConfig])

  const setConfig = (patch: Partial<ProjectConfig>) => {
    const projectId = active?.projectId ?? ''
    if (!projectId) return
    apply((current) => {
      const prev = current.configs[projectId] ?? emptyConfig()
      return {
        ...current,
        configs: { ...current.configs, [projectId]: { ...prev, ...patch } },
      }
    })
    scheduleSaveConfig(projectId)
  }

  const setBrands = (value: Brand[] | ((current: Brand[]) => Brand[])) => {
    const projectId = active?.projectId ?? ''
    if (!projectId) return
    apply((current) => {
      const prev = current.configs[projectId] ?? emptyConfig()
      const brands = typeof value === 'function' ? value(prev.brands) : value
      return {
        ...current,
        configs: { ...current.configs, [projectId]: { ...prev, brands } },
      }
    })
    scheduleSaveConfig(projectId)
  }

  const updateActiveRows = (updater: (rows: PriceRow[]) => PriceRow[]) => {
    const activeId = stateRef.current.activeId
    apply((current) => ({
      ...current,
      sheets: current.sheets.map((sheet) =>
        sheet.id === activeId ? { ...sheet, rows: updater(sheet.rows) } : sheet,
      ),
    }))
    scheduleSaveSheet(activeId)
  }

  const setActiveId = (id: string) =>
    setState((current) => ({ ...current, activeId: id }))

  const patchSheet = (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) => {
    apply(
      (current) => ({
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.id === id ? { ...sheet, ...patch } : sheet,
        ),
      }),
      coalesceKey,
    )
    scheduleSaveSheet(id)
  }

  const addSheet = (
    projectId: string,
    projectName: string,
    orderDate: string,
    refDate: string,
    refPeriod: string,
  ) => {
    const count =
      stateRef.current.sheets.filter((sheet) => sheet.projectId === projectId)
        .length + 1
    const sheet = makeSheet(
      `批次 ${count}`,
      projectId,
      projectName,
      orderDate || new Date().toISOString().slice(0, 10),
      refDate,
      refPeriod,
    )
    apply((current) => ({
      ...current,
      sheets: [...current.sheets, sheet],
      activeId: sheet.id,
    }))
    scheduleSaveSheet(sheet.id)
  }

  const assignProjectToUnassigned = (projectId: string, projectName: string) =>
    apply((current) => {
      if (!projectId || !current.sheets.some((sheet) => !sheet.projectId))
        return current
      return {
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.projectId ? sheet : { ...sheet, projectId, projectName },
        ),
      }
    })

  const removeSheet = (id: string) => {
    const serverId = serverIdRef.current.get(id)
    serverIdRef.current.delete(id)
    apply((current) => {
      const next = current.sheets.filter((sheet) => sheet.id !== id)
      if (!next.length) return current
      return {
        ...current,
        sheets: next,
        activeId:
          id === current.activeId ? next[next.length - 1].id : current.activeId,
      }
    })
    if (serverId) {
      void deleteQuoteSheet(serverId).catch((error) => {
        console.error('删除比价单失败', error)
        message.error('删除比价单失败，请稍后重试')
      })
    }
  }

  return {
    loading,
    sheets: state.sheets,
    activeId: state.activeId,
    active,
    rows: active?.rows ?? [],
    conflict,
    config,
    setConfig,
    setBrands,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
    undo,
    redo,
    setRows: updateActiveRows,
    setActiveId,
    patchSheet,
    addSheet,
    assignProjectToUnassigned,
    removeSheet,
  }
}

/** 服务端记录 -> 本地单据(行 id 用服务端 item id, 保证重新加载后稳定)。 */
function toPriceSheet(record: QuoteSheetRecord): PriceSheet {
  const rows: PriceRow[] = record.items.map((item) => ({
    id: item.id,
    category: item.category,
    material: item.material,
    spec: item.spec ?? null,
    length: item.length,
    ...(item.ton !== undefined ? { ton: item.ton } : {}),
  }))
  const inputs: SheetInputs = {}
  for (const item of record.items) {
    for (const price of item.prices) {
      const entry: SheetInput = {}
      if (price.spotPrice !== undefined) entry.spot = price.spotPrice
      if (price.supplierId) entry.supplierId = price.supplierId
      if (price.supplierName) entry.supplierName = price.supplierName
      if (Object.keys(entry).length > 0) {
        inputs[`${price.brandName}:${item.id}`] = entry
      }
    }
  }
  return {
    id: record.id,
    name: record.name,
    status: record.status ?? '报价',
    projectId: record.projectId ?? '',
    projectName: record.projectName ?? '',
    orderDate: record.orderDate,
    refDate: record.refDate,
    refPeriod: record.refPeriod,
    locked: record.locked,
    lengthPremium: record.lengthPremium,
    inputs,
    rows,
    brands: record.brands.map((brand) => ({
      name: brand.brandName,
      freight: brand.freight,
    })),
    ...(record.remark ? { remark: record.remark } : {}),
    ...(record.version ? { version: record.version } : {}),
  }
}
