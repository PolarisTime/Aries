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
