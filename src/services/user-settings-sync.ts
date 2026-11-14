/**
 * 个人设置跨端同步引擎（docs/client-state-sync.md §5）。
 *
 * <p>职责边界：本模块只做「本地镜像 ↔ 服务端分片」的搬运，不认识任何具体业务字段。
 * 各分片（ui / layoutTabs / supplierQuote）由 `user-settings-bindings.ts` 负责接线：
 * 本地状态变化 → {@link patchUserSection}；远端到达 → {@link subscribeUserSection} 回调。</p>
 *
 * <p>数据流（唯一顺序，别在调用方另写一套）：</p>
 * <ol>
 *   <li>启动：{@link loadUserAccountSettings} 拉一次 GET（与列设置共用同一个 in-flight 请求）；</li>
 *   <li>本地先渲染：{@link readSection} 读本地镜像，UI 不等待网络；</li>
 *   <li>任意变更：{@link patchUserSection} 先写本地镜像（UI 立即生效）→ 标记 dirty →
 *       1s 防抖合并 dirty 分片 → 单次 PUT；</li>
 *   <li>失败：指数退避重试（1s/2s/4s…30s）；离线时保留 dirty，`online` 事件立即补发；
 *       409 以服务端为准并提示；413 停用该分片（本地仍可用）。</li>
 * </ol>
 *
 * <p>本地键按账号隔离（`aries-user-settings:<userKey>`）并做一次性旧键迁移
 * （读旧 → 写新 → 删旧），避免同一浏览器切账号时把 A 的设置同步成 B 的。</p>
 */

import i18next from 'i18next'
import {
  getUserAccountSettings,
  saveUserAccountSettings,
  type UserAccountSettings,
  type UserAccountSettingsSectionInput,
  type UserAccountSettingsSections,
} from '@/api/system/user-preferences'
import { STORAGE_KEYS } from '@/constants/storage'
import { message } from '@/utils/antd-app'
import { logger } from '@/utils/logger'
import { getStoredUser } from '@/utils/storage'

/** 变更合并防抖窗口：同一窗口内的多个分片合并成一次 PUT。 */
const DEBOUNCE_MS = 1000

/** 失败重试的指数退避：1s / 2s / 4s … 封顶 30s。 */
const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 30_000

/** 单分片 32KB 上限（服务端 413 的阈值，前端先按它定位是谁超了）。 */
const MAX_SECTION_BYTES = 32 * 1024

/** `supplierQuote` 分片的 materialTabs 需要按 supplierId 深度合并（§7）。 */
const SUPPLIER_QUOTE_SECTION = 'supplierQuote'

/** 登录用户的账号键：雪花 ID 优先，其次登录名；都没有时按匿名处理。 */
export function getSettingsUserKey(): string {
  const user = getStoredUser()
  const id = String(user?.id ?? '').trim()
  if (id) return id
  const loginName = String(user?.loginName ?? '').trim()
  return loginName || 'anonymous'
}

function normalizeUserKey(userKey: string | null | undefined): string | null {
  const normalized = String(userKey ?? '').trim()
  if (!normalized || normalized === 'anonymous') return null
  return normalized
}

/** 按账号隔离的本地键：`<base>:<userKey>`（旧键迁移见 {@link readScopedSettingsItem}）。 */
export function scopedSettingsStorageKey(baseKey: string): string {
  return `${baseKey}:${getSettingsUserKey()}`
}

/**
 * 读按账号隔离的本地值；新键缺失而旧键存在时做一次性迁移（读旧 → 写新 → 删旧）。
 *
 * <p>迁移放在读路径上而不是启动钩子里：只有真正用到某个键的模块才会触发，
 * 没装过的老键不会被无谓地搬运；迁移完成后旧键立即删除，避免下次又读旧值覆盖新值。</p>
 */
export function readScopedSettingsItem(baseKey: string): string | null {
  if (typeof window === 'undefined') return null
  const scopedKey = scopedSettingsStorageKey(baseKey)
  try {
    /*
     * 旧键存在时以旧键为准并立即迁移：迁移后旧键会被删除，因此正常路径上只会发生一次。
     * 「新键优先」会让升级那一刻之外、仍由旧版本写旧键的场景读到过期新键
     * （例如多标签页里还有一个旧版本页面在写），所以旧键在时优先读旧键。
     */
    const legacy = window.localStorage.getItem(baseKey)
    if (legacy !== null) {
      window.localStorage.setItem(scopedKey, legacy)
      window.localStorage.removeItem(baseKey)
      return legacy
    }
    return window.localStorage.getItem(scopedKey)
  } catch {
    return null
  }
}

export function writeScopedSettingsItem(baseKey: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(scopedSettingsStorageKey(baseKey), value)
  } catch {
    // 隐私模式 / 配额满：本地镜像写不进去不影响本次会话内的 UI
  }
}

export function removeScopedSettingsItem(baseKey: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(scopedSettingsStorageKey(baseKey))
  } catch {
    // 同上：删除失败按「没有存档」处理
  }
}

interface SyncedSection {
  value: unknown
  clientUpdatedAt?: string
}

type SectionListener = (value: unknown, source: 'remote' | 'storage') => void

/**
 * 分片的新值：任意可 JSON 化的值，或 `(current) => next` 更新函数
 * （更新函数用于「按 supplierId 合并 materialTabs」这类需要读旧值的场景）。
 */
export type SectionPatch = unknown

interface SyncState {
  /** 当前账号键；null = 匿名/未登录（只写本地）。 */
  userKey: string | null
  activated: boolean
  /** 本地镜像（含远端已落地的值），按 section 存。 */
  sections: Record<string, SyncedSection>
  /** 已变更待提交的 section。 */
  dirty: Set<string>
  /** 启动阶段（远端未到达）写入的分片：远端有则远端赢，远端没有才上传。 */
  provisional: Set<string>
  /** 已因 413 停用的 section：只写本地，不再重试。 */
  disabled: Set<string>
  listeners: Map<string, Set<SectionListener>>
  flushTimer: ReturnType<typeof setTimeout> | null
  retryTimer: ReturnType<typeof setTimeout> | null
  retryAttempt: number
  inFlight: boolean
  pendingFlush: boolean
  /** 启动 GET 是否已完成（成功或失败都算），决定新变更是「临时值」还是「待上传」。 */
  loaded: boolean
  /** 已成功拉取过的账户设置（列设置与同步引擎共用，避免重复 GET）。 */
  snapshot: UserAccountSettings | null
  request: Promise<UserAccountSettings | null> | null
  bootstrap: Promise<UserAccountSettings | null> | null
  lastRawMirror: string | null
}

/**
 * window 级监听只装一次，且**不随测试重置**复位：重复 addEventListener 会让
 * 一次 storage 事件触发多次回调（测试里尤其明显）。
 */
let globalListenersInstalled = false

function createInitialState(): SyncState {
  return {
    userKey: null,
    activated: false,
    sections: {},
    dirty: new Set(),
    provisional: new Set(),
    disabled: new Set(),
    listeners: new Map(),
    flushTimer: null,
    retryTimer: null,
    retryAttempt: 0,
    inFlight: false,
    pendingFlush: false,
    loaded: false,
    snapshot: null,
    request: null,
    bootstrap: null,
    lastRawMirror: null,
  }
}

let state: SyncState = createInitialState()

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

function currentMirrorKey(): string {
  return `${STORAGE_KEYS.userSettingsPrefix}${state.userKey ?? 'anonymous'}`
}

function parseSections(raw: string | null): Record<string, SyncedSection> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isPlainObject(parsed) || !isPlainObject(parsed.sections)) return {}
    const sections: Record<string, SyncedSection> = {}
    for (const [key, entry] of Object.entries(parsed.sections)) {
      if (!key || !isPlainObject(entry)) continue
      sections[key] = {
        value: entry.value,
        ...(typeof entry.clientUpdatedAt === 'string'
          ? { clientUpdatedAt: entry.clientUpdatedAt }
          : {}),
      }
    }
    return sections
  } catch {
    return {}
  }
}

/**
 * 读本地镜像；新键缺失时从旧键（未按账号隔离）迁移。
 *
 * @returns 是否发生了旧键迁移（调用方需要把迁移结果写回新键）
 */
function readMirrorIntoState(): void {
  if (!hasWindow()) return
  state.lastRawMirror = null
  try {
    const scopedKey = currentMirrorKey()
    const raw = window.localStorage.getItem(scopedKey)
    if (raw !== null) {
      state.sections = parseSections(raw)
      state.lastRawMirror = raw
      return
    }
    const legacy = window.localStorage.getItem(
      STORAGE_KEYS.userSettingsLegacyKey,
    )
    if (legacy === null) {
      state.sections = {}
      return
    }
    // 一次性迁移：读旧 → 写新 → 删旧（只发生在首次激活该账号时）
    state.sections = parseSections(legacy)
    window.localStorage.setItem(scopedKey, legacy)
    window.localStorage.removeItem(STORAGE_KEYS.userSettingsLegacyKey)
    state.lastRawMirror = legacy
  } catch {
    state.sections = {}
  }
}

function writeMirror(): void {
  if (!hasWindow()) return
  try {
    const raw = JSON.stringify({ sections: state.sections })
    window.localStorage.setItem(currentMirrorKey(), raw)
    state.lastRawMirror = raw
  } catch {
    // 配额满等情况：内存里仍是权威值，刷新后最多回退到上一次成功写入的镜像
  }
}

/** 本地镜像可能被其它标签页改过：读路径按需同步一次，避免读到过期内存。 */
function syncMirrorFromStorage(): void {
  if (!hasWindow()) return
  try {
    const raw = window.localStorage.getItem(currentMirrorKey())
    if (raw === state.lastRawMirror) return
    state.lastRawMirror = raw
    state.sections = parseSections(raw)
  } catch {
    // 忽略读取失败
  }
}

function ensureActivatedState(): void {
  if (state.activated) return
  state.activated = true
  // 还没人调用 activateUserSettingsSync 时（例如某个读路径先于启动钩子），
  // 用登录态的账号键兜底，保证「引擎镜像键」与「各模块按账号隔离的本地键」是同一个账号。
  state.userKey = normalizeUserKey(getSettingsUserKey())
  readMirrorIntoState()
}

/**
 * 合并同一 section 的多次 patch：对象做浅合并；`supplierQuote.materialTabs`
 * 再按 supplierId 合并（不同供应商互不覆盖，§7）。
 */
export function mergeUserSectionValues(
  section: string,
  current: unknown,
  next: unknown,
): unknown {
  if (!isPlainObject(current) || !isPlainObject(next)) return next
  const merged: Record<string, unknown> = { ...current, ...next }
  if (section === SUPPLIER_QUOTE_SECTION) {
    const currentTabs = isPlainObject(current.materialTabs)
      ? current.materialTabs
      : {}
    const nextTabs = isPlainObject(next.materialTabs) ? next.materialTabs : null
    if (nextTabs) {
      merged.materialTabs = { ...currentTabs, ...nextTabs }
    }
  }
  return merged
}

function notifySection(
  section: string,
  value: unknown,
  source: 'remote' | 'storage',
): void {
  const listeners = state.listeners.get(section)
  if (!listeners?.size) return
  for (const listener of listeners) {
    try {
      listener(value, source)
    } catch (error) {
      logger.warn(
        `User settings listener failed for section "${section}"`,
        error,
      )
    }
  }
}

/** 读某个分片的本地值（本地镜像先渲染，不等网络）。 */
export function readSection<T>(section: string): T | null {
  ensureActivatedState()
  syncMirrorFromStorage()
  const entry = state.sections[section]
  if (!entry) return null
  return (entry.value ?? null) as T | null
}

function scheduleFlush(delay = DEBOUNCE_MS): void {
  if (!state.userKey) return
  if (state.flushTimer) clearTimeout(state.flushTimer)
  state.flushTimer = setTimeout(() => {
    state.flushTimer = null
    void flushUserSettings()
  }, delay)
}

function scheduleRetry(): void {
  if (!state.userKey || state.retryTimer) return
  const delay = Math.min(RETRY_BASE_MS * 2 ** state.retryAttempt, RETRY_MAX_MS)
  state.retryAttempt += 1
  state.retryTimer = setTimeout(() => {
    state.retryTimer = null
    void flushUserSettings()
  }, delay)
}

/** 本地变更入口：先写本地，再排队提交（防抖合并）。 */
export function patchUserSection(section: string, patch: SectionPatch): void {
  if (!section) return
  ensureActivatedState()
  const current = state.sections[section]?.value
  const next =
    typeof patch === 'function'
      ? (patch as (value: unknown) => unknown)(current)
      : patch
  const merged = mergeUserSectionValues(section, current, next)
  const clientUpdatedAt = new Date().toISOString()
  state.sections[section] = { value: merged, clientUpdatedAt }
  writeMirror()

  // 413 停用的分片：本地照常保存，但不再产生同步请求（不阻塞用户）。
  if (state.disabled.has(section) || !state.userKey) return

  if (!state.loaded) {
    // 启动阶段：远端未到达，先记「临时值」。远端有该分片则远端赢，远端没有才上传。
    state.provisional.add(section)
    return
  }

  state.dirty.add(section)
  scheduleFlush()
}

/** 订阅某个分片的值变化（远端落地或其它标签页更新）。返回取消订阅函数。 */
export function subscribeUserSection(
  section: string,
  listener: SectionListener,
): () => void {
  ensureActivatedState()
  installGlobalListeners()
  let listeners = state.listeners.get(section)
  if (!listeners) {
    listeners = new Set()
    state.listeners.set(section, listeners)
  }
  listeners.add(listener)
  return () => {
    listeners?.delete(listener)
  }
}

function sectionByteSize(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value) ?? '').length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function applyServerSections(
  sections: Record<string, UserAccountSettingsSectionInput>,
): void {
  let changed = false
  for (const [section, entry] of Object.entries(sections)) {
    // 本标签页还有未提交的更新时，不能被响应里的旧值覆盖（它马上会被 PUT 覆盖回去）。
    if (state.dirty.has(section)) continue
    const previous = state.sections[section]?.value
    state.sections[section] = {
      value: entry.value,
      ...(entry.clientUpdatedAt
        ? { clientUpdatedAt: entry.clientUpdatedAt }
        : {}),
    }
    changed = true
    if (JSON.stringify(previous) !== JSON.stringify(entry.value)) {
      notifySection(section, entry.value, 'remote')
    }
  }
  if (changed) writeMirror()
}

function rememberSnapshot(snapshot: UserAccountSettings): void {
  state.snapshot = snapshot
  // pages 走列设置自己的本地键；这里只维护共用快照，供列设置复用同一次 GET。
}

function requestStatus(error: unknown): number | undefined {
  const status = (error as { response?: { status?: unknown } } | null)?.response
    ?.status
  return typeof status === 'number' ? status : undefined
}

/** 从错误响应里取出服务端回传的分片（409 冲突时以它为准），形状不可信需逐层校验。 */
function errorResponseSections(
  error: unknown,
): { sections?: Record<string, UserAccountSettingsSectionInput> } | null {
  const data = (error as { response?: { data?: unknown } } | null)?.response
    ?.data
  if (!isPlainObject(data)) return null
  /*
   * 后端（leo `UserSettingsConflictException`）真实 409 形状：
   * `{ sections: ['ui'], serverValue: { ui: { value, clientUpdatedAt, serverUpdatedAt } } }`
   * —— `sections` 只是"哪些分片冲突"的**列表**（ProblemDetail 扩展字段），分片值在
   * `serverValue` 里。这里优先读 `serverValue`，同时兼容 `sections` 为对象映射的旧形状；
   * 两者都不匹配才放弃（放弃只清 dirty、不覆盖本地，不会误伤）。
   */
  const source = isPlainObject(data.serverValue)
    ? data.serverValue
    : isPlainObject(data.sections)
      ? data.sections
      : null
  if (!source) return null
  const sections: Record<string, UserAccountSettingsSectionInput> = {}
  for (const [section, entry] of Object.entries(source)) {
    if (!section || !isPlainObject(entry)) continue
    sections[section] = {
      value: entry.value,
      ...(typeof entry.clientUpdatedAt === 'string'
        ? { clientUpdatedAt: entry.clientUpdatedAt }
        : {}),
    }
  }
  return { sections }
}

function handleFlushError(error: unknown, batch: string[]): void {
  const status = requestStatus(error)

  if (status === 409) {
    // 冲突：以服务端为准，并用服务端返回的分片覆盖本地（不重试本次批量）。
    const remote = errorResponseSections(error)
    for (const section of batch) state.dirty.delete(section)
    if (remote?.sections) applyServerSections(remote.sections)
    state.retryAttempt = 0
    message.warning(i18next.t('settingsSync.conflict'))
    return
  }

  if (status === 413) {
    // 超限：定位超限分片并停用（本地仍然保存），避免每 1s 重试一次。
    const oversized = batch.filter(
      (section) =>
        sectionByteSize(state.sections[section]?.value) > MAX_SECTION_BYTES,
    )
    const targets = oversized.length > 0 ? oversized : batch
    for (const section of targets) {
      state.disabled.add(section)
      state.dirty.delete(section)
    }
    state.retryAttempt = 0
    message.warning(i18next.t('settingsSync.sectionDisabled'))
    return
  }

  if (status === 401) {
    // 未登录/登录失效：只写本地，登录后由下一次激活重新 bootstrap 补发。
    logger.warn('User settings sync skipped: unauthenticated')
    return
  }

  logger.warn('Failed to sync user settings, scheduling retry', error)
  scheduleRetry()
}

/**
 * 提交 dirty 分片（单 in-flight、合并同批）。
 *
 * <p>防抖定时器到点会自动调用；测试与登录态切换也可以直接 `await flushUserSettings()`。</p>
 */
export async function flushUserSettings(): Promise<void> {
  if (state.flushTimer) {
    clearTimeout(state.flushTimer)
    state.flushTimer = null
  }
  if (!state.userKey) return

  const batch = [...state.dirty].filter(
    (section) => !state.disabled.has(section),
  )
  if (batch.length === 0) {
    state.dirty.clear()
    return
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    // 离线：保留 dirty 等 online 补发；同时排一次退避，防止 onLine 误报 true。
    scheduleRetry()
    return
  }

  if (state.inFlight) {
    state.pendingFlush = true
    return
  }

  state.inFlight = true
  const sections: UserAccountSettingsSections = {}
  for (const section of batch) {
    const entry = state.sections[section]
    sections[section] = {
      value: entry?.value,
      ...(entry?.clientUpdatedAt
        ? { clientUpdatedAt: entry.clientUpdatedAt }
        : {}),
    }
  }

  try {
    const result = await saveUserAccountSettings(sections)
    for (const section of batch) state.dirty.delete(section)
    state.retryAttempt = 0
    rememberSnapshot(result)
    // 服务端可能同时带回其它分片的最新值（例如它端刚改过），按远端覆盖。
    if (result.sections && Object.keys(result.sections).length > 0) {
      applyServerSections(result.sections)
    }
  } catch (error) {
    handleFlushError(error, batch)
  } finally {
    state.inFlight = false
    if (state.pendingFlush) {
      state.pendingFlush = false
      scheduleFlush(0)
    }
  }
}

/**
 * 启动读取一次账户设置（与列设置共用同一个 in-flight 请求）。
 *
 * <p>匿名/未登录不发请求；失败返回 null（列设置会退回自己的本地缓存，不影响使用）。</p>
 */
export function loadUserAccountSettings(): Promise<UserAccountSettings | null> {
  /*
   * 这里不按 userKey 拦截：调用方（同步引导 / 列设置）各自已经判断过登录态，
   * 而列设置的 effect 可能早于同步引导里的 activate 执行 —— 按 userKey 拦截会让
   * 它在启动瞬间拿到 null、直接错失远端列设置。未登录时该请求由后端返回 401，
   * 列设置侧已有兜底（退回本地缓存）。
   */
  if (state.snapshot) return Promise.resolve(state.snapshot)
  if (state.request) return state.request

  const request = getUserAccountSettings()
    .then((settings) => {
      rememberSnapshot(settings)
      return settings
    })
    .catch((error: unknown) => {
      logger.warn('Failed to load account settings', error)
      return null
    })
    .finally(() => {
      state.request = null
    })
  state.request = request
  return request
}

/** 列设置写成功后回填共用快照，避免后续加载用到过期 pages。 */
export function rememberUserAccountSettingsPages(
  pages: UserAccountSettings['pages'],
): void {
  if (!state.snapshot) return
  state.snapshot = {
    ...state.snapshot,
    pages,
  }
}

function isRemoteNewer(
  local: SyncedSection | undefined,
  remote: SyncedSection | undefined,
): boolean {
  if (!remote) return false
  if (!local) return true
  if (!remote.clientUpdatedAt) return false
  if (!local.clientUpdatedAt) return true
  return remote.clientUpdatedAt > local.clientUpdatedAt
}

/**
 * 远端到达后的合并（§5「首登与冲突」）：
 * 本地有 / 远端空 → 上传；本地空 / 远端有 → 落地；都有 → 时间戳新者胜；
 * 服务端未知分片原样保留（向前兼容）。
 */
function reconcileRemoteSections(settings: UserAccountSettings | null): void {
  const remoteSections = settings?.sections ?? {}
  const remoteKeys = new Set(Object.keys(remoteSections))

  for (const [section, remote] of Object.entries(remoteSections)) {
    const local = state.sections[section]
    const provisional = state.provisional.has(section)
    if (provisional || isRemoteNewer(local, remote)) {
      state.sections[section] = {
        value: remote.value,
        ...(remote.clientUpdatedAt
          ? { clientUpdatedAt: remote.clientUpdatedAt }
          : {}),
      }
      state.provisional.delete(section)
      if (JSON.stringify(local?.value) !== JSON.stringify(remote.value)) {
        notifySection(section, remote.value, 'remote')
      }
      continue
    }
    // 本地值更新（或远端没给时间戳）：保留本地并上传。
    state.provisional.delete(section)
    if (!state.disabled.has(section)) state.dirty.add(section)
  }

  // 本地有、远端没有的分片：bootstrap 上传，避免换电脑全丢。
  for (const section of [...state.provisional]) {
    state.provisional.delete(section)
    if (!remoteKeys.has(section) && !state.disabled.has(section)) {
      state.dirty.add(section)
    }
  }

  /*
   * 本地镜像里有、服务端整份设置里都没有的分片同样需要上传（「本地有 / 服务端空」）。
   * 只在 GET 成功时这么做：GET 失败时无法判断服务端到底有没有，贸然上传可能用旧值
   * 覆盖别处的新值；失败场景交给后续用户变更触发的 PUT 增量同步。
   */
  if (settings) {
    for (const section of Object.keys(state.sections)) {
      if (remoteKeys.has(section) || state.disabled.has(section)) continue
      state.dirty.add(section)
    }
  }

  writeMirror()
  if (state.dirty.size > 0) scheduleFlush()
}

/**
 * 激活某个账号（登录/切换账号/登出时调用）。
 *
 * <p>切换账号必须重读本地镜像并清空 dirty/停用态：否则会把上一个账号的待提交分片
 * 发给新账号（串号）。</p>
 */
export function activateUserSettingsSync(userKeyInput: string | null): void {
  const userKey = normalizeUserKey(userKeyInput)
  if (state.activated && state.userKey === userKey) return

  if (state.flushTimer) {
    clearTimeout(state.flushTimer)
    state.flushTimer = null
  }
  if (state.retryTimer) {
    clearTimeout(state.retryTimer)
    state.retryTimer = null
  }
  state = createInitialState()
  state.userKey = userKey
  state.activated = true
  readMirrorIntoState()
  installGlobalListeners()
}

function installGlobalListeners(): void {
  if (globalListenersInstalled || !hasWindow()) return
  globalListenersInstalled = true

  window.addEventListener('storage', (event) => {
    if (!state.userKey) return
    if (event.key !== currentMirrorKey() || !event.newValue) return
    const next = parseSections(event.newValue)
    for (const [section, entry] of Object.entries(next)) {
      // 本标签页有未提交改动时，不能被其它标签页的旧值覆盖。
      if (state.dirty.has(section) || state.disabled.has(section)) continue
      const previous = state.sections[section]?.value
      state.sections[section] = entry
      if (JSON.stringify(previous) !== JSON.stringify(entry.value)) {
        notifySection(section, entry.value, 'storage')
      }
    }
    state.lastRawMirror = event.newValue
  })

  window.addEventListener('online', () => {
    if (!state.userKey) return
    if (state.retryTimer) {
      clearTimeout(state.retryTimer)
      state.retryTimer = null
    }
    state.retryAttempt = 0
    void flushUserSettings()
  })
}

/**
 * 启动引导：拉一次 GET，按分片合并到本地镜像并通知订阅方。
 *
 * <p>互斥：与列设置共用 {@link loadUserAccountSettings} 的同一个请求；
 * 重复调用复用同一个 bootstrap Promise（StrictMode / 多处挂载都不会重复发请求）。</p>
 */
export function bootstrapUserSettings(): Promise<UserAccountSettings | null> {
  ensureActivatedState()
  if (state.bootstrap) return state.bootstrap
  if (!state.userKey) {
    state.loaded = true
    state.bootstrap = Promise.resolve(null)
    return state.bootstrap
  }

  state.bootstrap = loadUserAccountSettings()
    .then((settings) => {
      reconcileRemoteSections(settings)
      return settings
    })
    .finally(() => {
      state.loaded = true
      // 启动阶段没能上送的分片：等远端到达后再判断（远端没有才上传）。
      for (const section of [...state.provisional]) {
        state.provisional.delete(section)
        if (!state.disabled.has(section)) state.dirty.add(section)
      }
      if (state.dirty.size > 0) scheduleFlush()
    })
  return state.bootstrap
}

/** 诊断/测试用快照：只读，不暴露内部可变对象。 */
export function getUserSettingsSyncSnapshot(): {
  userKey: string | null
  loaded: boolean
  dirty: string[]
  disabled: string[]
  retryAttempt: number
} {
  return {
    userKey: state.userKey,
    loaded: state.loaded,
    dirty: [...state.dirty],
    disabled: [...state.disabled],
    retryAttempt: state.retryAttempt,
  }
}

/** 仅供测试：清空引擎内部状态与定时器（生产代码不要调用）。 */
export function resetUserSettingsSyncForTests(): void {
  if (state.flushTimer) clearTimeout(state.flushTimer)
  if (state.retryTimer) clearTimeout(state.retryTimer)
  state = createInitialState()
}
