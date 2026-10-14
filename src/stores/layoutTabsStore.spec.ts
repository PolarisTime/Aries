import { describe, expect, it, vi } from 'vitest'
import {
  clearPersistedLayoutTabs,
  DASHBOARD_TAB_PATH,
  getNextActiveTabAfterClose,
  type LayoutTab,
  MAX_LAYOUT_TABS,
  openTabIn,
  removeOtherTabsFrom,
  removeRightTabsFrom,
  removeTabFrom,
  sanitizePersistedTabs,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'
import { getLayoutTabsStorageKey } from '@/utils/storage'

function makeTab(overrides: Partial<LayoutTab> = {}): LayoutTab {
  return {
    id: overrides.id ?? `tab-${Math.random().toString(36).slice(2)}`,
    pathname: '/material',
    search: '',
    pinned: false,
    mountedOnce: false,
    reloadKey: 0,
    ...overrides,
  }
}

/**
 * 取自 page-registry 的真实已注册路径：`sanitizePersistedTabs` 会按路径白名单过滤，
 * 用虚构的 `/page-N` 会被整个丢掉，测不到截断行为。
 */
const KNOWN_PATHS = [
  '/material',
  '/supplier',
  '/customer',
  '/project',
  '/carrier',
  '/warehouse',
  '/purchase-order',
  '/purchase-inbound',
  '/sales-order',
  '/price-compare',
  '/receipt',
  '/payment',
] as const

function knownPath(index: number): string {
  return KNOWN_PATHS[index % KNOWN_PATHS.length]
}

describe('openTabIn', () => {
  it('新建 Tab 并激活', () => {
    const tabs = [
      makeTab({ id: 'dashboard', pathname: DASHBOARD_TAB_PATH, pinned: true }),
    ]
    const result = openTabIn(tabs, { pathname: '/purchase-order' })
    expect(result.tabs).toHaveLength(2)
    expect(result.activeTabId).toBe(result.tabs[1].id)
    expect(result.tabs[1].pathname).toBe('/purchase-order')
  })

  it('同路径幂等：仅激活既有 Tab，不重复创建', () => {
    const existing = makeTab({ id: 'existing', pathname: '/material' })
    const result = openTabIn([existing], { pathname: '/material' })
    expect(result.tabs).toHaveLength(1)
    expect(result.activeTabId).toBe('existing')
  })

  it('携带新查询串时更新既有 Tab 的 search；空查询串保留原值（深链保护）', () => {
    const existing = makeTab({
      id: 'a',
      pathname: '/material',
      search: 'docNo=123&openDetail=1',
    })
    const updated = openTabIn([existing], {
      pathname: '/material',
      search: 'status=待审核',
    })
    expect(updated.tabs[0].search).toBe('status=待审核')

    const kept = openTabIn(
      [makeTab({ id: 'b', pathname: '/material', search: 'docNo=123' })],
      { pathname: '/material' },
    )
    expect(kept.tabs[0].search).toBe('docNo=123')
  })

  it('路径尾斜杠归一化后匹配同一 Tab', () => {
    const existing = makeTab({ id: 'a', pathname: '/material' })
    const result = openTabIn([existing], { pathname: '/material/' })
    expect(result.activeTabId).toBe('a')
  })

  it(`超过上限 ${MAX_LAYOUT_TABS} 时淘汰最早的未激活非钉选 Tab，且不淘汰工作台`, () => {
    let tabs = [
      makeTab({ id: 'dashboard', pathname: DASHBOARD_TAB_PATH, pinned: true }),
    ]
    for (let index = 0; index < MAX_LAYOUT_TABS; index += 1) {
      tabs = openTabIn(tabs, { pathname: `/page-${index}` }).tabs
    }
    // dashboard + 10 页 = 11 > 10 → 最旧的非钉选 page-0 被淘汰
    expect(tabs).toHaveLength(MAX_LAYOUT_TABS)
    expect(tabs.some((tab) => tab.pathname === '/page-0')).toBe(false)
    expect(tabs.some((tab) => tab.pathname === DASHBOARD_TAB_PATH)).toBe(true)
  })

  /** dashboard(钉选) + 10 个非钉选页 = 11 个，恰为「已满」状态 */
  function makeFullTabs(): LayoutTab[] {
    return [
      makeTab({ id: 'dashboard', pathname: DASHBOARD_TAB_PATH, pinned: true }),
      ...Array.from({ length: MAX_LAYOUT_TABS }, (_, index) =>
        makeTab({ id: `p${index}`, pathname: `/page-${index}` }),
      ),
    ]
  }

  it('未传 isProtected 时保持既有淘汰行为，并回传被淘汰的 id', () => {
    // 11 → 新增 1 个 = 12，须淘汰 2 个才回到上限 10
    const result = openTabIn(makeFullTabs(), { pathname: '/page-new' })
    expect(result.tabs).toHaveLength(MAX_LAYOUT_TABS)
    expect(result.evictedIds).toEqual(['p0', 'p1'])
  })

  it('受保护的 Tab 不被淘汰，淘汰顺延到下一个候选', () => {
    // p0 最旧但持有未保存内容 → 跳过它，淘汰 p1、p2
    const result = openTabIn(
      makeFullTabs(),
      { pathname: '/page-new' },
      (tabId) => tabId === 'p0',
    )
    expect(result.tabs.some((tab) => tab.id === 'p0')).toBe(true)
    expect(result.tabs.some((tab) => tab.id === 'p1')).toBe(false)
    expect(result.evictedIds).toEqual(['p1', 'p2'])
  })

  it('候选全被保护时停止淘汰并允许暂时超限，绝不静默丢弃未保存内容', () => {
    const result = openTabIn(
      makeFullTabs(),
      { pathname: '/page-new' },
      () => true,
    )
    expect(result.evictedIds).toEqual([])
    // 超限是刻意的降级：dashboard + 10 个受保护页 + 新页
    expect(result.tabs).toHaveLength(MAX_LAYOUT_TABS + 2)
    expect(result.tabs.some((tab) => tab.id === 'p0')).toBe(true)
  })

  it('工作台钉选标签在任何情况下都不被淘汰，也不计入 evictedIds', () => {
    const result = openTabIn(
      makeFullTabs(),
      { pathname: '/page-new' },
      () => false,
    )
    expect(result.tabs.some((tab) => tab.pinned)).toBe(true)
    expect(result.evictedIds).not.toContain('dashboard')
  })
})

describe('removeTabFrom', () => {
  const tabs = [
    makeTab({ id: 'dashboard', pathname: DASHBOARD_TAB_PATH, pinned: true }),
    makeTab({ id: 'a', pathname: '/a' }),
    makeTab({ id: 'b', pathname: '/b' }),
  ]

  it('关闭激活 Tab 后激活右邻', () => {
    const result = removeTabFrom(tabs, 'dashboard', null)
    expect(result.tabs).toHaveLength(3) // 钉选不可关闭

    const closedActive = removeTabFrom(tabs, 'a', 'a')
    expect(closedActive.nextActiveTabId).toBe('b')
  })

  it('无右邻时回退左邻，再无则兜底 null（由调用方处理）', () => {
    const only = [makeTab({ id: 'x', pathname: '/x' })]
    const result = removeTabFrom(only, 'x', 'x')
    expect(result.nextActiveTabId).toBeNull()
  })

  it('关闭非激活 Tab 不改变当前激活项', () => {
    const result = removeTabFrom(tabs, 'b', 'a')
    expect(result.nextActiveTabId).toBe('a')
  })

  it('钉选 Tab 不可关闭', () => {
    const pinned = makeTab({
      id: 'pinned',
      pathname: DASHBOARD_TAB_PATH,
      pinned: true,
    })
    const result = removeTabFrom([pinned], 'pinned', 'pinned')
    expect(result.tabs).toHaveLength(1)
  })
})

describe('getNextActiveTabAfterClose', () => {
  it('关闭活动 Tab 时返回路由应先切换到的下一个 Tab', () => {
    const tabs = [
      makeTab({ id: 'dashboard', pathname: DASHBOARD_TAB_PATH, pinned: true }),
      makeTab({ id: 'sales-order', pathname: '/sales-order' }),
    ]

    expect(
      getNextActiveTabAfterClose(tabs, 'sales-order', 'sales-order')?.id,
    ).toBe('dashboard')
  })
})

describe('批量移除', () => {
  const tabs = [
    makeTab({ id: 'dashboard', pathname: DASHBOARD_TAB_PATH, pinned: true }),
    makeTab({ id: 'a', pathname: '/a' }),
    makeTab({ id: 'b', pathname: '/b' }),
    makeTab({ id: 'c', pathname: '/c' }),
  ]

  it('关闭其他：保留工作台与指定 Tab', () => {
    const result = removeOtherTabsFrom(tabs, 'b')
    expect(result.map((tab) => tab.id)).toEqual(['dashboard', 'b'])
  })

  it('关闭右侧：保留目标及左侧（含钉选）', () => {
    const result = removeRightTabsFrom(tabs, 'a')
    expect(result.map((tab) => tab.id)).toEqual(['dashboard', 'a'])
  })
})

describe('sanitizePersistedTabs', () => {
  it('仅工作台可以保留钉选状态，避免销售订单等业务 Tab 被缓存为不可关闭', () => {
    const result = sanitizePersistedTabs([
      { id: 'sales-order', pathname: '/sales-order', search: '', pinned: true },
      {
        id: 'dashboard',
        pathname: DASHBOARD_TAB_PATH,
        search: '',
        pinned: false,
      },
    ])

    expect(result.find((tab) => tab.pathname === '/sales-order')?.pinned).toBe(
      false,
    )
    expect(
      result.find((tab) => tab.pathname === DASHBOARD_TAB_PATH)?.pinned,
    ).toBe(true)
  })

  it('过滤未注册路径与重复路径', () => {
    const raw = [
      { id: '1', pathname: '/material', search: '', pinned: false },
      { id: '2', pathname: '/unknown-page', search: '', pinned: false },
      { id: '3', pathname: '/material', search: '', pinned: false },
    ]
    const result = sanitizePersistedTabs(raw)
    expect(result.filter((tab) => tab.pathname === '/material')).toHaveLength(1)
    expect(result.some((tab) => tab.pathname === '/unknown-page')).toBe(false)
  })

  it('工作台缺失时补位 index 0；存在但错位时前移', () => {
    const missing = sanitizePersistedTabs([
      { id: '1', pathname: '/material', search: '', pinned: false },
    ])
    expect(missing[0]?.pathname).toBe(DASHBOARD_TAB_PATH)

    const misplaced = sanitizePersistedTabs([
      { id: '1', pathname: '/material', search: '', pinned: false },
      { id: '2', pathname: '/dashboard', search: '', pinned: true },
    ])
    expect(misplaced[0]?.pathname).toBe(DASHBOARD_TAB_PATH)
  })

  it('非数组与脏字段安全降级', () => {
    expect(sanitizePersistedTabs(null)).toHaveLength(1) // 仅工作台
    expect(sanitizePersistedTabs('garbage')).toHaveLength(1)
    const dirty = sanitizePersistedTabs([
      { pathname: '/material', search: 42, extra: true },
      42,
      undefined,
    ])
    expect(
      dirty.filter((tab) => tab.pathname !== DASHBOARD_TAB_PATH),
    ).toHaveLength(1)
  })

  it('截断到上限并保证工作台保留', () => {
    const raw = Array.from({ length: 20 }, (_, index) => ({
      id: String(index),
      pathname: `/page-${index}`,
      search: '',
      pinned: false,
    }))
    raw.push({ id: 'd', pathname: '/dashboard', search: '', pinned: true })
    const result = sanitizePersistedTabs(raw)
    expect(result.length).toBeLessThanOrEqual(MAX_LAYOUT_TABS)
    expect(result[0]?.pathname).toBe(DASHBOARD_TAB_PATH)
  })

  it('超限恢复按「不可丢弃者优先」截断: 先丢最早的未标记标签', () => {
    // 工作台排在末尾(真实持久化里它可能被 unshift 过), 11 个业务页里有 2 个持有未保存
    // 编辑会话而在淘汰中幸存: 它们排在尾部 —— 直接 slice(0, MAX) 恰好会把它们截掉。
    const raw = [
      ...Array.from({ length: MAX_LAYOUT_TABS + 1 }, (_, index) => ({
        id: `p${index}`,
        pathname: knownPath(index),
        search: '',
        pinned: false,
        protectedFromEviction: index >= MAX_LAYOUT_TABS - 2,
      })),
      { id: 'd', pathname: '/dashboard', search: '', pinned: true },
    ]

    const result = sanitizePersistedTabs(raw)
    const ids = result.map((tab) => tab.id)

    // 剩几条: 工作台 + 上限内的业务页
    expect(result).toHaveLength(MAX_LAYOUT_TABS)
    expect(result[0]?.pathname).toBe(DASHBOARD_TAB_PATH)
    // 保留的是哪些: 两个受保护标签必须还在, 让位的是最早的未保护标签
    expect(ids).toContain('p10')
    expect(ids).toContain('p9')
    expect(ids).not.toContain('p0')
    expect(ids).not.toContain('p1')
    // 其余标签保持原有相对顺序(恢复不重排用户心智中的打开顺序)
    expect(ids).toEqual([
      'd',
      'p2',
      'p3',
      'p4',
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
      'p10',
    ])
  })

  it('未标记标签足够让位时不动受保护标签', () => {
    const raw = [
      { id: 'd', pathname: '/dashboard', search: '', pinned: true },
      ...Array.from({ length: MAX_LAYOUT_TABS - 1 }, (_, index) => ({
        id: `plain-${index}`,
        pathname: knownPath(index),
        search: '',
        pinned: false,
      })),
      {
        id: 'dirty',
        pathname: knownPath(11),
        search: '',
        pinned: false,
        protectedFromEviction: true,
      },
    ]

    const result = sanitizePersistedTabs(raw)

    expect(result).toHaveLength(MAX_LAYOUT_TABS)
    expect(result.map((tab) => tab.id)).toContain('dirty')
    expect(result.map((tab) => tab.id)).not.toContain('plain-0')
  })
})

describe('受保护标签的重载恢复', () => {
  it('候选全受保护而超限保存后, 重载恢复仍保留受保护标签且不超上限', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    vi.useFakeTimers()
    try {
      useLayoutTabsStore.setState({
        tabs: [
          makeTab({
            id: 'dashboard',
            pathname: DASHBOARD_TAB_PATH,
            pinned: true,
          }),
          ...Array.from({ length: MAX_LAYOUT_TABS }, (_, index) =>
            makeTab({ id: `p${index}`, pathname: knownPath(index) }),
          ),
        ],
        activeTabId: 'dashboard',
      })

      // 新页与 10 个业务页: 候选（p0..p9）全部持有未保存编辑会话 → 淘汰停止, 刻意超限
      useLayoutTabsStore
        .getState()
        .openTab(
          { pathname: knownPath(11) },
          { isProtected: (tabId) => tabId.startsWith('p') },
        )
      const tabs = useLayoutTabsStore.getState().tabs
      expect(tabs).toHaveLength(MAX_LAYOUT_TABS + 2)
      expect(
        tabs.filter((tab) => tab.protectedFromEviction).map((tab) => tab.id),
      ).toEqual(Array.from({ length: MAX_LAYOUT_TABS }, (_, i) => `p${i}`))

      // 防抖落盘（未限制长度: 上层要保留受保护标签的标记）
      vi.runAllTimers()
      const raw = values.get(getLayoutTabsStorageKey('anonymous'))
      expect(raw, '未写入持久化数据').toBeTruthy()
      const persisted = JSON.parse(String(raw)) as {
        tabs: Array<{ id: string }>
      }
      expect(persisted.tabs).toHaveLength(MAX_LAYOUT_TABS + 2)

      // 模拟刷新: store 回到初始态后按持久化数据恢复（此时编辑器会话已全部消失）
      useLayoutTabsStore.setState({
        tabs: [
          makeTab({
            id: 'fresh-dashboard',
            pathname: DASHBOARD_TAB_PATH,
            pinned: true,
          }),
        ],
        activeTabId: null,
      })
      useLayoutTabsStore.getState().hydrateForUser('anonymous')
      const restored = useLayoutTabsStore.getState().tabs

      // 重载后还剩几条
      expect(restored).toHaveLength(MAX_LAYOUT_TABS)
      // 保留的是哪些: 尾部那个刚被保护的 p9 不能消失（旧实现按顺序截断会丢掉它）
      expect(restored.map((tab) => tab.id)).toContain('p9')
      expect(restored.map((tab) => tab.id)).not.toContain('p0')
      expect(restored.some((tab) => tab.pathname === knownPath(11))).toBe(false)
      expect(restored[0]?.pathname).toBe(DASHBOARD_TAB_PATH)
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      useLayoutTabsStore.setState({
        tabs: [
          makeTab({
            id: 'dashboard',
            pathname: DASHBOARD_TAB_PATH,
            pinned: true,
          }),
        ],
        activeTabId: null,
      })
    }
  })
})

describe('clearPersistedLayoutTabs', () => {
  it('只清除指定用户的持久化标签页数据', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', storage)
    values.set(getLayoutTabsStorageKey('user-1'), '{"tabs":[]}')
    values.set(getLayoutTabsStorageKey('user-2'), '{"tabs":[]}')

    clearPersistedLayoutTabs('user-1')

    expect(values.has(getLayoutTabsStorageKey('user-1'))).toBe(false)
    expect(values.has(getLayoutTabsStorageKey('user-2'))).toBe(true)
    vi.unstubAllGlobals()
  })
})
