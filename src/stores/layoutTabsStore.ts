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
  /** 会话内是否已挂载过（惰性挂载标记），不持久化 */
  mountedOnce: boolean
  /** 「刷新当前页」计数，变化时重建子 Router，不持久化 */
  reloadKey: number
}

/** 持久化到 localStorage 的字段子集 */
export type PersistedTab = Pick<
  LayoutTab,
  'id' | 'pathname' | 'search' | 'pinned'
>

export interface OpenTabTarget {
  pathname: string
  search?: string
}

interface LayoutTabsState {
  tabs: LayoutTab[]
  activeTabId: string | null
  hydrateForUser: (userId?: string) => void
  openTab: (target: OpenTabTarget) => string
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
  removeRightTabs: (id: string) => void
  removeAllTabs: () => void
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

function normalizeSearch(search: unknown): string {
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
    mountedOnce: false,
    reloadKey: 0,
  }
}

/** 超上限时淘汰最早的未激活非钉选 Tab（从 index 1 起找） */
function evictOverflow(tabs: LayoutTab[], activeTabId: string): LayoutTab[] {
  let next = tabs
  while (next.length > MAX_LAYOUT_TABS) {
    const evictIndex = next.findIndex(
      (tab, index) => index >= 1 && !tab.pinned && tab.id !== activeTabId,
    )
    if (evictIndex < 0) break
    next = next.filter((_, index) => index !== evictIndex)
  }
  return next
}

export function openTabIn(
  tabs: LayoutTab[],
  target: OpenTabTarget,
): { tabs: LayoutTab[]; activeTabId: string } {
  const pathname = normalizeTabPathname(target.pathname)
  const search = normalizeSearch(target.search)
  const existingIndex = tabs.findIndex((tab) => tab.pathname === pathname)

  if (existingIndex >= 0) {
    const existing = tabs[existingIndex]
    // 外部意图携带新查询串时更新；空查询串保留原值（避免菜单点击清掉深链）
    const nextSearch =
      search && search !== existing.search ? search : existing.search
    if (nextSearch === existing.search) {
      return { tabs, activeTabId: existing.id }
    }
    const nextTabs = tabs.map((tab, index) =>
      index === existingIndex ? { ...tab, search: nextSearch } : tab,
    )
    return { tabs: nextTabs, activeTabId: existing.id }
  }

  const tab = createTab({ pathname, search })
  const nextTabs = evictOverflow([...tabs, tab], tab.id)
  return { tabs: nextTabs, activeTabId: tab.id }
}

export function removeTabFrom(
  tabs: LayoutTab[],
  id: string,
  activeTabId: string | null,
): { tabs: LayoutTab[]; nextActiveTabId: string | null } {
  const index = tabs.findIndex((tab) => tab.id === id)
  if (index < 0 || tabs[index].pinned) {
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

export function removeOtherTabsFrom(
  tabs: LayoutTab[],
  keepId: string,
): LayoutTab[] {
  return tabs.filter((tab) => tab.pinned || tab.id === keepId)
}

export function removeRightTabsFrom(
  tabs: LayoutTab[],
  id: string,
): LayoutTab[] {
  const index = tabs.findIndex((tab) => tab.id === id)
  if (index < 0) return tabs
  return tabs.filter((tab, tabIndex) => tabIndex <= index || tab.pinned)
}

export function removeAllTabsFrom(tabs: LayoutTab[]): LayoutTab[] {
  return tabs.filter((tab) => tab.pinned)
}

/** 清洗持久化数据：白名单过滤未知路径、去重、保证工作台在 index 0、截断上限 */
export function sanitizePersistedTabs(value: unknown): LayoutTab[] {
  const result: LayoutTab[] = []
  if (Array.isArray(value)) {
    const seenPaths = new Set<string>()
    for (const item of value) {
      if (result.length >= MAX_LAYOUT_TABS) break
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const candidate = item as Partial<PersistedTab>
      const pathname = normalizeTabPathname(candidate.pathname)
      if (!isKnownPagePath(pathname) || seenPaths.has(pathname)) continue
      seenPaths.add(pathname)
      result.push({
        id:
          typeof candidate.id === 'string' && candidate.id
            ? candidate.id
            : createTabId(),
        pathname,
        search: normalizeSearch(candidate.search),
        pinned: pathname === DASHBOARD_TAB_PATH || candidate.pinned === true,
        mountedOnce: false,
        reloadKey: 0,
      })
    }
  }

  const dashboardIndex = result.findIndex(
    (tab) => tab.pathname === DASHBOARD_TAB_PATH,
  )
  if (dashboardIndex < 0) {
    result.unshift(createTab({ pathname: DASHBOARD_TAB_PATH }))
  } else if (dashboardIndex > 0) {
    const [dashboardTab] = result.splice(dashboardIndex, 1)
    result.unshift(dashboardTab)
  }
  return result.slice(0, MAX_LAYOUT_TABS)
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

function persistTabs(): void {
  const { tabs, activeTabId } = useLayoutTabsStore.getState()
  const payload: PersistedTabsPayload = {
    tabs: tabs.map(({ id, pathname, search, pinned }) => ({
      id,
      pathname,
      search,
      pinned,
    })),
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

  hydrateForUser: (userId) => {
    currentUserId = String(userId || 'anonymous').trim() || 'anonymous'
    const persisted = readPersistedTabs(currentUserId)
    const tabs = sanitizePersistedTabs(persisted?.tabs ?? [])
    const activeTabId =
      persisted?.activeTabId &&
      tabs.some((tab) => tab.id === persisted.activeTabId)
        ? persisted.activeTabId
        : (tabs.find((tab) => tab.pathname === DASHBOARD_TAB_PATH)?.id ??
          tabs[0]?.id ??
          null)
    set({ tabs, activeTabId })
  },

  openTab: (target) => {
    const { tabs, activeTabId } = openTabIn(get().tabs, target)
    set({ tabs, activeTabId })
    return activeTabId
  },

  activateTab: (id) => {
    if (get().tabs.some((tab) => tab.id === id)) {
      set({ activeTabId: id })
    }
  },

  setTabLocation: (id, location) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              pathname: normalizeTabPathname(location.pathname),
              search: normalizeSearch(location.search),
            }
          : tab,
      ),
    })
  },

  markTabMounted: (id) => {
    set({
      tabs: get().tabs.map((tab) =>
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

  removeRightTabs: (id) => {
    const tabs = removeRightTabsFrom(get().tabs, id)
    set({ tabs, activeTabId: nextActiveId(tabs, get().activeTabId) })
  },

  removeAllTabs: () => {
    const tabs = removeAllTabsFrom(get().tabs)
    set({ tabs, activeTabId: nextActiveId(tabs, get().activeTabId) })
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
