import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DASHBOARD_TAB_PATH,
  ensureTabIn,
  type LayoutTab,
  MAX_LAYOUT_TABS,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

function makeTab(overrides: Partial<LayoutTab> = {}): LayoutTab {
  return {
    id: `tab-${Math.random().toString(36).slice(2)}`,
    pathname: '/material',
    search: '',
    pinned: false,
    mountedOnce: false,
    reloadKey: 0,
    ...overrides,
  }
}

const DASHBOARD = makeTab({
  id: 'tab-dashboard',
  pathname: DASHBOARD_TAB_PATH,
  pinned: true,
})

const DEEP_LINK = { pathname: '/material', search: 'docNo=M-1' }

describe('ensureTabIn — 「按 location 建/选标签」的幂等入口', () => {
  it('同一 location 重复调用复用同一个标签对象, 不产生第二个对象', () => {
    const first = ensureTabIn([DASHBOARD], DEEP_LINK)
    expect(first.created, '首次调用必须新建').toBe(true)
    expect(first.tabId).toBeTruthy()

    const second = ensureTabIn(first.tabs, DEEP_LINK)
    expect(second.created, '第二次调用不得再新建').toBe(false)
    expect(second.tabId, '必须复用同一个标签 id').toBe(first.tabId)
    expect(second.tabs, '标签数量不得增加').toHaveLength(first.tabs.length)
    expect(
      second.tabs.find((tab) => tab.pathname === DEEP_LINK.pathname),
      '必须是同一个标签对象(同一路径只会有一个)',
    ).toBe(first.tabs.find((tab) => tab.pathname === DEEP_LINK.pathname))
  })

  it('空查询串沿用标签已保存的筛选, 不覆盖内部状态', () => {
    const opened = ensureTabIn([DASHBOARD], DEEP_LINK)
    const ensured = ensureTabIn(opened.tabs, { pathname: '/material' })
    expect(ensured.created).toBe(false)
    expect(
      ensured.tabs.find((tab) => tab.id === opened.tabId)?.search,
      '菜单点击(无查询串)不得清掉深链/页内筛选',
    ).toBe('docNo=M-1')
  })

  it('携带新查询串时更新同一个标签的查询串', () => {
    const opened = ensureTabIn([DASHBOARD], DEEP_LINK)
    const ensured = ensureTabIn(opened.tabs, {
      pathname: '/material',
      search: 'docNo=M-2',
    })
    expect(ensured.tabId).toBe(opened.tabId)
    expect(ensured.tabs.find((tab) => tab.id === opened.tabId)?.search).toBe(
      'docNo=M-2',
    )
    expect(ensured.tabs).toHaveLength(2)
  })

  it('超出上限时报告被淘汰的标签, 且不淘汰受保护标签', () => {
    const protectedTab = makeTab({ id: 'tab-protected', pathname: '/supplier' })
    const filler = Array.from({ length: MAX_LAYOUT_TABS - 2 }, (_, index) =>
      makeTab({ id: `tab-filler-${index}`, pathname: `/page-${index}` }),
    )
    const ensured = ensureTabIn(
      [DASHBOARD, protectedTab, ...filler],
      { pathname: '/customer' },
      (tabId) => tabId === 'tab-protected',
    )
    expect(ensured.created).toBe(true)
    expect(ensured.evictedIds.length, '必须报告淘汰结果供调用方回收').toBe(1)
    expect(ensured.evictedIds).not.toContain('tab-protected')
    expect(
      ensured.tabs.some((tab) => tab.id === 'tab-protected'),
      '受保护标签宁可超限也不能被丢',
    ).toBe(true)
  })
})

describe('useLayoutTabsStore.ensureTabForLocation — 协调器的唯一入口', () => {
  beforeEach(() => {
    useLayoutTabsStore.setState({
      tabs: [DASHBOARD, makeTab({ id: 'tab-material', pathname: '/material' })],
      activeTabId: DASHBOARD.id,
    })
  })

  it('已有同路径标签时只激活, 不新建也不改动标签列表', () => {
    const before = useLayoutTabsStore.getState().tabs
    const result = useLayoutTabsStore
      .getState()
      .ensureTabForLocation({ pathname: '/material' })

    expect(result.created).toBe(false)
    expect(result.tabId).toBe('tab-material')
    expect(result.evictedIds).toEqual([])
    const after = useLayoutTabsStore.getState()
    expect(after.activeTabId).toBe('tab-material')
    expect(after.tabs, '标签列表对象必须保持不变').toBe(before)
  })

  it('幂等命中且无任何变化时不通知订阅者(避免协调 effect 每次都引发额外渲染)', () => {
    useLayoutTabsStore
      .getState()
      .ensureTabForLocation({ pathname: '/material' })
    const listener = vi.fn()
    const unsubscribe = useLayoutTabsStore.subscribe(listener)

    // 已激活 + 查询串为空: 不产生任何状态变化
    useLayoutTabsStore
      .getState()
      .ensureTabForLocation({ pathname: '/material' })

    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })
})
