import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readRequestError } from '@/api/core/request-errors'
import {
  acquireQuoteSheetEditLock,
  fetchQuoteSheetEditLock,
  releaseQuoteSheetEditLock,
} from '@/api/market/quote-edit-locks'
import {
  fetchQuoteProjectConfig,
  type QuoteProjectConfigPayload,
  type QuoteProjectConfigRecord,
  saveQuoteProjectConfig,
} from '@/api/market/quote-project-configs'
import {
  addQuoteSheetItem,
  createQuoteSheet,
  deleteQuoteSheet,
  deleteQuoteSheetItem,
  fetchQuoteSheet,
  fetchQuoteSheets,
  type QuoteSheetHeaderPayload,
  type QuoteSheetItemPayload,
  type QuoteSheetPayload,
  type QuoteSheetRecord,
  updateQuoteSheet,
  updateQuoteSheetHeader,
  updateQuoteSheetItem,
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
/** 编辑锁续约间隔(页面可见时)。 */
const EDIT_LOCK_RENEW_MS = 60_000
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

/** 表头保存请求体(不含 brands/items)。 */
function buildHeaderPayload(sheet: PriceSheet): QuoteSheetHeaderPayload {
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
  }
}

/** 单行整行替换请求体; 商品信息不完整时返回 null。 */
function buildItemPayload(
  sheet: PriceSheet,
  row: PriceRow,
  brands: Brand[],
): QuoteSheetItemPayload | null {
  if (!isCompleteRow(row)) return null
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
  return {
    category: row.category,
    material: row.material,
    spec: Number(row.spec),
    length: row.length,
    ...(row.ton !== undefined ? { ton: row.ton } : {}),
    prices,
  }
}

/** 表头指纹: 与服务端快照比较, 判断是否需要发头 PUT。 */
function headerSignature(sheet: PriceSheet): string {
  return JSON.stringify(buildHeaderPayload(sheet))
}

/** 行指纹: 商品字段/吨位/现货价/供应商任一变化即不同。 */
function itemSignature(row: PriceRow, inputs: SheetInputs): string {
  const suffix = `:${row.id}`
  const prices = Object.keys(inputs)
    .filter((key) => key.endsWith(suffix))
    .sort()
    .map((key) => [key, inputs[key] ?? {}])
  return JSON.stringify({
    category: row.category,
    material: row.material,
    spec: row.spec,
    length: row.length,
    ton: row.ton ?? null,
    prices,
  })
}

type SheetBaseline = { header: string; items: Map<string, string> }

/** 由服务端已保存单据构建基线(用于行级差异比对)。 */
function buildBaseline(sheet: PriceSheet): SheetBaseline {
  const items = new Map<string, string>()
  for (const row of sheet.rows) {
    items.set(row.id, itemSignature(row, sheet.inputs))
  }
  return { header: headerSignature(sheet), items }
}

/** 乐观版本自增: 行级写每次使单据 @Version +1。 */
function bumpVersion(version: string | undefined): string | undefined {
  if (!version) return undefined
  const parsed = Number(version)
  return Number.isFinite(parsed) ? String(parsed + 1) : version
}

/** 把 inputs 中指向某行的键从 fromId 迁移到 toId。 */
function remapInputKeys(
  inputs: SheetInputs,
  fromId: string,
  toId: string,
): SheetInputs {
  const next: SheetInputs = {}
  for (const [key, value] of Object.entries(inputs)) {
    next[
      key.endsWith(`:${fromId}`)
        ? `${key.slice(0, -fromId.length)}${toId}`
        : key
    ] = value
  }
  return next
}

/** 乐观并发冲突: 单据头/项目配置/某商品行。 */
export type SheetsConflict = {
  kind: 'sheet' | 'config' | 'item'
  id: string
  itemId?: string
}

/** 当前批次编辑签出状态(供 UI 呈现与只读控制)。 */
export type EditLockView = {
  sheetId: string
  locked: boolean
  mine: boolean
  ownerName?: string
}

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
  /** 当前批次编辑签出状态; null 表示未签出/降级可编辑 */
  editLock: EditLockView | null
  /** 当前批次是否只读(被他人签出) */
  readOnly: boolean
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
  /** 签出当前批次编辑锁并启动续约; 返回是否成功取得编辑权 */
  acquireEditLock: (id?: string) => Promise<boolean>
  /** 释放批次编辑锁 */
  releaseEditLock: (id?: string) => Promise<void>
  /** 抢占已被他人签出(可能已过期)的批次 */
  takeoverEditLock: (id?: string) => void
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
  /** 服务端快照基线: 本地单据 id -> 表头/行指纹, 用于行级差异保存。 */
  const baselineRef = useRef<Map<string, SheetBaseline>>(new Map())
  const [editLock, setEditLock] = useState<EditLockView | null>(null)
  /** 已签出批次的服务端 id 与续约定时器。 */
  const heldLockRef = useRef<{ sheetId: string; timer: number } | null>(null)
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
  const handleConflict = useCallback(
    (kind: 'sheet' | 'config' | 'item', id: string, itemId?: string) => {
      setConflict({ kind, id, ...(itemId ? { itemId } : {}) })
      const scopeText =
        kind === 'config' ? '项目配置' : kind === 'item' ? '某商品行' : '表头'
      modal.confirm({
        title: CONFLICT_TITLE,
        content: `${scopeText}：${CONFLICT_CONTENT}`,
        okText: CONFLICT_OVERWRITE_TEXT,
        cancelText: CONFLICT_RELOAD_TEXT,
        closable: false,
        maskClosable: false,
        onOk: async () => {
          setConflict(null)
          if (kind === 'config') await overrideConfigRef.current(id)
          else await overrideSheetRef.current(id)
        },
        onCancel: async () => {
          setConflict(null)
          if (kind === 'config') await reloadConfigRef.current(id)
          else await reloadSheetRef.current(id)
        },
      })
    },
    [],
  )

  /** 重新加载(丢弃本地改动): 拉取服务端最新覆盖本地。 */
  const reloadSheet = useCallback(
    async (sheetId: string) => {
      try {
        const serverId = serverIdRef.current.get(sheetId) ?? sheetId
        const record = await fetchQuoteSheet(serverId)
        serverIdRef.current.set(sheetId, record.id)
        const fresh: PriceSheet = { ...toPriceSheet(record), id: sheetId }
        baselineRef.current.set(sheetId, buildBaseline(fresh))
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
        baselineRef.current.set(
          sheetId,
          buildBaseline({ ...sheet, version: saved.version ?? sheet.version }),
        )
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

  /** 新增行拿到服务端 id 后, 把本地行 id 与 inputs 键迁移到服务端 id。 */
  const remapItemId = useCallback(
    (sheetId: string, fromId: string, toId: string) => {
      mutate((current) => ({
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.id === sheetId
            ? {
                ...sheet,
                rows: sheet.rows.map((row) =>
                  row.id === fromId ? { ...row, id: toId } : row,
                ),
                inputs: remapInputKeys(sheet.inputs, fromId, toId),
              }
            : sheet,
        ),
      }))
    },
    [mutate],
  )

  const saveSheetNow = useCallback(
    async (sheetId: string) => {
      await runSerialized(`sheet:${sheetId}`, async () => {
        const sheet = stateRef.current.sheets.find(
          (item) => item.id === sheetId,
        )
        if (!sheet) return
        const config = configOf(sheet.projectId)
        const serverId = serverIdRef.current.get(sheet.id)
        const fail = (error: unknown, fallback: string) =>
          message.error(
            error instanceof Error ? `${fallback}：${error.message}` : fallback,
          )

        if (!serverId) {
          const created = buildPayload(sheet, config)
          if (!created) return
          try {
            const saved = await createQuoteSheet(created)
            serverIdRef.current.set(sheet.id, saved.id)
            applySheetVersion(sheet.id, saved.version)
            baselineRef.current.set(
              sheet.id,
              buildBaseline({
                ...sheet,
                version: saved.version ?? sheet.version,
              }),
            )
            broadcastSaved()
          } catch (error) {
            fail(error, '保存比价单失败')
          }
          return
        }

        let version = sheet.version
        const baseline =
          baselineRef.current.get(sheet.id) ?? buildBaseline(sheet)

        if (headerSignature(sheet) !== baseline.header) {
          try {
            const saved = await updateQuoteSheetHeader(
              serverId,
              buildHeaderPayload(sheet),
              version,
            )
            version = saved.version ?? version
            applySheetVersion(sheet.id, version)
            baseline.header = headerSignature(sheet)
          } catch (error) {
            if (isConflictError(error)) {
              handleConflict('sheet', sheetId)
              return
            }
            fail(error, '保存比价单表头失败')
            return
          }
        }

        const currentRowIds = new Set(sheet.rows.map((row) => row.id))
        for (const itemId of [...baseline.items.keys()]) {
          if (currentRowIds.has(itemId)) continue
          try {
            await deleteQuoteSheetItem(serverId, itemId, version)
            version = bumpVersion(version)
            baseline.items.delete(itemId)
            applySheetVersion(sheet.id, version)
          } catch (error) {
            if (isConflictError(error)) {
              handleConflict('item', sheetId, itemId)
              return
            }
            fail(error, '删除商品行失败')
            return
          }
        }

        for (const row of sheet.rows) {
          const payload = buildItemPayload(sheet, row, config.brands)
          if (!payload) continue
          const signature = itemSignature(row, sheet.inputs)
          const known = baseline.items.has(row.id)
          if (known && baseline.items.get(row.id) === signature) continue
          try {
            if (known) {
              await updateQuoteSheetItem(serverId, row.id, payload, version)
              baseline.items.set(row.id, signature)
            } else {
              const created = await addQuoteSheetItem(
                serverId,
                payload,
                version,
              )
              const remappedRow = { ...row, id: created.id }
              const remappedInputs = remapInputKeys(
                sheet.inputs,
                row.id,
                created.id,
              )
              remapItemId(sheetId, row.id, created.id)
              baseline.items.set(
                created.id,
                itemSignature(remappedRow, remappedInputs),
              )
            }
            version = bumpVersion(version)
            applySheetVersion(sheet.id, version)
          } catch (error) {
            if (isConflictError(error)) {
              handleConflict('item', sheetId, row.id)
              return
            }
            fail(error, '保存商品行失败')
            return
          }
        }
        broadcastSaved()
      })
    },
    [
      applySheetVersion,
      broadcastSaved,
      configOf,
      handleConflict,
      remapItemId,
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
    for (const sheet of serverSheets) {
      baselineRef.current.set(sheet.id, buildBaseline(sheet))
    }
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
        for (const sheet of sheets) {
          serverIdRef.current.set(sheet.id, sheet.id)
          baselineRef.current.set(sheet.id, buildBaseline(sheet))
        }
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

  const clearHeldLockTimer = useCallback(() => {
    const held = heldLockRef.current
    if (held) {
      window.clearInterval(held.timer)
      heldLockRef.current = null
    }
  }, [])

  const applyLockState = useCallback(
    (sheetId: string, lock: { mine: boolean; ownerName?: string } | null) => {
      setEditLock(
        lock
          ? {
              sheetId,
              locked: true,
              mine: lock.mine,
              ...(lock.ownerName ? { ownerName: lock.ownerName } : {}),
            }
          : null,
      )
    },
    [],
  )

  const releaseEditLock = useCallback(
    async (id?: string) => {
      const target =
        id ?? heldLockRef.current?.sheetId ?? stateRef.current.activeId
      const serverId = serverIdRef.current.get(target)
      clearHeldLockTimer()
      setEditLock((current) =>
        current && current.sheetId === target ? null : current,
      )
      if (!serverId) return
      try {
        await releaseQuoteSheetEditLock(serverId)
      } catch (error) {
        if (!isConflictError(error)) console.error('释放编辑锁失败', error)
      }
    },
    [clearHeldLockTimer],
  )

  const acquireEditLock = useCallback(
    async (id?: string): Promise<boolean> => {
      const target = id ?? stateRef.current.activeId
      const serverId = serverIdRef.current.get(target)
      // 尚未落库或锁接口失败: 降级为可编辑, 不阻断
      if (!serverId) return true
      try {
        const lock = await acquireQuoteSheetEditLock(serverId)
        applyLockState(target, {
          mine: lock.mine,
          ...(lock.ownerName ? { ownerName: lock.ownerName } : {}),
        })
        clearHeldLockTimer()
        const timer = window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            void acquireEditLockRef.current(target)
          }
        }, EDIT_LOCK_RENEW_MS)
        heldLockRef.current = { sheetId: target, timer }
        return lock.mine
      } catch (error) {
        if (isConflictError(error)) {
          let ownerName: string | undefined
          try {
            const current = await fetchQuoteSheetEditLock(serverId)
            ownerName = current.ownerName
          } catch {
            ownerName = undefined
          }
          applyLockState(target, {
            mine: false,
            ...(ownerName ? { ownerName } : {}),
          })
          return false
        }
        setEditLock((current) =>
          current && current.sheetId === target ? null : current,
        )
        return true
      }
    },
    [applyLockState, clearHeldLockTimer],
  )

  const acquireEditLockRef = useRef(acquireEditLock)
  useEffect(() => {
    acquireEditLockRef.current = acquireEditLock
  }, [acquireEditLock])

  const takeoverEditLock = useCallback((id?: string) => {
    const target = id ?? stateRef.current.activeId
    modal.confirm({
      title: '申请接管批次',
      content:
        '接管将取得该批次编辑权；若对方仍在编辑会再次冲突，请等待其签出过期后重试。',
      okText: '强制接管',
      cancelText: '取消',
      onOk: async () => {
        const acquired = await acquireEditLockRef.current(target)
        if (!acquired) message.warning('对方仍在编辑该批次，请稍后再试')
      },
    })
  }, [])

  // 切换批次: 释放上一批次锁并签出新批次
  const lockedActiveRef = useRef<string | null>(null)
  useEffect(() => {
    if (loading) return
    if (!token || !hydratedRef.current) return
    const target = state.activeId
    if (!target || lockedActiveRef.current === target) return
    // 等待单据落库(拿到服务端 id)后再签出
    if (!serverIdRef.current.get(target)) return
    const previous = lockedActiveRef.current
    lockedActiveRef.current = target
    if (previous) void releaseEditLock(previous)
    void acquireEditLock(target)
  }, [state.activeId, token, loading, acquireEditLock, releaseEditLock])

  // 卸载: 释放当前批次锁
  useEffect(
    () => () => {
      const held = heldLockRef.current
      if (!held) return
      window.clearInterval(held.timer)
      const serverId = serverIdRef.current.get(held.sheetId)
      if (serverId) void releaseQuoteSheetEditLock(serverId).catch(() => {})
      heldLockRef.current = null
    },
    [],
  )

  const active = useMemo(
    () =>
      state.sheets.find((sheet) => sheet.id === state.activeId) ??
      state.sheets[0],
    [state.sheets, state.activeId],
  )
  const config = configOf(active?.projectId ?? '')
  const activeLock =
    editLock && editLock.sheetId === state.activeId ? editLock : null
  const readOnly = Boolean(activeLock && activeLock.locked && !activeLock.mine)
  const readOnlyRef = useRef(false)
  useEffect(() => {
    readOnlyRef.current = readOnly
  }, [readOnly])

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
    if (readOnlyRef.current) return
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
    if (readOnlyRef.current && id === stateRef.current.activeId) return
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
    editLock: activeLock,
    readOnly,
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
    acquireEditLock,
    releaseEditLock,
    takeoverEditLock,
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
