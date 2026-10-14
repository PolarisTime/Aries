// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { getTabRouterHref } from '@/layouts/tabs/tab-location-sync'
import { useLayoutTabsHydration } from '@/layouts/tabs/use-layout-tabs-hydration'
import { useLayoutTabsStore } from '@/stores/layoutTabsStore'
import { getLayoutTabsStorageKey } from '@/utils/storage'

// 与 AppLayout 同构：Harness 是父组件（负责 hydrate 的布局阶段），
// AppTabContainer 是子组件（负责定位 effect）。顺序敏感，不能压平。
vi.mock('@/layouts/AppBreadcrumb', () => ({ AppBreadcrumb: () => null }))
vi.mock('@/layouts/tabs/LayoutTabBar', () => ({ LayoutTabBar: () => null }))
// 真实 RouterProvider 会渲染整棵业务路由树；面板内容与本用例无关，
// 但 attachTabRouter/detachTabRouter 仍走真实实现，面板是否挂载可观测。
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useLocation: () => currentLocation,
    RouterProvider: () => null,
  }
})
vi.mock('@/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/router')>()
  return {
    ...actual,
    router: {
      history: { push: vi.fn(), replace: vi.fn() },
      state: { location: { href: '' } },
    },
  }
})
vi.mock('@/stores/layoutTabsStore', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/stores/layoutTabsStore')>()
  return {
    ...actual,
    // 路由注册表在单测中不加载页面清单，这里只放行被测路径。
    isRegisteredPagePath: () => true,
  }
})

const { AppTabContainer } = await import('@/layouts/tabs/AppTabContainer')

const DEEP_LINK_PATH = '/material'
const DEEP_LINK_SEARCH = 'docNo=M-1'

let currentLocation = {
  pathname: DEEP_LINK_PATH,
  searchStr: DEEP_LINK_SEARCH,
  href: `${DEEP_LINK_PATH}?${DEEP_LINK_SEARCH}`,
}

const HARNESS_USER_ID = 'user-hydration-race'

function LayoutHarness() {
  useLayoutTabsHydration({
    authReady: true,
    userId: HARNESS_USER_ID,
    location: currentLocation,
  })
  return createElement(AppTabContainer)
}

describe('深链标签初始化竞态（子定位 effect vs 父 hydrate）', () => {
  let container: HTMLDivElement
  let root: Root
  let observedIds: string[]

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    currentLocation = {
      pathname: DEEP_LINK_PATH,
      searchStr: DEEP_LINK_SEARCH,
      href: `${DEEP_LINK_PATH}?${DEEP_LINK_SEARCH}`,
    }
    localStorage.clear()
    useLayoutTabsStore.setState({ tabs: [], activeTabId: null })
    observedIds = []
    useLayoutTabsStore.subscribe((state) => {
      const tab = state.tabs.find((item) => item.pathname === DEEP_LINK_PATH)
      if (tab) observedIds.push(tab.id)
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    localStorage.clear()
  })

  const render = () => {
    act(() => {
      root.render(createElement(LayoutHarness))
    })
  }

  /**
   * 竞态回归守护：hydrate 必须在子容器的定位 effect 之前完成（布局阶段），
   * 否则子先建 X、父后建 Y，同一路径先后存在两个标签对象，X 的 `mountedOnce` 被静默丢弃。
   * 回退 `useLayoutTabsHydration` 为 useEffect 后，本用例观察到的标签 id 会变成两个。
   */
  it('hydrate 与定位 effect 对同一深链只产生一个标签对象, 且被标记为已挂载', () => {
    render()

    const tab = useLayoutTabsStore
      .getState()
      .tabs.find((item) => item.pathname === DEEP_LINK_PATH)
    expect(tab, '深链必须落地为标签').toBeDefined()
    if (!tab) return
    observedIds.push(tab.id)

    expect(
      new Set(observedIds).size,
      `同一路径被建了多个标签对象（顺序：${observedIds.join(' → ')}）`,
    ).toBe(1)
    expect(tab.search, '深链查询串必须保留').toBe(DEEP_LINK_SEARCH)
    expect(tab.mountedOnce, '落地标签必须被标记为已挂载').toBe(true)
    expect(useLayoutTabsStore.getState().activeTabId).toBe(tab.id)
    expect(
      getTabRouterHref(tab.id),
      '落地标签必须渲染面板并建立子 Router',
    ).not.toBeNull()
    expect(
      container.querySelector(`#leo-tab-panel-${tab.id}`),
      '面板外壳必须存在',
    ).not.toBeNull()
  })

  it('持久化清单已含同路径标签时 hydrate 复用其 id 与位置, 只更新查询串', () => {
    localStorage.setItem(
      getLayoutTabsStorageKey(HARNESS_USER_ID),
      JSON.stringify({
        tabs: [
          {
            id: 'persisted-material',
            pathname: DEEP_LINK_PATH,
            search: 'tabFilter=1',
          },
        ],
        activeTabId: 'persisted-material',
      }),
    )
    render()

    const tabs = useLayoutTabsStore
      .getState()
      .tabs.filter((item) => item.pathname === DEEP_LINK_PATH)
    expect(tabs, '同一路径只能有一个标签').toHaveLength(1)
    expect(tabs[0].id, '必须复用持久化标签而不是新建').toBe(
      'persisted-material',
    )
    expect(tabs[0].search, '深链查询串优先于上次工作区').toBe(DEEP_LINK_SEARCH)
    expect(useLayoutTabsStore.getState().activeTabId).toBe('persisted-material')
  })
})
