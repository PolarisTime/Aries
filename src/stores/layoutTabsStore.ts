import { create } from 'zustand'
import { appPageDefinitions } from '@/config/page-registry'
import { getLayoutTabsStorageKey } from '@/utils/storage'

/** 工作台路径：固定首个标签，不可关闭 */
export const DASHBOARD_TAB_PATH = '/dashboard'

/** 标签数量上限，超出后按创建顺序淘汰最早的未激活非钉选标签 */
export const MAX_LAYOUT_TABS = 10

export interface LayoutTab {
  id: string
  /** 页面路径（即 page-registry 的 menuKey），Tab 内导航漂移时随之更新 */
  pathname: string
  /** 查询串，不含 '?' */
  search: string
  /** 工作台为 true，不可关闭、不可淘汰 */
  pinned: boolean
  /**
   * 用户经右键菜单显式「固定」的标签页。
   *
   * <p>与 {@link LayoutTab.pinned} 同为不可关闭、不可淘汰、不被批量关闭的语义，统一由
   * {@link isTabPinned} 判定；区别在来源与生命周期：</p>
   * <ul>
   *   <li>`pinned` 由路径派生（只有工作台），用户不可增减，持久化时强制重算；</li>
   *   <li>`userPinned` 是用户显式意图，必须持久化，且菜单必须有对应的「取消固定」入口
   *       （否则用户会被自己钉死的标签困住）。</li>
   * </ul>
   *
   * <p>为什么不直接复用 `pinned`：{@link sanitizePersistedTabs} 有一条明确契约——持久化
   * 数据里的任意路径标记不足以让业务标签变成"不可关闭"（见对应单测）。把用户固定混进
   * `pinned` 会让那条契约失去意义，因此单列字段。</p>
   */
  userPinned?: boolean
  /**
   * 曾因持有未保存编辑会话（`isProtected`）在超限淘汰中幸存。
   *
   * <p>**需要持久化**：受保护时 store 刻意允许暂时超限，刷新后若按「保留最早 N 个」截断，
   * 这些刚被保护的标签会静默消失。恢复阶段据此把它们排在未标记标签之前保留。</p>
   */
  protectedFromEviction?: boolean
  /** 会话内是否已挂载过（惰性挂载标记），不持久化 */
  mountedOnce: boolean
  /** 「刷新当前页」计数，变化时重建子 Router，不持久化 */
  reloadKey: number
}

/** 标签是否受钉选保护：工作台的**结构钉选**或用户**显式固定**，两者对关闭/淘汰完全等价。 */
export function isTabPinned(tab: LayoutTab): boolean {
  return tab.pinned || tab.userPinned === true
}

/** 持久化到 localStorage 的字段子集 */
export type PersistedTab = Pick<
  LayoutTab,
  | 'id'
  | 'pathname'
  | 'search'
  | 'pinned'
  | 'userPinned'
  | 'protectedFromEviction'
>

export interface OpenTabTarget {
  pathname: string
  search?: string
}

export interface OpenTabOptions {
  /**
   * 判断某 Tab 是否不可被自动淘汰（典型实现是 `editorSessionStore.requiresConfirmation`）。
   * 由调用方注入而非本模块直接依赖编辑器会话，避免 stores/ 反向依赖 layouts/。
   */
  isProtected?: (tabId: string) => boolean
}

interface LayoutTabsState {
  tabs: LayoutTab[]
  activeTabId: string | null
  hydrateForUser: (
    userId?: string,
    currentLocation?: { pathname: string; search: string },
  ) => void
  openTab: (
    target: OpenTabTarget,
    options?: OpenTabOptions,
  ) => { tabId: string; evictedIds: string[] }
  /**
   * 「按 location 建/选标签」的唯一幂等入口，供路由协调层使用。
   * 与 {@link hydrateForUser} 共用 {@link ensureTabIn}，同一 pathname 只会有一个标签对象。
   */
  ensureTabForLocation: (
    location: OpenTabTarget,
    options?: OpenTabOptions,
  ) => { tabId: string; created: boolean; evictedIds: string[] }
  activateTab: (id: string) => void
  setTabLocation: (
    id: string,
    location: { pathname: string; search: string },
  ) => void
  markTabMounted: (id: string) => void
  bumpReloadKey: (id: string) => void
  /** 纯移除（脏检查由调用方负责），返回下一个应激活的 Tab id */
  removeTab: (id: string) => string | null
  removeOtherTabs: (id: string) => void
  removeLeftTabs: (id: string) => void
  removeRightTabs: (id: string) => void
  removeAllTabs: () => void
  /** 用户固定/取消固定（工作台等结构钉选标签被拒绝，见 {@link isTabPinned}） */
  setTabPinned: (id: string, pinned: boolean) => void
}

/** 去尾斜杠归一化路径（供 Tab 协调层与守卫复用） */
export function normalizeTabPathname(pathname: unknown): string {
  const normalized = String(pathname || '').replace(/\/+$/, '')
  return normalized || '/'
}

/** 拼接 href：pathname + （可选）'?'+search */
export function buildTabHref(pathname: string, search: string): string {
  const normalizedSearch = normalizeSearch(search)
  return normalizedSearch
    ? `${normalizeTabPathname(pathname)}?${normalizedSearch}`
    : normalizeTabPathname(pathname)
}

export function normalizeSearch(search: unknown): string {
  return String(search || '').replace(/^\?+/, '')
}

let tabIdCounter = 0
function createTabId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  tabIdCounter += 1
  return `tab-${Date.now().toString(36)}-${tabIdCounter}`
}

const knownPagePaths = new Set(
  appPageDefinitions.map((definition) =>
    normalizeTabPathname(definition.menuKey),
  ),
)

function isKnownPagePath(pathname: string): boolean {
  return knownPagePaths.has(normalizeTabPathname(pathname))
}

/** 路径是否为 page-registry 已注册页面（供路由协调层判断） */
export function isRegisteredPagePath(pathname: unknown): boolean {
  return isKnownPagePath(String(pathname || ''))
}

function createTab(target: OpenTabTarget): LayoutTab {
  const pathname = normalizeTabPathname(target.pathname)
  return {
    id: createTabId(),
    pathname,
    search: normalizeSearch(target.search),
    pinned: pathname === DASHBOARD_TAB_PATH,
    userPinned: false,
    protectedFromEviction: false,
    mountedOnce: false,
    reloadKey: 0,
  }
}

/**
 * 超上限时淘汰最早的未激活非钉选 Tab（从 index 1 起找）。
 *
 * <p>`isProtected` 用于排除不可丢弃的 Tab（典型是持有未保存编辑会话者）。候选全被保护时
 * 停止淘汰并允许暂时超限——宁可暂时超过 {@link MAX_LAYOUT_TABS}，也不能静默丢弃用户
 * 尚未保存的内容。</p>
 *
 * <p>真正发生超限时，同步给所有仍受保护的标签打上 {@link LayoutTab.protectedFromEviction}
 * 标记：若候选全被保护，列表会带着超过上限的长度被持久化，恢复阶段必须据此优先保留它们，
 * 否则 `slice(0, MAX)` 会把刚被保护的标签静默截掉。</p>
 *
 * @returns 淘汰后的 Tab 列表，以及被淘汰的 Tab id；调用方须据此回收子 Router 与编辑器会话
 */
function evictOverflow(
  tabs: LayoutTab[],
  activeTabId: string,
  isProtected?: (tabId: string) => boolean,
): { tabs: LayoutTab[]; evictedIds: string[] } {
  const evictedIds: string[] = []
  let next = tabs
  if (next.length > MAX_LAYOUT_TABS && isProtected) {
    next = next.map((tab) =>
      !isTabPinned(tab) && !tab.protectedFromEviction && isProtected(tab.id)
        ? { ...tab, protectedFromEviction: true }
        : tab,
    )
  }
  while (next.length > MAX_LAYOUT_TABS) {
    const evictIndex = next.findIndex(
      (tab, index) =>
        index >= 1 &&
        !isTabPinned(tab) &&
        tab.id !== activeTabId &&
        !(isProtected?.(tab.id) ?? false),
    )
    if (evictIndex < 0) break
    evictedIds.push(next[evictIndex].id)
    next = next.filter((_, index) => index !== evictIndex)
  }
  return { tabs: next, evictedIds }
}

export function openTabIn(
  tabs: LayoutTab[],
  target: OpenTabTarget,
  isProtected?: (tabId: string) => boolean,
): { tabs: LayoutTab[]; activeTabId: string; evictedIds: string[] } {
  const pathname = normalizeTabPathname(target.pathname)
  const search = normalizeSearch(target.search)
  const existingIndex = tabs.findIndex((tab) => tab.pathname === pathname)

  if (existingIndex >= 0) {
    const existing = tabs[existingIndex]
    // 外部意图携带新查询串时更新；空查询串保留原值（避免菜单点击清掉深链）
    const nextSearch =
      search && search !== existing.search ? search : existing.search
    if (nextSearch === existing.search) {
      return { tabs, activeTabId: existing.id, evictedIds: [] }
    }
    const nextTabs = tabs.map((tab, index) =>
      index === existingIndex ? { ...tab, search: nextSearch } : tab,
    )
    return { tabs: nextTabs, activeTabId: existing.id, evictedIds: [] }
  }

  const tab = createTab({ pathname, search })
  const { tabs: nextTabs, evictedIds } = evictOverflow(
    [...tabs, tab],
    tab.id,
    isProtected,
  )
  return { tabs: nextTabs, activeTabId: tab.id, evictedIds }
}

export interface EnsureTabResult {
  tabs: LayoutTab[]
  activeTabId: string
  tabId: string
  /** 本次是否新建了标签对象；幂等命中原有标签时为 false */
  created: boolean
  /** 触发上限淘汰时被丢掉的标签 id；调用方须据此回收子 Router 与编辑器会话 */
  evictedIds: string[]
}

/**
 * 「按 location 建/选标签」的唯一幂等入口（纯函数）。
 *
 * <p>路由协调层（地址栏变化 → 定位 effect）与 {@link LayoutTabsState.hydrateForUser}
 * （恢复持久化清单时发现当前深链）**必须**都走这里，而不是各自 `createTab`：两条路径各自
 * 建标签时，同一 pathname 会先后存在两个标签对象——React 先跑子组件 effect，因此总由定位
 * effect 先建 X，随后 hydrate 再建 Y 并整体覆盖，X 连同它的 `mountedOnce` 被静默丢弃。
 * 收成单一入口后，"同一 location 只对应一个标签对象"成为结构性事实，不再依赖调用顺序。</p>
 *
 * <p>幂等语义与 {@link openTabIn} 同源（本函数即在其上加一层"是否新建"的观测）：同
 * pathname 已有标签时复用其 id；携带非空查询串且与已有值不同才更新，空查询串保留标签
 * 既有筛选状态（避免菜单点击清掉深链或页内筛选）。</p>
 */
export function ensureTabIn(
  tabs: LayoutTab[],
  location: OpenTabTarget,
  isProtected?: (tabId: string) => boolean,
): EnsureTabResult {
  const pathname = normalizeTabPathname(location.pathname)
  const created = !tabs.some((tab) => tab.pathname === pathname)
  const {
    tabs: nextTabs,
    activeTabId,
    evictedIds,
  } = openTabIn(tabs, location, isProtected)
  return {
    tabs: nextTabs,
    activeTabId,
    tabId: activeTabId,
    created,
    evictedIds,
  }
}

export function removeTabFrom(
  tabs: LayoutTab[],
  id: string,
  activeTabId: string | null,
): { tabs: LayoutTab[]; nextActiveTabId: string | null } {
  const index = tabs.findIndex((tab) => tab.id === id)
  if (index < 0 || isTabPinned(tabs[index])) {
    return { tabs, nextActiveTabId: activeTabId }
  }
  const next = tabs.filter((tab) => tab.id !== id)
  let nextActiveTabId = activeTabId
  if (activeTabId === id) {
    // 优先右邻，其次左邻
    nextActiveTabId = next[index]?.id ?? next[index - 1]?.id ?? null
  }
  return { tabs: next, nextActiveTabId }
}

/** 关闭 Tab 前解析主路由应先切换到的目标 Tab。 */
export function getNextActiveTabAfterClose(
  tabs: LayoutTab[],
  id: string,
  activeTabId: string | null,
): LayoutTab | null {
  const { tabs: remainingTabs, nextActiveTabId } = removeTabFrom(
    tabs,
    id,
    activeTabId,
  )
  const fallbackActiveId =
    nextActiveTabId ??
    remainingTabs.find((tab) => tab.pathname === DASHBOARD_TAB_PATH)?.id ??
    remainingTabs[0]?.id ??
    null
  return remainingTabs.find((tab) => tab.id === fallbackActiveId) ?? null
}

export function removeOtherTabsFrom(
  tabs: LayoutTab[],
  keepId: string,
): LayoutTab[] {
  return tabs.filter((tab) => isTabPinned(tab) || tab.id === keepId)
}

export function removeLeftTabsFrom(tabs: LayoutTab[], id: string): LayoutTab[] {
  const index = tabs.findIndex((tab) => tab.id === id)
  if (index < 0) return tabs
  return tabs.filter((tab, tabIndex) => tabIndex >= index || isTabPinned(tab))
}

export function removeRightTabsFrom(
  tabs: LayoutTab[],
  id: string,
): LayoutTab[] {
  const index = tabs.findIndex((tab) => tab.id === id)
  if (index < 0) return tabs
  return tabs.filter((tab, tabIndex) => tabIndex <= index || isTabPinned(tab))
}

export function removeAllTabsFrom(tabs: LayoutTab[]): LayoutTab[] {
  return tabs.filter((tab) => isTabPinned(tab))
}

/**
 * 从最早的匹配项开始丢弃，最多 `count` 个，返回剩余列表与实际丢弃数量。
 * 保留其余项的原有相对顺序（标签顺序即用户心智中的打开顺序）。
 */
function dropOldest(
  tabs: LayoutTab[],
  count: number,
  shouldDrop: (tab: LayoutTab) => boolean,
): { tabs: LayoutTab[]; dropped: number } {
  if (count <= 0) {
    return { tabs, dropped: 0 }
  }
  const kept: LayoutTab[] = []
  let remaining = count
  for (const tab of tabs) {
    if (remaining > 0 && shouldDrop(tab)) {
      remaining -= 1
      continue
    }
    kept.push(tab)
  }
  return { tabs: kept, dropped: count - remaining }
}

/**
 * 清洗持久化数据：白名单过滤未知路径、去重、保证工作台在 index 0、截断上限。
 *
 * <p>截断按「不可丢弃者优先」：先丢最早的、既未标记 {@link LayoutTab.protectedFromEviction}
 * 又未被用户固定（{@link LayoutTab.userPinned}）的标签，仍然超限时才丢最早的这类标签。
 * 受保护标签是持有未保存编辑会话、store 刻意允许超限保存的那些；用户固定标签则是用户的
 * 显式意图——两者被 `slice(0, MAX)` 静默截掉时通常正排在末尾。</p>
 *
 * <p>工作台占一个名额（结构钉选永不被丢），因此其余标签的容量是 `MAX_LAYOUT_TABS - 1`。</p>
 */
export function sanitizePersistedTabs(value: unknown): LayoutTab[] {
  const candidates: LayoutTab[] = []
  if (Array.isArray(value)) {
    const seenPaths = new Set<string>()
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const candidate = item as Partial<PersistedTab>
      const pathname = normalizeTabPathname(candidate.pathname)
      if (!isKnownPagePath(pathname) || seenPaths.has(pathname)) continue
      seenPaths.add(pathname)
      candidates.push({
        id:
          typeof candidate.id === 'string' && candidate.id
            ? candidate.id
            : createTabId(),
        pathname,
        search: normalizeSearch(candidate.search),
        // 结构钉选是工作台的固定布局属性，不信任持久化数据中的任意路径标记；
        // 用户显式固定（userPinned）则是货真价实的用户意图，必须按布尔白名单原样恢复，
        // 否则刷新后"固定"会静默失效。
        pinned: pathname === DASHBOARD_TAB_PATH,
        userPinned: candidate.userPinned === true,
        protectedFromEviction: candidate.protectedFromEviction === true,
        mountedOnce: false,
        reloadKey: 0,
      })
    }
  }

  const dashboardTab = {
    ...(candidates.find((tab) => tab.pathname === DASHBOARD_TAB_PATH) ??
      createTab({ pathname: DASHBOARD_TAB_PATH })),
    // 工作台恒为结构钉选，且不接受任何"用户固定"标记（它没有"取消固定"入口）
    pinned: true,
    userPinned: false,
  }
  let rest = candidates.filter((tab) => tab.pathname !== DASHBOARD_TAB_PATH)

  const capacity = Math.max(0, MAX_LAYOUT_TABS - 1)
  const overflow = rest.length - capacity
  if (overflow > 0) {
    const discardableFirst = dropOldest(
      rest,
      overflow,
      (tab) => tab.protectedFromEviction !== true && tab.userPinned !== true,
    )
    rest = discardableFirst.tabs
    const stillOver = overflow - discardableFirst.dropped
    if (stillOver > 0) {
      rest = dropOldest(rest, stillOver, () => true).tabs
    }
  }

  return [dashboardTab, ...rest]
}

interface PersistedTabsPayload {
  tabs: PersistedTab[]
  activeTabId: string | null
}

function readPersistedTabs(userId: string): PersistedTabsPayload | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(getLayoutTabsStorageKey(userId))
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedTabsPayload>
    if (!parsed || typeof parsed !== 'object') return null
    return {
      tabs: Array.isArray(parsed.tabs) ? parsed.tabs : [],
      activeTabId:
        typeof parsed.activeTabId === 'string' ? parsed.activeTabId : null,
    }
  } catch {
    // 脏数据：清除后按初始状态恢复
    try {
      localStorage.removeItem(getLayoutTabsStorageKey(userId))
    } catch {
      // 忽略清除失败
    }
    return null
  }
}

let currentUserId = 'anonymous'
let persistTimer: ReturnType<typeof setTimeout> | undefined

/** 清除指定用户的持久化标签页，供工作台强制刷新使用。 */
export function clearPersistedLayoutTabs(userId?: string): void {
  if (typeof window === 'undefined') {
    return
  }
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = undefined
  }
  try {
    localStorage.removeItem(
      getLayoutTabsStorageKey(userId === undefined ? currentUserId : userId),
    )
  } catch {
    // 存储不可用时静默降级，刷新仍可恢复当前会话状态
  }
}

function persistTabs(): void {
  const { tabs, activeTabId } = useLayoutTabsStore.getState()
  const payload: PersistedTabsPayload = {
    tabs: tabs.map(
      ({
        id,
        pathname,
        search,
        pinned,
        userPinned,
        protectedFromEviction,
      }) => ({
        id,
        pathname,
        search,
        pinned,
        userPinned,
        protectedFromEviction,
      }),
    ),
    activeTabId,
  }
  try {
    localStorage.setItem(
      getLayoutTabsStorageKey(currentUserId),
      JSON.stringify(payload),
    )
  } catch {
    // 存储不可用时静默降级为会话内有效
  }
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistTabs, 300)
}

export const useLayoutTabsStore = create<LayoutTabsState>()((set, get) => ({
  tabs: [createTab({ pathname: DASHBOARD_TAB_PATH })],
  activeTabId: null,

  /**
   * 恢复某个用户的标签页清单，并让"首次打开的深链"优先于上次工作区。
   *
   * <p><b>竞态已收口（原"已知结构性瑕疵"）</b>：改造前本方法用恢复结果整体覆盖 store，而
   * {@link useTabRouteReconciliation} 的定位 effect 可能**已经**为当前深链建过一个标签——
   * React 先跑子组件 effect（AppTabContainer 是 AppLayout 的子节点），hydrate 总是发生在它之后。
   * 同一路径于是先后存在两个标签对象（X 由定位 effect 建、Y 由本方法建），X 连同它的
   * `mountedOnce` 被静默丢弃；hydrate 返回后不再有 location 变化，定位 effect 不会再跑，Y 也
   * 拿不到"已挂载"标记，该标签一转非激活就整块面板卸载重建。收口由两处配合完成：</p>
   * <ul>
   *   <li>恢复改在 AppLayout 的**布局阶段**（{@link useLayoutTabsHydration}）完成，严格早于
   *       AppTabContainer 的被动 effect，不再有"子先建、父后覆盖"的顺序；</li>
   *   <li>深链建标签复用 {@link ensureTabIn}——与定位 effect 同一个幂等入口，同 pathname 只会
   *       有一个标签对象，顺序即使反转也只会复用而不会重复创建。</li>
   * </ul>
   *
   * <p>AppTabContainer 的"激活即已挂载"不变式继续保留为结果兜底；改用 React Activity 承载
   * 非激活面板的方案已评估并暂缓（Activity 的 hidden 会销毁子树 effect，与本项目按 effect
   * 初始化表单/挂会话生命周期的实现冲突），理由与实测证据见 AppTabContainer 的类注释。</p>
   */
  hydrateForUser: (userId, currentLocation) => {
    currentUserId = String(userId || 'anonymous').trim() || 'anonymous'
    const persisted = readPersistedTabs(currentUserId)
    let tabs = sanitizePersistedTabs(persisted?.tabs ?? [])
    let activeTabId =
      persisted?.activeTabId &&
      tabs.some((tab) => tab.id === persisted.activeTabId)
        ? persisted.activeTabId
        : (tabs.find((tab) => tab.pathname === DASHBOARD_TAB_PATH)?.id ??
          tabs[0]?.id ??
          null)

    // 首次打开的深链优先于持久化的上次工作区，避免 hydration 将外部意图丢失。
    // 与路由协调层共用 ensureTabIn：已在清单中的路径复用原标签与查询串，不在清单中才新建。
    const currentPath = normalizeTabPathname(currentLocation?.pathname)
    if (
      currentLocation &&
      currentPath !== DASHBOARD_TAB_PATH &&
      isRegisteredPagePath(currentPath)
    ) {
      // hydration 阶段尚无任何挂载的编辑器会话，被截断的 Tab 不存在未保存内容
      const ensured = ensureTabIn(tabs, {
        pathname: currentPath,
        search: normalizeSearch(currentLocation.search),
      })
      tabs = ensured.tabs
      activeTabId = ensured.activeTabId
    }

    set({ tabs, activeTabId })
  },

  openTab: (target, options) => {
    const { tabs, activeTabId, evictedIds } = openTabIn(
      get().tabs,
      target,
      options?.isProtected,
    )
    set({ tabs, activeTabId })
    return { tabId: activeTabId, evictedIds }
  },

  ensureTabForLocation: (location, options) => {
    const { tabs, activeTabId, tabId, created, evictedIds } = ensureTabIn(
      get().tabs,
      location,
      options?.isProtected,
    )
    if (tabs !== get().tabs || activeTabId !== get().activeTabId) {
      set({ tabs, activeTabId })
    }
    return { tabId, created, evictedIds }
  },

  activateTab: (id) => {
    if (get().activeTabId !== id && get().tabs.some((tab) => tab.id === id)) {
      set({ activeTabId: id })
    }
  },

  setTabLocation: (id, location) => {
    const pathname = normalizeTabPathname(location.pathname)
    const search = normalizeSearch(location.search)
    const tabs = get().tabs
    const current = tabs.find((tab) => tab.id === id)
    if (
      !current ||
      (current.pathname === pathname && current.search === search)
    ) {
      return
    }
    set({
      tabs: tabs.map((tab) =>
        tab.id === id ? { ...tab, pathname, search } : tab,
      ),
    })
  },

  markTabMounted: (id) => {
    const tabs = get().tabs
    if (!tabs.some((tab) => tab.id === id && !tab.mountedOnce)) {
      return
    }
    set({
      tabs: tabs.map((tab) =>
        tab.id === id ? { ...tab, mountedOnce: true } : tab,
      ),
    })
  },

  bumpReloadKey: (id) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id ? { ...tab, reloadKey: tab.reloadKey + 1 } : tab,
      ),
    })
  },

  removeTab: (id) => {
    const { tabs, nextActiveTabId } = removeTabFrom(
      get().tabs,
      id,
      get().activeTabId,
    )
    // 邻位继承失败时兜底回工作台
    const fallbackActiveId =
      nextActiveTabId ??
      tabs.find((tab) => tab.pathname === DASHBOARD_TAB_PATH)?.id ??
      tabs[0]?.id ??
      null
    set({ tabs, activeTabId: fallbackActiveId })
    return get().activeTabId
  },

  removeOtherTabs: (id) => {
    const tabs = removeOtherTabsFrom(get().tabs, id)
    set({ tabs, activeTabId: nextActiveId(tabs, get().activeTabId) })
  },

  removeLeftTabs: (id) => {
    const tabs = removeLeftTabsFrom(get().tabs, id)
    set({ tabs, activeTabId: nextActiveId(tabs, get().activeTabId) })
  },

  removeRightTabs: (id) => {
    const tabs = removeRightTabsFrom(get().tabs, id)
    set({ tabs, activeTabId: nextActiveId(tabs, get().activeTabId) })
  },

  removeAllTabs: () => {
    const tabs = removeAllTabsFrom(get().tabs)
    set({ tabs, activeTabId: nextActiveId(tabs, get().activeTabId) })
  },

  setTabPinned: (id, pinned) => {
    const target = get().tabs.find((tab) => tab.id === id)
    // 工作台是结构钉选标签：没有"取消固定"入口，这里也必须拒绝，避免绕过 UI 把它变成可关闭
    if (!target || target.pinned) {
      return
    }
    if ((target.userPinned === true) === pinned) {
      return
    }
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id ? { ...tab, userPinned: pinned } : tab,
      ),
    })
  },
}))

function nextActiveId(
  tabs: LayoutTab[],
  activeTabId: string | null,
): string | null {
  return tabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : (tabs.find((tab) => tab.pathname === DASHBOARD_TAB_PATH)?.id ??
        tabs[0]?.id ??
        null)
}

// 任何状态变更后防抖写入 localStorage（mountedOnce/reloadKey 不入库）
useLayoutTabsStore.subscribe(schedulePersist)
