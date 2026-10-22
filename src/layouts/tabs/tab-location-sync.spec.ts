// @vitest-environment jsdom

import { createMemoryHistory } from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LayoutTab } from '@/stores/layoutTabsStore'

/**
 * 回归：13.5.0 引入「同一 pathname 只能有一个标签」守卫后，`setTabLocation` 会拒绝把标签
 * 改名成别的标签已在用的 pathname。当时只拒绝了改名、**没有回退子 Router**，于是
 * 「标签 pathname = A、子 Router = B」永久分叉：
 *
 * 1. 点 A 的菜单时 `useTabOpen` 按子 Router 的 href 把地址栏推到 B；
 * 2. 协调层按地址栏激活 B，跟随逻辑又把地址栏推回 A；
 * 3. 两处反复拉锯 → 地址栏在 A/B 之间来回跳 + React `Maximum update depth exceeded`。
 *
 * 本用例钉住修复后的契约：拒绝改名时必须把子 Router 退回标签自己的 href，同时把目标
 * href 交给主地址栏（由协调层激活已占用该 pathname 的标签并注入意图）。
 */

const { mainLog, mainState, applyMain } = vi.hoisted(() => {
  const mainLog: Array<{ kind: 'push' | 'replace'; href: string }> = []
  const mainState = {
    location: { href: '/dashboard', pathname: '/dashboard', searchStr: '' },
  }
  function applyMain(kind: 'push' | 'replace', href: string) {
    const [pathname, searchStr = ''] = href.split('?')
    mainState.location = { href, pathname, searchStr }
    mainLog.push({ kind, href })
  }
  return { mainLog, mainState, applyMain }
})

vi.mock('@/router', () => ({
  router: {
    history: {
      push: (href: string) => applyMain('push', href),
      replace: (href: string) => applyMain('replace', href),
    },
    get state() {
      return mainState
    },
  },
}))

vi.mock('@/router/tab-router', () => ({
  createTabRouter: (initialHref: string) => {
    const history = createMemoryHistory({ initialEntries: [initialHref] })
    return { history, dispose: () => {} }
  },
}))

const {
  attachTabRouter,
  detachAllTabRouters,
  getTabRouterHref,
  resolveTabHref,
} = await import('./tab-location-sync')
const { useLayoutTabsStore } = await import('@/stores/layoutTabsStore')

function makeTab(id: string, pathname: string, search = ''): LayoutTab {
  return {
    id,
    pathname,
    search,
    pinned: false,
    mountedOnce: true,
    reloadKey: 0,
  }
}

describe('tab-location-sync：页内导航把标签改名', () => {
  beforeEach(() => {
    mainLog.length = 0
    mainState.location = {
      href: '/dashboard',
      pathname: '/dashboard',
      searchStr: '',
    }
    useLayoutTabsStore.setState({
      tabs: [makeTab('dashboard', '/dashboard')],
      activeTabId: 'dashboard',
    })
  })

  afterEach(() => {
    detachAllTabRouters()
  })

  it('目标 pathname 已有别的标签：不改名，子 Router 退回自己的 href，目标 href 交给主地址栏', () => {
    const tabA = makeTab('a', '/sales-order')
    const tabB = makeTab('b', '/sales-outbound')
    useLayoutTabsStore.setState({ tabs: [tabA, tabB], activeTabId: 'a' })

    const subA = attachTabRouter(tabA)
    subA.history.push(
      '/sales-outbound?sourceModule=sales-order&sourceRecordId=1',
    )

    // 标签元数据不变：同一 pathname 只能有一个标签
    const storedA = useLayoutTabsStore
      .getState()
      .tabs.find((tab) => tab.id === 'a')
    expect(storedA?.pathname).toBe('/sales-order')
    expect(
      useLayoutTabsStore
        .getState()
        .tabs.filter((tab) => tab.pathname === '/sales-outbound'),
    ).toHaveLength(1)

    // 关键：子 Router 必须退回自己的 href，不能留在别的页面上
    expect(getTabRouterHref('a')).toBe('/sales-order')
    expect(resolveTabHref(storedA as LayoutTab)).toBe('/sales-order')

    // 外部意图仍交给主地址栏，协调层据此激活 /sales-outbound 标签并注入参数
    expect(mainLog.at(-1)).toEqual({
      kind: 'replace',
      href: '/sales-outbound?sourceModule=sales-order&sourceRecordId=1',
    })
  })

  it('目标 pathname 没有别的标签时仍正常改名并同步地址栏', () => {
    const tabA = makeTab('a', '/sales-order')
    useLayoutTabsStore.setState({ tabs: [tabA], activeTabId: 'a' })

    const subA = attachTabRouter(tabA)
    subA.history.push('/sales-outbound?docNo=SO-1')

    const storedA = useLayoutTabsStore
      .getState()
      .tabs.find((tab) => tab.id === 'a')
    expect(storedA?.pathname).toBe('/sales-outbound')
    expect(storedA?.search).toBe('docNo=SO-1')
    expect(mainLog.at(-1)).toEqual({
      kind: 'replace',
      href: '/sales-outbound?docNo=SO-1',
    })
  })
})

describe('resolveTabHref：地址栏取用的 href 唯一来源', () => {
  beforeEach(() => {
    mainLog.length = 0
    useLayoutTabsStore.setState({
      tabs: [makeTab('dashboard', '/dashboard')],
      activeTabId: 'dashboard',
    })
  })

  afterEach(() => {
    detachAllTabRouters()
  })

  it('未挂载子 Router 时退回标签自己的 pathname+search', () => {
    expect(resolveTabHref(makeTab('a', '/sales-order', 'docNo=SO-1'))).toBe(
      '/sales-order?docNo=SO-1',
    )
  })

  it('子 Router 与标签 pathname 一致时采用子 Router 的完整 href', () => {
    const tab = makeTab('a', '/sales-order')
    useLayoutTabsStore.setState({ tabs: [tab], activeTabId: 'a' })
    const sub = attachTabRouter(tab)
    sub.history.push('/sales-order?docNo=SO-2')

    expect(resolveTabHref(useLayoutTabsStore.getState().tabs[0])).toBe(
      '/sales-order?docNo=SO-2',
    )
  })
})
