import dayjs from 'dayjs'
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
import { DEFAULT_LENGTH_PREMIUM, isSeparatorRow, makeSheet } from './core'
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
/** 版本不匹配: 412 Precondition Failed。 */
const VERSION_CONFLICT_STATUS = 412
const VERSION_CONFLICT_CODE = 4120
/** 缺少版本前置条件: 428 Precondition Required(需要带版本重试)。 */
const PRECONDITION_REQUIRED_STATUS = 428
const PRECONDITION_REQUIRED_CODE = 4280
/** 他人签出锁冲突: 409 Conflict。 */
const LOCK_CONFLICT_STATUS = 409
const LOCK_CONFLICT_CODE = 4090

const CONFLICT_TITLE = '单据版本已变更'
const CONFLICT_CONTENT =
  '服务器上的内容已被其他设备更新，请选择处理方式。重新加载将丢弃本地改动，以我的覆盖将用当前内容覆盖服务器。'
const CONFLICT_OVERWRITE_TEXT = '以我的覆盖'
const CONFLICT_RELOAD_TEXT = '重新加载（丢弃我的改动）'
/** 覆盖重试后仍冲突时的提示文案(保留同一弹窗)。 */
const CONFLICT_RETRY_TEXT = '仍在被修改，请稍后重试'
/** "以我的覆盖"最多尝试次数(含首次), 避免无限连环冲突。 */
const OVERRIDE_MAX_ATTEMPTS = 2
const STALE_NOTICE_TEXT = '服务器有更新，保存后请刷新'
/** 他人签出锁冲突提示(与版本冲突文案区分)。 */
const LOCK_CONFLICT_TEXT = '单据已被他人签出编辑，请稍后重试或申请接管'

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

/** 版本冲突: 412/4120(版本已变更) 或 428/4280(缺少版本前置条件)。 */
function isVersionConflict(error: unknown): boolean {
  const { status, code } = readRequestError(error)
  return (
    status === VERSION_CONFLICT_STATUS ||
    status === PRECONDITION_REQUIRED_STATUS ||
    code === VERSION_CONFLICT_CODE ||
    code === PRECONDITION_REQUIRED_CODE
  )
}

/** 签出锁冲突: 409 / 4090(单据被他人签出)。 */
function isLockConflict(error: unknown): boolean {
  const { status, code } = readRequestError(error)
  return status === LOCK_CONFLICT_STATUS || code === LOCK_CONFLICT_CODE
}

/** 服务端冲突(版本或签出锁)。 */
function isConflictError(error: unknown): boolean {
  return isVersionConflict(error) || isLockConflict(error)
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
    version: record.version,
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
  version: '0',
})

/** 行是否具备完整商品信息(商品行后端要求 category/material/spec/length 非空)。 */
function isCompleteRow(row: PriceRow): boolean {
  return Boolean(row.category && row.material && row.spec && row.length)
}

/** 行是否可落库: 隔断行总是可落库, 商品行需商品信息完整。 */
function isPersistableRow(row: PriceRow): boolean {
  return isSeparatorRow(row) || isCompleteRow(row)
}

/**
 * 刷新合并行: 不完整商品行(未选商品的空行)不落库, 刷新时按本地位次保留;
 * 其余行(完整商品行与隔断行)以服务端为准(其他设备新增的行追加到末尾, 已删除的行丢弃)。
 *
 * 以本地绝对下标把不完整行插回服务端行列表: 兼容"本地新建单据的本地行 id 尚未
 * 与服务端对齐"的场景, 也能保持其相对完整行的原始位置。
 */
function mergeRowsPreservingIncomplete(
  localRows: PriceRow[],
  serverRows: PriceRow[],
): PriceRow[] {
  const merged = [...serverRows]
  const emptyRows: { row: PriceRow; index: number }[] = []
  localRows.forEach((row, index) => {
    if (!isSeparatorRow(row) && !isCompleteRow(row))
      emptyRows.push({ row, index })
  })
  // 从后往前插入, 保证前面的插入不影响后面记录的下标
  for (let i = emptyRows.length - 1; i >= 0; i -= 1) {
    const { row, index } = emptyRows[i]
    merged.splice(Math.min(index, merged.length), 0, row)
  }
  return merged
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
    specQuantityLocked: Boolean(sheet.specQuantityLocked),
    ...(sheet.projectId ? { projectId: sheet.projectId } : {}),
    ...(sheet.projectName ? { projectName: sheet.projectName } : {}),
    ...(sheet.status ? { status: sheet.status } : {}),
    ...(sheet.remark ? { remark: sheet.remark } : {}),
    brands: brands.map((brand, index) => ({
      brandName: brand.name,
      freight: brand.freight,
      sortOrder: index,
    })),
    items: sheet.rows.flatMap<QuoteSheetPayload['items'][number]>((row) => {
      if (!isPersistableRow(row)) return []
      if (isSeparatorRow(row)) return [{ rowType: 'SEPARATOR', prices: [] }]
      const prices = brands.flatMap<
        QuoteSheetPayload['items'][number]['prices'][number]
      >((brand) => {
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
          rowType: 'PRODUCT',
          category: row.category,
          material: row.material,
          spec: Number(row.spec),
          length: row.length,
          ...(row.ton !== undefined ? { ton: row.ton } : {}),
          ...(row.remark ? { remark: row.remark } : {}),
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
    specQuantityLocked: Boolean(sheet.specQuantityLocked),
    ...(sheet.projectId ? { projectId: sheet.projectId } : {}),
    ...(sheet.projectName ? { projectName: sheet.projectName } : {}),
    ...(sheet.status ? { status: sheet.status } : {}),
    ...(sheet.remark ? { remark: sheet.remark } : {}),
  }
}

/** 单行整行替换请求体; 商品行信息不完整且非隔断行时返回 null。 */
function buildItemPayload(
  sheet: PriceSheet,
  row: PriceRow,
  brands: Brand[],
): QuoteSheetItemPayload | null {
  if (isSeparatorRow(row)) return { rowType: 'SEPARATOR', prices: [] }
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
    rowType: 'PRODUCT',
    category: row.category,
    material: row.material,
    spec: Number(row.spec),
    length: row.length,
    ...(row.ton !== undefined ? { ton: row.ton } : {}),
    ...(row.remark ? { remark: row.remark } : {}),
    prices,
  }
}

/** 表头指纹: 与服务端快照比较, 判断是否需要发头 PUT。 */
function headerSignature(sheet: PriceSheet): string {
  return JSON.stringify(buildHeaderPayload(sheet))
}

/** 行指纹: 行类型/商品字段/吨位/现货价/供应商任一变化即不同。 */
function itemSignature(row: PriceRow, inputs: SheetInputs): string {
  const suffix = `:${row.id}`
  const prices = Object.keys(inputs)
    .filter((key) => key.endsWith(suffix))
    .sort()
    .map((key) => [key, inputs[key] ?? {}])
  return JSON.stringify({
    rowType: row.rowType ?? 'PRODUCT',
    category: row.category,
    material: row.material,
    spec: row.spec,
    length: row.length,
    ton: row.ton ?? null,
    remark: row.remark ?? '',
    prices,
  })
}

type SheetBaseline = { header: string; items: Map<string, string> }

/** 单据内容指纹: 用于刷新时判断服务端内容是否已不同于本地待保存编辑。 */
function sheetContentFingerprint(sheet: PriceSheet): string {
  return JSON.stringify({
    name: sheet.name,
    status: sheet.status,
    projectId: sheet.projectId,
    projectName: sheet.projectName,
    orderDate: sheet.orderDate,
    refDate: sheet.refDate,
    refPeriod: sheet.refPeriod,
    locked: Boolean(sheet.locked),
    specQuantityLocked: Boolean(sheet.specQuantityLocked),
    lengthPremium: sheet.lengthPremium,
    remark: sheet.remark ?? '',
    rows: sheet.rows,
    inputs: sheet.inputs,
  })
}

/** 由服务端已保存单据构建基线(用于行级差异比对)。 */
function buildBaseline(sheet: PriceSheet): SheetBaseline {
  const items = new Map<string, string>()
  for (const row of sheet.rows) {
    items.set(row.id, itemSignature(row, sheet.inputs))
  }
  return { header: headerSignature(sheet), items }
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

/** 冲突资源键: 表头与商品行同属一个单据资源, 项目配置独立。 */
function conflictResourceKey(kind: SheetsConflict['kind'], id: string): string {
  return kind === 'config' ? `config:${id}` : `sheet:${id}`
}

/** 覆盖保存结果: 成功/仍冲突/其他失败/无可保存内容。 */
type ConflictResolution = 'ok' | 'conflict' | 'error' | 'skipped'

/** 冲突弹窗实例(antd confirm 返回值), 用于更新文案或销毁。 */
type ConflictModalInstance = {
  update?: (config: Record<string, unknown>) => void
  destroy?: () => void
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
  /** 当前项目配置是否已从服务端加载(未加载时不应自动回填品牌) */
  configLoaded: boolean
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

/** 当前激活单据是否锁定了规格和数量(锁定期间禁止撤销/重做规格与吨位)。 */
function activeSheetSpecQuantityLocked(snapshot: Snapshot): boolean {
  const activeSheet = snapshot.sheets.find(
    (sheet) => sheet.id === snapshot.activeId,
  )
  return Boolean(activeSheet?.specQuantityLocked)
}

/** 多单据状态: 服务端为数据源, 本地乐观更新 + 防抖自动保存; 支持撤销/重做。 */
export function useSheetsStore(options?: {
  /**
   * 视图当前是否停留在 /price-compare 路由。
   * keep-alive 多标签架构下切走 Tab 不卸载视图, 由调用方依据路由/标签状态传入,
   * 离开时立即释放编辑锁并停止续约, 返回时重新签出; 默认 true 保持既有行为。
   */
  routeActive?: boolean
}): SheetsStore {
  const routeActive = options?.routeActive ?? true
  /** 最新路由活跃态: 供 create 成功等非渲染路径判断是否需要补签出。 */
  const routeActiveRef = useRef(routeActive)
  useEffect(() => {
    routeActiveRef.current = routeActive
  }, [routeActive])
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
  /** 本地数据版本指纹: 每次提交/静默写入自增, 用于刷新期间检测新增编辑。 */
  const dataRevisionRef = useRef(0)
  const sheetTimersRef = useRef<Map<string, number>>(new Map())
  const configTimerRef = useRef<number | null>(null)
  const hydratedRef = useRef(false)
  /**
   * 已完成服务端加载的项目配置: projectId 集合。
   * 未加载完成时 `configOf` 会回退 `emptyConfig()`(brands 为空), 此时保存单据会把
   * 行级 `prices` 变成 `[]`, 后端 `applyItem` 会清空现货价/供应商, 造成数据丢失。
   * 守卫条件: 单据带 projectId 且该项目不在集合内时, 跳过本次保存。
   */
  const configLoadedRef = useRef<Set<string>>(new Set())
  /**
   * 因项目配置未加载而跳过的待保存单据 id -> 跳过时所属项目 id。
   * 配置加载完成后按项目补跑一次; 单据删除或改项目时清理, 避免刷新被永久关闭。
   */
  const configBlockedSaveRef = useRef<Map<string, string>>(new Map())
  /**
   * 保存失败或行不完整被跳过后仍待保存的单据 id。
   * 纳入 `hasPendingSheetSave`, 刷新时按内容指纹比对, 避免静默回滚本地编辑。
   */
  const dirtySheetsRef = useRef<Set<string>>(new Set())
  /** 同一资源(单据/项目配置)串行保存, 避免并发 PUT 触发乐观锁 409。 */
  const inflightRef = useRef<Set<string>>(new Set())
  const pendingRef = useRef<Set<string>>(new Set())
  const [conflict, setConflict] = useState<SheetsConflict | null>(null)
  /** 当前弹窗中的冲突(带资源键), 非空时不再新建弹窗。 */
  const activeConflictRef = useRef<(SheetsConflict & { key: string }) | null>(
    null,
  )
  /** 其他资源的待处理冲突队列(同一资源去重), 逐个弹窗而非叠加。 */
  const conflictQueueRef = useRef<SheetsConflict[]>([])
  /** 唯一冲突弹窗实例, 用于更新文案或关闭。 */
  const conflictModalRef = useRef<ConflictModalInstance | null>(null)
  /** 项目配置防抖 timer 对应的项目 id(仅单 timer)。 */
  const configTimerProjectRef = useRef<string | null>(null)
  /** 打开/收敛冲突弹窗的稳定引用, 供内部互调。 */
  const openConflictRef = useRef<(conflict: SheetsConflict) => void>(() => {})
  const settleConflictRef = useRef<(key: string) => void>(() => {})
  /** 服务端快照基线: 本地单据 id -> 表头/行指纹, 用于行级差异保存。 */
  const baselineRef = useRef<Map<string, SheetBaseline>>(new Map())
  const [editLock, setEditLock] = useState<EditLockView | null>(null)
  /** 已签出批次的服务端 id 与续约定时器(键统一用映射后的 serverId)。 */
  const heldLockRef = useRef<{ sheetId: string; timer: number } | null>(null)
  /** 当前已签出(或已发起签出)批次的服务端 id, 用于切换检测。 */
  const lockedActiveRef = useRef<string | null>(null)
  /** 组件是否已卸载: 阻断飞行中锁请求回写状态或建立续约定时器。 */
  const disposedRef = useRef(false)
  /**
   * 每个服务端单据 id 的锁请求代次: 释放/切走/删除时自增。
   * 飞行中的签出响应回到本地时若代次已变化, 说明目标已失效, 丢弃结果并归还锁。
   */
  const lockRequestGenRef = useRef<Map<string, number>>(new Map())
  /**
   * 同一 serverId 的锁网络操作串行链: 签出/释放严格按入队顺序执行。
   * 否则快速"切走→切回"时后发的 POST 可能先于先发的 DELETE 到达服务端,
   * 导致刚签出的锁被释放请求删除。空闲时同步发起, 保持调用时序。
   */
  const lockOpQueueRef = useRef<Map<string, Promise<void>>>(new Map())
  const syncChannelRef = useRef<BroadcastChannel | null>(null)
  const reloadSheetRef = useRef<(sheetId: string) => Promise<void>>(
    async () => {},
  )
  const overrideSheetRef = useRef<
    (sheetId: string) => Promise<ConflictResolution>
  >(() => Promise.resolve('skipped'))
  const reloadConfigRef = useRef<(projectId: string) => Promise<void>>(
    async () => {},
  )
  const overrideConfigRef = useRef<
    (projectId: string) => Promise<ConflictResolution>
  >(() => Promise.resolve('skipped'))
  /** 保存遇到他人签出锁冲突时的处理(刷新锁状态并提示)。 */
  const handleLockConflictRef = useRef<(sheetId: string) => void>(() => {})
  /** 最新 acquireEditLock, 供 create 成功等非渲染路径触发签出。 */
  const acquireEditLockRef = useRef<
    (id?: string, options?: { force?: boolean }) => Promise<boolean>
  >(() => Promise.resolve(true))

  const runSerialized = useCallback(
    (key: string, task: () => Promise<void>) =>
      runSerializedTask(inflightRef.current, pendingRef.current, key, task),
    [],
  )

  /** 静默写入状态(不进入撤销/重做历史), 用于回填服务端版本与刷新。 */
  const mutate = useCallback((updater: (current: Snapshot) => Snapshot) => {
    const next = updater(stateRef.current)
    if (next === stateRef.current) return
    dataRevisionRef.current += 1
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
    dataRevisionRef.current += 1
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

  /** 最新 scheduleSaveSheet, 供配置加载完成后的补跑使用(避免声明顺序依赖)。 */
  const scheduleSaveSheetRef = useRef<(sheetId: string) => void>(() => {})

  /**
   * 项目配置加载完成后, 补跑此前因配置未就绪而跳过的单据保存。
   * 与 scheduleSaveSheet 通过 ref 解耦, 便于在更早的回调中引用。
   */
  const flushBlockedSaves = useCallback((projectId: string) => {
    if (!projectId) return
    const projectIdBySheet = new Map(
      stateRef.current.sheets.map((sheet) => [sheet.id, sheet.projectId]),
    )
    for (const [sheetId, blockedProjectId] of [
      ...configBlockedSaveRef.current,
    ]) {
      const currentProjectId = projectIdBySheet.get(sheetId)
      // 单据已删除或已换项目: 该补跑已无意义, 直接清理, 否则会永久关闭刷新
      if (
        currentProjectId === undefined ||
        currentProjectId !== blockedProjectId
      ) {
        configBlockedSaveRef.current.delete(sheetId)
        continue
      }
      if (blockedProjectId !== projectId) continue
      configBlockedSaveRef.current.delete(sheetId)
      scheduleSaveSheetRef.current(sheetId)
    }
  }, [])

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

  /** 冲突时取消该资源的待执行保存: 清理防抖 timer 与串行排队项。 */
  const cancelPendingSave = useCallback((key: string) => {
    if (key.startsWith('sheet:')) {
      const sheetId = key.slice('sheet:'.length)
      const timer = sheetTimersRef.current.get(sheetId)
      if (timer !== undefined) {
        window.clearTimeout(timer)
        sheetTimersRef.current.delete(sheetId)
      }
    } else if (key.startsWith('config:')) {
      const projectId = key.slice('config:'.length)
      if (
        configTimerProjectRef.current === projectId &&
        configTimerRef.current !== null
      ) {
        window.clearTimeout(configTimerRef.current)
        configTimerRef.current = null
        configTimerProjectRef.current = null
      }
    }
    pendingRef.current.delete(key)
  }, [])

  /** 打开唯一冲突弹窗; 同一时刻只会存在一个 modal。 */
  const openConflict = useCallback(
    (target: SheetsConflict) => {
      const key = conflictResourceKey(target.kind, target.id)
      cancelPendingSave(key)
      activeConflictRef.current = { ...target, key }
      setConflict(target)
      const scopeText =
        target.kind === 'config'
          ? '项目配置'
          : target.kind === 'item'
            ? '某商品行'
            : '表头'
      const instance = modal.confirm({
        title: CONFLICT_TITLE,
        content: `${scopeText}：${CONFLICT_CONTENT}`,
        okText: CONFLICT_OVERWRITE_TEXT,
        cancelText: CONFLICT_RELOAD_TEXT,
        closable: false,
        maskClosable: false,
        onOk: async () => {
          const runOverride =
            target.kind === 'config'
              ? overrideConfigRef.current
              : overrideSheetRef.current
          const result = await runOverride(target.id)
          if (result === 'conflict') {
            conflictModalRef.current?.update?.({
              content: `${scopeText}：${CONFLICT_RETRY_TEXT}`,
            })
            throw new Error(CONFLICT_RETRY_TEXT)
          }
          cancelPendingSave(key)
          settleConflictRef.current(key)
        },
        onCancel: async () => {
          cancelPendingSave(key)
          const runReload =
            target.kind === 'config'
              ? reloadConfigRef.current
              : reloadSheetRef.current
          await runReload(target.id)
          settleConflictRef.current(key)
        },
      }) as ConflictModalInstance | undefined
      conflictModalRef.current = instance ?? null
    },
    [cancelPendingSave],
  )

  /** 关闭当前弹窗并推进队列中的下一个资源冲突。 */
  const settleConflict = useCallback((key: string) => {
    if (activeConflictRef.current?.key !== key) return
    conflictModalRef.current?.destroy?.()
    conflictModalRef.current = null
    activeConflictRef.current = null
    setConflict(null)
    const next = conflictQueueRef.current.shift()
    if (next) openConflictRef.current(next)
  }, [])

  /** 乐观并发冲突: 同资源复用弹窗, 不同资源排队, 避免叠加多个 modal。 */
  const handleConflict = useCallback(
    (kind: 'sheet' | 'config' | 'item', id: string, itemId?: string) => {
      const key = conflictResourceKey(kind, id)
      const active = activeConflictRef.current
      if (active) {
        cancelPendingSave(key)
        if (active.key === key) {
          if (itemId && active.itemId !== itemId) {
            activeConflictRef.current = { ...active, itemId }
            setConflict({ kind, id, itemId })
          }
          return
        }
        if (
          !conflictQueueRef.current.some(
            (queued) => conflictResourceKey(queued.kind, queued.id) === key,
          )
        ) {
          conflictQueueRef.current.push({
            kind,
            id,
            ...(itemId ? { itemId } : {}),
          })
        }
        return
      }
      openConflictRef.current({ kind, id, ...(itemId ? { itemId } : {}) })
    },
    [cancelPendingSave],
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
        // 已丢弃本地改动: 清除脏标记, 否则刷新会被永久关闭
        dirtySheetsRef.current.delete(sheetId)
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

  /** 以我的覆盖: 取服务端最新版本后原样重发本地内容, 冲突时重试一次。 */
  const overrideSheet = useCallback(
    async (sheetId: string): Promise<ConflictResolution> => {
      const sheet = stateRef.current.sheets.find((item) => item.id === sheetId)
      if (!sheet) return 'skipped'
      const payload = buildPayload(sheet, configOf(sheet.projectId))
      if (!payload) return 'skipped'
      const serverId = serverIdRef.current.get(sheetId)
      if (!serverId) return 'skipped'
      for (let attempt = 0; attempt < OVERRIDE_MAX_ATTEMPTS; attempt += 1) {
        try {
          const latest = await fetchQuoteSheet(serverId)
          const saved = await updateQuoteSheet(
            serverId,
            payload,
            latest.version,
          )
          applySheetVersion(sheetId, saved.version)
          baselineRef.current.set(
            sheetId,
            buildBaseline({
              ...sheet,
              version: saved.version ?? sheet.version,
            }),
          )
          dirtySheetsRef.current.delete(sheetId)
          broadcastSaved()
          return 'ok'
        } catch (error) {
          if (isConflictError(error)) continue
          message.error(
            error instanceof Error
              ? `保存比价单失败：${error.message}`
              : '保存比价单失败',
          )
          return 'error'
        }
      }
      return 'conflict'
    },
    [applySheetVersion, broadcastSaved, configOf],
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
        configLoadedRef.current.add(projectId)
        flushBlockedSaves(projectId)
      } catch (error) {
        console.error('重新加载比价配置失败', error)
        message.error('重新加载比价配置失败，请稍后重试')
      }
    },
    [flushBlockedSaves, mutate],
  )

  /** 以我的覆盖: 取服务端最新版本后原样重发本地项目配置, 冲突时重试一次。 */
  const overrideConfig = useCallback(
    async (projectId: string): Promise<ConflictResolution> => {
      const config = stateRef.current.configs[projectId]
      if (!config) return 'skipped'
      for (let attempt = 0; attempt < OVERRIDE_MAX_ATTEMPTS; attempt += 1) {
        try {
          const latest = await fetchQuoteProjectConfig(projectId)
          const saved = await saveQuoteProjectConfig(
            projectId,
            buildConfigPayload(config),
            latest.version,
          )
          applyConfigVersion(projectId, saved.version)
          broadcastSaved()
          return 'ok'
        } catch (error) {
          if (isConflictError(error)) continue
          message.error(
            error instanceof Error
              ? `保存比价配置失败：${error.message}`
              : '保存比价配置失败',
          )
          return 'error'
        }
      }
      return 'conflict'
    },
    [applyConfigVersion, broadcastSaved],
  )

  useEffect(() => {
    reloadSheetRef.current = reloadSheet
    overrideSheetRef.current = overrideSheet
    reloadConfigRef.current = reloadConfig
    overrideConfigRef.current = overrideConfig
  }, [reloadSheet, overrideSheet, reloadConfig, overrideConfig])

  useEffect(() => {
    openConflictRef.current = openConflict
    settleConflictRef.current = settleConflict
  }, [openConflict, settleConflict])

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
        const markDirty = () => dirtySheetsRef.current.add(sheet.id)
        // 项目配置未加载完成: 跳过保存并登记补跑, 避免用空品牌清空服务端现货价
        if (sheet.projectId && !configLoadedRef.current.has(sheet.projectId)) {
          configBlockedSaveRef.current.set(sheet.id, sheet.projectId)
          markDirty()
          return
        }
        const config = configOf(sheet.projectId)
        const serverId = serverIdRef.current.get(sheet.id)
        const fail = (error: unknown, fallback: string) => {
          // 写失败后仍保留本地编辑并置脏: 纳入未保存判定, 聚焦时可重试且不被刷新覆盖
          markDirty()
          message.error(
            error instanceof Error ? `${fallback}：${error.message}` : fallback,
          )
        }

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
            dirtySheetsRef.current.delete(sheet.id)
            // create 只拿到 serverId 就返回, 不会触发依赖 serverIdRef 的切换 effect;
            // 若该单据仍是当前激活批次, 显式补一次签出, 避免新批次无编辑锁。
            // 已离开比价路由时不签出(否则会在后台续约占锁); 返回时由切换 effect 补签。
            if (
              routeActiveRef.current &&
              stateRef.current.activeId === sheet.id
            ) {
              // 记录已签出的 serverId, 避免 activeId 重映射到 serverId 后再重复释放/签出
              lockedActiveRef.current = saved.id
              void acquireEditLockRef.current(sheet.id)
            }
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
            if (isVersionConflict(error)) {
              handleConflict('sheet', sheetId)
              return
            }
            if (isLockConflict(error)) {
              handleLockConflictRef.current(sheetId)
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
            const deleted = await deleteQuoteSheetItem(
              serverId,
              itemId,
              version,
            )
            version = deleted.version ?? version
            baseline.items.delete(itemId)
            applySheetVersion(sheet.id, version)
          } catch (error) {
            if (isVersionConflict(error)) {
              handleConflict('item', sheetId, itemId)
              return
            }
            if (isLockConflict(error)) {
              handleLockConflictRef.current(sheetId)
              return
            }
            fail(error, '删除商品行失败')
            return
          }
        }

        for (const row of sheet.rows) {
          const payload = buildItemPayload(sheet, row, config.brands)
          if (!payload) {
            // 未选商品的空行无法持久化: 置脏保留本地行, 刷新不得静默丢弃
            markDirty()
            continue
          }
          const signature = itemSignature(row, sheet.inputs)
          const known = baseline.items.has(row.id)
          if (known && baseline.items.get(row.id) === signature) continue
          try {
            if (known) {
              const saved = await updateQuoteSheetItem(
                serverId,
                row.id,
                payload,
                version,
              )
              version = saved.version ?? version
              baseline.items.set(row.id, signature)
            } else {
              const created = await addQuoteSheetItem(
                serverId,
                payload,
                version,
              )
              version = created.version ?? version
              const createdItem = created.item
              if (createdItem) {
                const remappedRow = { ...row, id: createdItem.id }
                const remappedInputs = remapInputKeys(
                  sheet.inputs,
                  row.id,
                  createdItem.id,
                )
                remapItemId(sheetId, row.id, createdItem.id)
                baseline.items.set(
                  createdItem.id,
                  itemSignature(remappedRow, remappedInputs),
                )
              }
            }
            applySheetVersion(sheet.id, version)
          } catch (error) {
            if (isVersionConflict(error)) {
              handleConflict('item', sheetId, row.id)
              return
            }
            if (isLockConflict(error)) {
              handleLockConflictRef.current(sheetId)
              return
            }
            fail(error, '保存商品行失败')
            return
          }
        }
        broadcastSaved()
        // 全部内容已落库: 清除脏标记, 允许后续刷新覆盖
        dirtySheetsRef.current.delete(sheet.id)
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

  useEffect(() => {
    scheduleSaveSheetRef.current = scheduleSaveSheet
  }, [scheduleSaveSheet])

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
      configTimerProjectRef.current = projectId
      configTimerRef.current = window.setTimeout(() => {
        configTimerRef.current = null
        configTimerProjectRef.current = null
        void saveConfigNow(projectId)
      }, SAVE_DEBOUNCE_MS)
    },
    [saveConfigNow],
  )

  /** 供卸载/隐藏时调用最新保存函数, 避免依赖变量带来的闭包失效。 */
  const saveSheetNowRef = useRef(saveSheetNow)
  const saveConfigNowRef = useRef(saveConfigNow)
  useEffect(() => {
    saveSheetNowRef.current = saveSheetNow
    saveConfigNowRef.current = saveConfigNow
  }, [saveSheetNow, saveConfigNow])

  /**
   * 清空防抖 timer 并补跑最后一次保存(卸载/页面隐藏时避免丢失编辑)。
   * 返回的 Promise 在全部写请求结束后 resolve, 供释放编辑锁前等待收尾保存落库。
   */
  const flushPendingSaves = useCallback(async (): Promise<void> => {
    const sheetIds = [...sheetTimersRef.current.keys()]
    for (const sheetId of sheetIds) {
      const timer = sheetTimersRef.current.get(sheetId)
      if (timer !== undefined) window.clearTimeout(timer)
      sheetTimersRef.current.delete(sheetId)
    }
    const tasks: Promise<unknown>[] = sheetIds.map((sheetId) =>
      saveSheetNowRef.current(sheetId),
    )
    if (configTimerRef.current !== null) {
      window.clearTimeout(configTimerRef.current)
      configTimerRef.current = null
    }
    const projectId = configTimerProjectRef.current
    configTimerProjectRef.current = null
    if (projectId) tasks.push(saveConfigNowRef.current(projectId))
    await Promise.allSettled(tasks)
  }, [])

  /** 拉取服务端单据覆盖本地; 有未保存改动或未决冲突时跳过(返回 false)。 */
  const refreshSheets = useCallback(async (): Promise<boolean> => {
    const hasPendingSheetSave = () =>
      // 配置未加载被跳过、保存失败/行不完整被跳过的编辑同样属于"有未保存改动", 刷新不得覆盖
      configBlockedSaveRef.current.size > 0 ||
      dirtySheetsRef.current.size > 0 ||
      sheetTimersRef.current.size > 0 ||
      [...inflightRef.current, ...pendingRef.current].some((key) =>
        key.startsWith('sheet:'),
      )
    if (hasPendingSheetSave()) return false
    if (activeConflictRef.current || conflictQueueRef.current.length > 0) {
      return false
    }
    const revision = dataRevisionRef.current
    const records = await fetchQuoteSheets()
    // await 期间出现新编辑或新保存/冲突: 放弃本次刷新, 避免覆盖本地改动
    if (dataRevisionRef.current !== revision) return false
    if (hasPendingSheetSave()) return false
    if (activeConflictRef.current || conflictQueueRef.current.length > 0) {
      return false
    }
    if (!records.length) return true
    const serverSheets = records.map(toPriceSheet)
    const serverIds = new Set(serverSheets.map((sheet) => sheet.id))
    // 保留已有"本地 id -> 服务端 id"映射(含服务端列表暂未反映的新建单据),
    // 再为服务端单据补恒等映射。避免本地新建单据丢失映射后被再次 create。
    const nextServerMap = new Map(serverIdRef.current)
    for (const sheet of serverSheets) {
      if (!nextServerMap.has(sheet.id)) nextServerMap.set(sheet.id, sheet.id)
    }
    serverIdRef.current = nextServerMap
    for (const sheet of serverSheets) {
      baselineRef.current.set(sheet.id, buildBaseline(sheet))
    }
    const current = stateRef.current
    const localById = new Map(current.sheets.map((sheet) => [sheet.id, sheet]))
    // 本地 id 可能尚未与服务端对齐(新建单据): 用 serverId 映射反查本地单据对象
    const localByServerId = new Map<string, PriceSheet>()
    for (const sheet of current.sheets) {
      const serverId = serverIdRef.current.get(sheet.id) ?? sheet.id
      if (!localByServerId.has(serverId)) localByServerId.set(serverId, sheet)
    }
    // 待保存编辑的本地内容与服务端不同: 保留本地, 避免静默回滚 (基线仍按服务端保存)
    const mergedServerSheets = serverSheets.map((serverSheet) => {
      const local = localById.get(serverSheet.id)
      if (
        local &&
        dirtySheetsRef.current.has(serverSheet.id) &&
        sheetContentFingerprint(local) !== sheetContentFingerprint(serverSheet)
      ) {
        return local
      }
      // 未选商品的空行不落库: 用服务端内容覆盖时保留本地未完成商品行及其本地位次
      const localCounterpart = local ?? localByServerId.get(serverSheet.id)
      if (
        localCounterpart?.rows.some(
          (row) => !isSeparatorRow(row) && !isCompleteRow(row),
        )
      ) {
        return {
          ...serverSheet,
          rows: mergeRowsPreservingIncomplete(
            localCounterpart.rows,
            serverSheet.rows,
          ),
        }
      }
      return serverSheet
    })
    const localOnly = current.sheets.filter((sheet) => {
      const serverId = serverIdRef.current.get(sheet.id)
      return !serverId || !serverIds.has(serverId)
    })
    const next = [...mergedServerSheets, ...localOnly]
    if (!next.length) return true
    // 本地 id 可能已被服务端 id 取代: 反查映射后再判断存在性, 避免列表重建时 activeId 回跳
    const activeServerId =
      serverIdRef.current.get(current.activeId) ?? current.activeId
    mutate((snapshot) => ({
      ...snapshot,
      sheets: next,
      activeId: next.some((sheet) => sheet.id === activeServerId)
        ? activeServerId
        : next[0].id,
    }))
    return true
  }, [mutate])

  /** 拉取服务端项目配置覆盖本地; 有未保存改动或未决冲突时跳过(返回 false)。 */
  const refreshConfig = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (!projectId) return true
      if (activeConflictRef.current || conflictQueueRef.current.length > 0) {
        return false
      }
      if (
        configTimerRef.current !== null ||
        inflightRef.current.has(`config:${projectId}`) ||
        pendingRef.current.has(`config:${projectId}`)
      ) {
        return false
      }
      const revision = dataRevisionRef.current
      const record = await fetchQuoteProjectConfig(projectId)
      if (dataRevisionRef.current !== revision) return false
      if (activeConflictRef.current || conflictQueueRef.current.length > 0) {
        return false
      }
      if (
        configTimerRef.current !== null ||
        inflightRef.current.has(`config:${projectId}`) ||
        pendingRef.current.has(`config:${projectId}`)
      ) {
        return false
      }
      const fallbackBrands = stateRef.current.sheets.find(
        (sheet) => sheet.projectId === projectId && sheet.brands?.length,
      )?.brands
      const fresh = buildConfigFromRecord(record, fallbackBrands)
      mutate((current) => ({
        ...current,
        configs: { ...current.configs, [projectId]: fresh },
      }))
      configLoadedRef.current.add(projectId)
      flushBlockedSaves(projectId)
      return true
    },
    [flushBlockedSaves, mutate],
  )

  /** 聚焦/轮询/跨标签共用的刷新入口: 有未保存改动时轻提示。 */
  const refreshFromServer = useCallback(async () => {
    if (!token || !hydratedRef.current) return
    try {
      // 重试此前保存失败/被跳过的单据, 避免本地编辑一直停留在未落库状态
      for (const sheetId of [...dirtySheetsRef.current]) {
        if (stateRef.current.sheets.some((sheet) => sheet.id === sheetId)) {
          scheduleSaveSheetRef.current(sheetId)
        } else {
          dirtySheetsRef.current.delete(sheetId)
        }
      }
      // 先就绪项目配置: 配置加载完成会补跑此前被跳过的保存, 再刷新单据列表,
      // 确保"配置未加载时被跳过的编辑"不会被静默覆盖
      const projectId =
        stateRef.current.sheets.find(
          (sheet) => sheet.id === stateRef.current.activeId,
        )?.projectId ?? ''
      const configFresh = projectId ? await refreshConfig(projectId) : true
      const sheetsFresh = await refreshSheets()
      if (!configFresh || !sheetsFresh) {
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

  /**
   * 同一 serverId 的锁网络操作串行执行。链空闲时同步发起(保持调用时序),
   * 链繁忙时排到当前链尾之后, 保证释放一定发生在同 serverId 的后续签出之前。
   */
  const runLockOp = useCallback(
    <T>(serverId: string, op: () => Promise<T>): Promise<T> => {
      const previous = lockOpQueueRef.current.get(serverId)
      const start = () => op()
      const next = previous ? previous.then(start, start) : start()
      const tail = next.then(
        () => {
          if (lockOpQueueRef.current.get(serverId) === tail) {
            lockOpQueueRef.current.delete(serverId)
          }
        },
        () => {
          if (lockOpQueueRef.current.get(serverId) === tail) {
            lockOpQueueRef.current.delete(serverId)
          }
        },
      )
      lockOpQueueRef.current.set(serverId, tail)
      return next
    },
    [],
  )

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

  /** 保存遇到他人签出锁冲突: 刷新锁状态并提示(区别于版本冲突弹窗)。 */
  const handleLockConflict = useCallback(
    (sheetId: string) => {
      const serverId = serverIdRef.current.get(sheetId)
      void (async () => {
        if (serverId) {
          try {
            const lock = await fetchQuoteSheetEditLock(serverId)
            // 统一按 serverId 记账, 与 acquire/release/activeLock 口径一致
            applyLockState(
              serverId,
              lock.locked
                ? {
                    mine: lock.mine,
                    ...(lock.ownerName ? { ownerName: lock.ownerName } : {}),
                  }
                : null,
            )
          } catch {
            // 锁状态刷新失败不影响提示
          }
        }
        message.warning(LOCK_CONFLICT_TEXT)
      })()
    },
    [applyLockState],
  )

  useEffect(() => {
    handleLockConflictRef.current = handleLockConflict
  }, [handleLockConflict])

  const releaseEditLock = useCallback(
    async (id?: string) => {
      const requested =
        id ?? heldLockRef.current?.sheetId ?? stateRef.current.activeId
      // 键统一用映射后的 serverId(heldLockRef 本身也存 serverId)
      const resolved = serverIdRef.current.get(requested)
      const serverId =
        resolved ??
        (heldLockRef.current?.sheetId === requested ? requested : undefined)
      if (serverId) {
        // 自增代次: 使该单据飞行中的签出请求失效, 不再回写状态或建立续约定时器
        lockRequestGenRef.current.set(
          serverId,
          (lockRequestGenRef.current.get(serverId) ?? 0) + 1,
        )
      }
      if (heldLockRef.current?.sheetId === serverId) clearHeldLockTimer()
      setEditLock((current) =>
        current && current.sheetId === serverId ? null : current,
      )
      if (!serverId) return
      try {
        // 与签出串行: 保证释放发生在同 serverId 的后续签出之前;
        // 任务内先补跑并等待收尾保存落库, 避免无锁保存被服务端拒绝而丢编辑。
        await runLockOp(serverId, async () => {
          await flushPendingSaves()
          await releaseQuoteSheetEditLock(serverId)
        })
      } catch (error) {
        if (!isConflictError(error)) console.error('释放编辑锁失败', error)
      }
    },
    [clearHeldLockTimer, flushPendingSaves, runLockOp],
  )

  const acquireEditLock = useCallback(
    async (id?: string, options?: { force?: boolean }): Promise<boolean> => {
      const target = id ?? stateRef.current.activeId
      const serverId = serverIdRef.current.get(target)
      // 尚未落库或锁接口失败: 降级为可编辑, 不阻断
      if (!serverId) return true
      // 锁状态与代次统一按 serverId 记账, 避免本地 id 重映射后错配
      const generation = (lockRequestGenRef.current.get(serverId) ?? 0) + 1
      lockRequestGenRef.current.set(serverId, generation)
      /** 请求期间已卸载/已切走/已释放: 响应过期, 丢弃结果。 */
      const isStale = () =>
        disposedRef.current ||
        lockRequestGenRef.current.get(serverId) !== generation
      try {
        // 与释放串行, 避免同一 serverId 的 DELETE 与 POST 交错
        const lock = await runLockOp(serverId, () =>
          acquireQuoteSheetEditLock(serverId, options),
        )
        if (isStale()) {
          // 迟到的签出响应:
          // - 若代次已变化(释放或新一轮签出): 不能归还, 否则会误删新一轮刚签出的锁;
          //   释放自身会发 DELETE, 新签出会持有该锁, 均无需此处兜底。
          // - 若仅因组件卸载: 没有其他操作会释放刚取得的锁, 必须归还, 否则锁泄漏到 TTL。
          const generationChanged =
            lockRequestGenRef.current.get(serverId) !== generation
          if (disposedRef.current && !generationChanged) {
            void runLockOp(serverId, () =>
              releaseQuoteSheetEditLock(serverId),
            ).catch(() => {})
          }
          return false
        }
        applyLockState(serverId, {
          mine: lock.mine,
          ...(lock.ownerName ? { ownerName: lock.ownerName } : {}),
        })
        clearHeldLockTimer()
        const timer = window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            void acquireEditLockRef.current(target)
          }
        }, EDIT_LOCK_RENEW_MS)
        heldLockRef.current = { sheetId: serverId, timer }
        return lock.mine
      } catch (error) {
        if (isStale()) return false
        if (isConflictError(error)) {
          let ownerName: string | undefined
          try {
            const current = await fetchQuoteSheetEditLock(serverId)
            ownerName = current.ownerName
          } catch {
            ownerName = undefined
          }
          if (isStale()) return false
          // 已失去/未取得该锁: 停止其续约, 避免继续对同一批次发起无效续约。
          if (heldLockRef.current?.sheetId === serverId) clearHeldLockTimer()
          applyLockState(serverId, {
            mine: false,
            ...(ownerName ? { ownerName } : {}),
          })
          return false
        }
        if (heldLockRef.current?.sheetId === serverId) clearHeldLockTimer()
        setEditLock((current) =>
          current && current.sheetId === serverId ? null : current,
        )
        return true
      }
    },
    [applyLockState, clearHeldLockTimer, runLockOp],
  )

  useEffect(() => {
    acquireEditLockRef.current = acquireEditLock
  }, [acquireEditLock])

  const takeoverEditLock = useCallback((id?: string) => {
    const target = id ?? stateRef.current.activeId
    modal.confirm({
      title: '申请接管批次',
      content:
        '接管将以当前用户强制取得该批次编辑权，对方正在进行的编辑将被覆盖，服务端会记录接管操作。确认接管？',
      okText: '强制接管',
      cancelText: '取消',
      onOk: async () => {
        const acquired = await acquireEditLockRef.current(target, {
          force: true,
        })
        if (!acquired) message.warning('接管失败，请稍后再试')
      },
    })
  }, [])

  // 切换批次 / 切换路由: 释放上一批次锁并签出新批次(按 serverId 记账)。
  // 离开 /price-compare 时只释放并停止续约(保留页面本地状态), 不签出新锁。
  useEffect(() => {
    if (loading) return
    if (!token) {
      // 登出/令牌失效: 归还当前持有的锁, 避免 keep-alive 下锁泄漏到 TTL 过期
      const held = lockedActiveRef.current ?? heldLockRef.current?.sheetId
      lockedActiveRef.current = null
      if (held) void releaseEditLock(held)
      return
    }
    if (!hydratedRef.current) return
    const previous = lockedActiveRef.current
    // 离开比价路由: 立即入队归还锁(任务内部先等待收尾保存落库), 返回时由下方分支重新签出。
    // 入队必须同步, 否则重新签出可能先于释放到达服务端而误删新锁。
    if (!routeActive) {
      lockedActiveRef.current = null
      if (previous) {
        void releaseEditLock(previous)
      } else {
        void flushPendingSaves()
      }
      return
    }
    const target = state.activeId
    if (!target) {
      // 无激活批次时也要归还原有锁, 避免持有旧锁却无人续约/释放
      if (previous) {
        lockedActiveRef.current = null
        void releaseEditLock(previous)
      }
      return
    }
    const targetServerId = serverIdRef.current.get(target)
    if (targetServerId && previous === targetServerId) return
    // 未落库批次: 清空持有标记, 待 create 成功后由 saveSheetNow 显式签出
    lockedActiveRef.current = targetServerId ?? null
    // 先释放上一批次锁并停止其续约; 即使目标批次尚未落库也要执行, 否则旧锁会泄漏
    if (previous && previous !== targetServerId) void releaseEditLock(previous)
    if (!targetServerId) return
    void acquireEditLock(target)
  }, [
    state.activeId,
    routeActive,
    token,
    loading,
    acquireEditLock,
    releaseEditLock,
    flushPendingSaves,
  ])

  // 页面隐藏/卸载: 补跑最后一次防抖保存并释放当前批次锁
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flushPendingSaves()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [flushPendingSaves])

  useEffect(
    () => () => {
      disposedRef.current = true
      const held = heldLockRef.current
      // 先等待收尾保存落库再归还锁, 否则释放请求会先于写请求到达而被服务端拒绝, 造成丢编辑
      void flushPendingSaves().finally(() => {
        if (held) {
          window.clearInterval(held.timer)
          // heldLockRef.sheetId 已是 serverId
          void releaseQuoteSheetEditLock(held.sheetId).catch(() => {})
        }
        heldLockRef.current = null
        lockedActiveRef.current = null
      })
    },
    [flushPendingSaves],
  )

  const active = useMemo(
    () =>
      state.sheets.find((sheet) => sheet.id === state.activeId) ??
      state.sheets[0],
    [state.sheets, state.activeId],
  )
  const config = configOf(active?.projectId ?? '')
  /** 当前项目配置是否已从服务端加载(用于区分未初始化与用户显式清空品牌)。 */
  const configLoaded = Boolean(
    active?.projectId && state.configs[active.projectId],
  )
  // editLock 按 serverId 记账: activeId 可能仍是本地 id, 需先反查映射
  const activeServerId =
    serverIdRef.current.get(state.activeId) ?? state.activeId
  const activeLock =
    editLock && editLock.sheetId === activeServerId ? editLock : null
  const readOnly = Boolean(activeLock && activeLock.locked && !activeLock.mine)
  const readOnlyRef = useRef(false)
  useEffect(() => {
    readOnlyRef.current = readOnly
  }, [readOnly])

  // 切换项目时按需加载项目配置; 后端无品牌时用单据品牌兜底(保留运费)
  useEffect(() => {
    const projectId = active?.projectId
    if (!token || !projectId) return
    if (state.configs[projectId]) {
      // 配置已在本地(含其他路径写入): 视为已加载, 允许该项目单据保存
      configLoadedRef.current.add(projectId)
      return
    }
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
                version: record.version,
              },
            },
          }
        })
        configLoadedRef.current.add(projectId)
        flushBlockedSaves(projectId)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('加载比价配置失败', error)
        }
      }
    })()
    return () => controller.abort()
  }, [token, active?.projectId, state.configs, apply, flushBlockedSaves])

  /** 撤销/重做时保留当前锁字段: 锁是并发控制状态, 不应被历史回滚覆盖。 */
  const preserveLockFields = useCallback((snapshot: Snapshot): Snapshot => {
    const currentSheets = new Map(
      stateRef.current.sheets.map((sheet) => [sheet.id, sheet]),
    )
    return {
      ...snapshot,
      sheets: snapshot.sheets.map((sheet) => {
        const currentSheet = currentSheets.get(sheet.id)
        if (!currentSheet) return sheet
        return {
          ...sheet,
          locked: currentSheet.locked,
          specQuantityLocked: currentSheet.specQuantityLocked,
        }
      }),
    }
  }, [])

  const undo = useCallback(() => {
    // 只读态(他人签出)禁用撤销, 且不进入历史回滚
    if (readOnlyRef.current) return
    // 规格数量锁定期间撤销会回退规格/吨位, 被后端 422 拒绝后本地与服务端不一致, 直接禁用
    if (activeSheetSpecQuantityLocked(stateRef.current)) return
    const history = historyRef.current
    if (!history.past.length) return
    const target = preserveLockFields(history.past[history.past.length - 1])
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
  }, [preserveLockFields, scheduleSaveSheet, scheduleSaveConfig])

  const redo = useCallback(() => {
    // 只读态(他人签出)禁用重做, 且不进入历史回滚
    if (readOnlyRef.current) return
    // 规格数量锁定期间重做同样会回退规格/吨位, 与后端 422 语义冲突, 直接禁用
    if (activeSheetSpecQuantityLocked(stateRef.current)) return
    const history = historyRef.current
    if (!history.future.length) return
    const target = preserveLockFields(history.future[0])
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
  }, [preserveLockFields, scheduleSaveSheet, scheduleSaveConfig])

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

  const setActiveId = (id: string) => {
    const next = { ...stateRef.current, activeId: id }
    stateRef.current = next
    setState(next)
  }

  const patchSheet = (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) => {
    if (readOnlyRef.current && id === stateRef.current.activeId) return
    // 改项目后原项目的"被跳过保存"已失效: 清理后由新的保存流程按新项目重新登记
    if (patch.projectId !== undefined) configBlockedSaveRef.current.delete(id)
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
      orderDate || dayjs().format('YYYY-MM-DD'),
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
    baselineRef.current.delete(id)
    // 清理待保存登记: 已删除单据不应再阻塞刷新或触发补跑
    configBlockedSaveRef.current.delete(id)
    if (serverId) configBlockedSaveRef.current.delete(serverId)
    dirtySheetsRef.current.delete(id)
    if (serverId) dirtySheetsRef.current.delete(serverId)
    // 使该单据飞行中的签出请求失效, 并停止其续约定时器, 避免删除后仍续约
    if (serverId) {
      lockRequestGenRef.current.set(
        serverId,
        (lockRequestGenRef.current.get(serverId) ?? 0) + 1,
      )
    }
    // 清理本地 id 的代次键, 避免 Map 随删除无限增长
    lockRequestGenRef.current.delete(id)
    if (heldLockRef.current?.sheetId === serverId) clearHeldLockTimer()
    setEditLock((current) =>
      current && current.sheetId === serverId ? null : current,
    )
    // 清理该单据的防抖保存 timer 与排队项, 避免删除后仍触发保存
    const timer = sheetTimersRef.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      sheetTimersRef.current.delete(id)
    }
    pendingRef.current.delete(`sheet:${id}`)
    // 清理指向该单据的冲突弹窗/队列, 避免弹窗指向已删除单据后重新加载 404
    const isSheetConflict = (item: SheetsConflict) =>
      item.kind !== 'config' && item.id === id
    conflictQueueRef.current = conflictQueueRef.current.filter(
      (item) => !isSheetConflict(item),
    )
    if (
      activeConflictRef.current &&
      isSheetConflict(activeConflictRef.current)
    ) {
      conflictModalRef.current?.destroy?.()
      conflictModalRef.current = null
      activeConflictRef.current = null
      setConflict(null)
      const nextConflict = conflictQueueRef.current.shift()
      if (nextConflict) openConflictRef.current(nextConflict)
    }
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
    configLoaded,
    editLock: activeLock,
    readOnly,
    setConfig,
    setBrands,
    canUndo:
      !readOnly &&
      !active?.specQuantityLocked &&
      historyRef.current.past.length > 0,
    canRedo:
      !readOnly &&
      !active?.specQuantityLocked &&
      historyRef.current.future.length > 0,
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
    rowType: item.rowType === 'SEPARATOR' ? 'SEPARATOR' : 'PRODUCT',
    category: item.category,
    material: item.material,
    spec: item.spec ?? null,
    length: item.length,
    ...(item.ton !== undefined ? { ton: item.ton } : {}),
    ...(item.remark ? { remark: item.remark } : {}),
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
    specQuantityLocked: record.specQuantityLocked,
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
