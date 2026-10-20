import { describe, expect, it, vi } from 'vitest'
import {
  clearPersistedLayoutTabs,
  DASHBOARD_TAB_PATH,
  getNextActiveTabAfterClose,
  isTabPinned,
  type LayoutTab,
  MAX_LAYOUT_TABS,
  openTabIn,
  removeAllTabsFrom,
  removeLeftTabsFrom,
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

  /**
   * 「关闭后落到哪个标签」必须只有一份口径。
   *
   * <p>渲染侧（关标签前先 replace 主地址栏，避免协调层把已关路径重新打开）调
   * `getNextActiveTabAfterClose`，store 侧（真正落库）调 `removeTab`。两处各写一遍时，
   * 只要有人只改一边，就会出现「地址栏跳到 A、激活标签却是 B」——用户看到的是页面
   * 和标签对不上。本用例直接断言两者对同一输入给出同一结果。</p>
   */
  it('store 的 removeTab 与渲染侧的 getNextActiveTabAfterClose 落点一致', () => {
    useLayoutTabsStore.setState({
      tabs: [
        makeTab({
          id: 'dashboard',
          pathname: DASHBOARD_TAB_PATH,
          pinned: true,
        }),
        makeTab({ id: 'a', pathname: '/a' }),
        makeTab({ id: 'b', pathname: '/b' }),
      ],
      activeTabId: 'a',
    })

    const expected = getNextActiveTabAfterClose(
      useLayoutTabsStore.getState().tabs,
      'a',
      'a',
    )?.id
    const actual = useLayoutTabsStore.getState().removeTab('a')

    expect(actual).toBe(expected)
    expect(useLayoutTabsStore.getState().activeTabId).toBe(expected)
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

  it('关闭左侧：保留目标及其右侧（含钉选），只丢左侧可关闭项', () => {
    const result = removeLeftTabsFrom(tabs, 'b')
    expect(result.map((tab) => tab.id)).toEqual(['dashboard', 'b', 'c'])
  })

  it('关闭左侧：目标不存在时原样返回（不做任何移除）', () => {
    expect(removeLeftTabsFrom(tabs, 'missing')).toBe(tabs)
  })

  it('用户固定的标签不被「关闭其他 / 关闭左侧 / 关闭右侧 / 全部关闭」移除', () => {
    const pinnedByUser = tabs.map((tab) =>
      tab.id === 'b' ? { ...tab, userPinned: true } : tab,
    )
    // 保留目标 'a' + 结构钉选的工作台 + 用户固定的 'b'；只有 'c' 被关掉
    expect(removeOtherTabsFrom(pinnedByUser, 'a').map((tab) => tab.id)).toEqual(
      ['dashboard', 'a', 'b'],
    )
    expect(removeLeftTabsFrom(pinnedByUser, 'c').map((tab) => tab.id)).toEqual([
      'dashboard',
      'b',
      'c',
    ])
    expect(removeRightTabsFrom(pinnedByUser, 'a').map((tab) => tab.id)).toEqual(
      ['dashboard', 'a', 'b'],
    )
    expect(removeAllTabsFrom(pinnedByUser).map((tab) => tab.id)).toEqual([
      'dashboard',
      'b',
    ])
  })

  it('用户固定的标签不可被单独关闭（removeTabFrom 与工作台同口径）', () => {
    const pinnedByUser = tabs.map((tab) =>
      tab.id === 'b' ? { ...tab, userPinned: true } : tab,
    )
    const result = removeTabFrom(pinnedByUser, 'b', 'b')
    expect(result.tabs.map((tab) => tab.id)).toContain('b')
    expect(result.nextActiveTabId).toBe('b')
  })
})

describe('用户固定（右键菜单「固定标签页 / 取消固定」）', () => {
  it('isTabPinned 同时覆盖工作台的结构钉选与用户显式固定', () => {
    expect(isTabPinned(makeTab({ pinned: true }))).toBe(true)
    expect(isTabPinned(makeTab({ userPinned: true }))).toBe(true)
    expect(isTabPinned(makeTab({ userPinned: false }))).toBe(false)
    expect(isTabPinned(makeTab())).toBe(false)
  })

  it('setTabPinned 固定与取消固定业务标签', () => {
    useLayoutTabsStore.setState({
      tabs: [
        makeTab({
          id: 'dashboard',
          pathname: DASHBOARD_TAB_PATH,
          pinned: true,
        }),
        makeTab({ id: 'sales-order', pathname: '/sales-order' }),
      ],
      activeTabId: 'sales-order',
    })

    useLayoutTabsStore.getState().setTabPinned('sales-order', true)
    expect(
      useLayoutTabsStore.getState().tabs.find((tab) => tab.id === 'sales-order')
        ?.userPinned,
    ).toBe(true)
    // 固定不改动激活项（用户只是想把它钉住）
    expect(useLayoutTabsStore.getState().activeTabId).toBe('sales-order')

    useLayoutTabsStore.getState().setTabPinned('sales-order', false)
    expect(
      useLayoutTabsStore.getState().tabs.find((tab) => tab.id === 'sales-order')
        ?.userPinned,
    ).toBe(false)
  })

  it('工作台的结构钉选不可被取消（无「取消固定」入口，store 也拒绝）', () => {
    useLayoutTabsStore.setState({
      tabs: [
        makeTab({
          id: 'dashboard',
          pathname: DASHBOARD_TAB_PATH,
          pinned: true,
        }),
      ],
      activeTabId: 'dashboard',
    })

    useLayoutTabsStore.getState().setTabPinned('dashboard', false)
    const dashboard = useLayoutTabsStore.getState().tabs[0]
    expect(dashboard?.pinned).toBe(true)
    expect(dashboard?.userPinned, '工作台不得被标成用户固定').not.toBe(true)
    expect(isTabPinned(dashboard)).toBe(true)
  })

  it('固定后超限淘汰会跳过它（与结构钉选同口径）', () => {
    const tabs = Array.from({ length: MAX_LAYOUT_TABS + 1 }, (_, index) =>
      makeTab({
        id: `tab-${index}`,
        pathname: index === 0 ? DASHBOARD_TAB_PATH : knownPath(index),
        pinned: index === 0,
        // 最早的非钉选标签才是默认淘汰候选；这里把它固定住，淘汰必须顺延
        userPinned: index === 1,
      }),
    )
    const { tabs: next, evictedIds } = openTabIn(tabs, { pathname: '/receipt' })
    expect(next.map((tab) => tab.id)).toContain('tab-1')
    expect(evictedIds).not.toContain('tab-1')
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

  /**
   * 用户固定是显式意图，必须与「结构钉选」分开处理：
   * - `pinned` 仍只认工作台（上一条用例锁定该契约）；
   * - `userPinned` 必须按布尔白名单恢复，否则刷新后"固定"静默失效；
   * - 工作台不接受 `userPinned` 标记（它没有"取消固定"入口）。
   */
  it('用户固定的业务标签可跨刷新恢复，工作台不接受用户固定标记', () => {
    const result = sanitizePersistedTabs([
      {
        id: 'd',
        pathname: DASHBOARD_TAB_PATH,
        search: '',
        pinned: true,
        userPinned: true,
      },
      {
        id: 'pinned-user',
        pathname: '/sales-order',
        search: '',
        pinned: false,
        userPinned: true,
      },
      {
        id: 'plain',
        pathname: '/material',
        search: '',
        pinned: false,
        userPinned: 'yes',
      },
    ])

    const dashboard = result.find((tab) => tab.pathname === DASHBOARD_TAB_PATH)
    expect(dashboard?.pinned).toBe(true)
    expect(dashboard?.userPinned, '工作台不得接受用户固定标记').not.toBe(true)

    const userPinned = result.find((tab) => tab.id === 'pinned-user')
    expect(userPinned?.userPinned).toBe(true)
    expect(userPinned && isTabPinned(userPinned)).toBe(true)

    // 非布尔脏数据不得被当成"已固定"
    const plain = result.find((tab) => tab.id === 'plain')
    expect(plain?.userPinned).toBe(false)
    expect(plain && isTabPinned(plain)).toBe(false)
  })

  it('超限恢复优先保留用户固定的标签', () => {
    const raw = [
      { id: 'd', pathname: '/dashboard', search: '', pinned: true },
      ...Array.from({ length: MAX_LAYOUT_TABS + 1 }, (_, index) => ({
        id: `u${index}`,
        pathname: knownPath(index),
        search: '',
        pinned: false,
        // 排在末尾的用户固定标签：旧的「按顺序截断」会把它丢掉
        userPinned: index > MAX_LAYOUT_TABS - 2,
      })),
    ]

    const result = sanitizePersistedTabs(raw)
    const ids = result.map((tab) => tab.id)

    expect(result).toHaveLength(MAX_LAYOUT_TABS)
    expect(ids).toContain('u10')
    expect(ids).not.toContain('u0')
  })
})

describe('受保护标签的重载恢复', () => {
  it('用户固定标记随防抖落盘并能在重载后恢复', () => {
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
          makeTab({ id: 'supplier', pathname: '/supplier' }),
        ],
        activeTabId: 'supplier',
      })
      useLayoutTabsStore.getState().setTabPinned('supplier', true)

      vi.runAllTimers()
      const raw = values.get(getLayoutTabsStorageKey('anonymous'))
      const persisted = JSON.parse(String(raw)) as {
        tabs: Array<{ id: string; userPinned?: boolean }>
      }
      expect(
        persisted.tabs.find((tab) => tab.id === 'supplier')?.userPinned,
        '用户固定必须落盘，否则刷新后静默失效',
      ).toBe(true)

      // 模拟刷新：store 回初始态后按持久化数据恢复
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
      const restored = useLayoutTabsStore
        .getState()
        .tabs.find((tab) => tab.id === 'supplier')
      expect(restored && isTabPinned(restored)).toBe(true)
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

describe('protectedFromEviction 反映当前状态', () => {
  /**
   * 标记不能是「一旦点亮就永不熄灭」。
   *
   * <p>原实现只在超限时把受保护标签置 true，没有任何路径设回 false，而它会被持久化并让
   * `sanitizePersistedTabs` 优先保留 —— 于是「曾因未保存编辑被保护过一次」的标签永久享有
   * 优待：即使后来已保存、早就不再受保护，重载时仍会挤掉更新的标签。本用例锁定"保护解除后
   * 标记必须回落"。</p>
   */
  it('保护解除后再次开新页, 旧标签的标记被清除', () => {
    const protectedIds = new Set(['a'])
    useLayoutTabsStore.setState({
      tabs: [
        makeTab({
          id: 'dashboard',
          pathname: DASHBOARD_TAB_PATH,
          pinned: true,
        }),
        makeTab({ id: 'a', pathname: '/a' }),
      ],
      activeTabId: 'dashboard',
    })

    // 第一轮: a 持有未保存编辑 → 标记点亮（此时未超限，但标记要如实反映当下）
    useLayoutTabsStore
      .getState()
      .openTab(
        { pathname: '/b' },
        { isProtected: (id) => protectedIds.has(id) },
      )
    expect(
      useLayoutTabsStore.getState().tabs.find((tab) => tab.id === 'a')
        ?.protectedFromEviction,
    ).toBe(true)

    // 第二轮: a 已保存（不再受保护）→ 标记必须回落为 false
    protectedIds.clear()
    useLayoutTabsStore
      .getState()
      .openTab(
        { pathname: '/c' },
        { isProtected: (id) => protectedIds.has(id) },
      )
    expect(
      useLayoutTabsStore.getState().tabs.find((tab) => tab.id === 'a')
        ?.protectedFromEviction,
    ).toBe(false)
  })

  it('未提供 isProtected 时不改动既有标记', () => {
    useLayoutTabsStore.setState({
      tabs: [
        makeTab({
          id: 'dashboard',
          pathname: DASHBOARD_TAB_PATH,
          pinned: true,
        }),
        makeTab({ id: 'a', pathname: '/a', protectedFromEviction: true }),
      ],
      activeTabId: 'dashboard',
    })

    // 无保护语义的调用方不应把已有标记抹掉
    useLayoutTabsStore.getState().openTab({ pathname: '/b' })
    expect(
      useLayoutTabsStore.getState().tabs.find((tab) => tab.id === 'a')
        ?.protectedFromEviction,
    ).toBe(true)
  })
})

describe('setTabLocation 的 pathname 唯一性守卫', () => {
  /**
   * 「同一 pathname 只有一个标签对象」是多标签机制的根基：`ensureTabIn` / `openTabIn`
   * 都用 `findIndex(pathname)` 定位，一旦出现两个同 pathname 标签，按 pathname 查找永远只命中
   * 第一个，另一个成为无法通过 `openTab` 激活的孤儿（子 Router 与会话一直挂着）。
   */
  it('拒绝把标签改名成另一个标签已在用的 pathname', () => {
    useLayoutTabsStore.setState({
      tabs: [
        makeTab({
          id: 'dashboard',
          pathname: DASHBOARD_TAB_PATH,
          pinned: true,
        }),
        makeTab({ id: 'a', pathname: '/a' }),
        makeTab({ id: 'b', pathname: '/b' }),
      ],
      activeTabId: 'a',
    })

    useLayoutTabsStore.getState().setTabLocation('b', {
      pathname: '/a',
      search: '',
    })

    const tabs = useLayoutTabsStore.getState().tabs
    expect(tabs.filter((tab) => tab.pathname === '/a')).toHaveLength(1)
    expect(tabs.find((tab) => tab.id === 'b')?.pathname).toBe('/b')
  })

  it('同一标签自身改 search 不受影响', () => {
    useLayoutTabsStore.setState({
      tabs: [
        makeTab({
          id: 'dashboard',
          pathname: DASHBOARD_TAB_PATH,
          pinned: true,
        }),
        makeTab({ id: 'a', pathname: '/a' }),
      ],
      activeTabId: 'a',
    })

    useLayoutTabsStore
      .getState()
      .setTabLocation('a', { pathname: '/a', search: 'docNo=1' })

    expect(
      useLayoutTabsStore.getState().tabs.find((tab) => tab.id === 'a')?.search,
    ).toBe('docNo=1')
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
