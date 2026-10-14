// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { getTabRouterHref } from '@/layouts/tabs/tab-location-sync'
import {
  DASHBOARD_TAB_PATH,
  type LayoutTab,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

// 本用例只验证兜底资源回收 effect, 与标签栏/面包屑/路由协调无关:
// 后三者各自要连主 Router(或 antd Tabs 的 ResizeObserver), 在 jsdom 里是纯噪音。
vi.mock('@/layouts/AppBreadcrumb', () => ({ AppBreadcrumb: () => null }))
vi.mock('@/layouts/tabs/LayoutTabBar', () => ({ LayoutTabBar: () => null }))
vi.mock('@/layouts/tabs/useTabRouteReconciliation', () => ({
  useTabRouteReconciliation: () => {},
}))
// 真实 RouterProvider 会在每个面板里渲染整棵业务路由树; 换成空壳后,
// attachTabRouter/detachTabRouter 仍走真实实现, 资源回收才可观测。
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, RouterProvider: () => null }
})

import { AppTabContainer } from './AppTabContainer'

function makeTab(id: string, pathname: string, pinned = false): LayoutTab {
  return {
    id,
    pathname,
    search: '',
    pinned,
    mountedOnce: true,
    reloadKey: 0,
  }
}

const TABS: LayoutTab[] = [
  makeTab('tab-dashboard', DASHBOARD_TAB_PATH, true),
  makeTab('tab-a', '/material'),
  makeTab('tab-evicted', '/supplier'),
]

describe('AppTabContainer 资源回收', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    useLayoutTabsStore.setState({
      tabs: TABS,
      activeTabId: 'tab-a',
    })
    editorSessionStore.clearAll()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    editorSessionStore.clearAll()
  })

  const render = () => {
    act(() => {
      root.render(createElement(AppTabContainer))
    })
  }

  it('标签消失(超上限淘汰/切换用户/截断)后回收其子 Router 与编辑器会话槽', () => {
    // 前置条件: 被淘汰标签确实持有子 Router 与未保存会话, 否则断言无法区分「本来就没有」
    editorSessionStore.beginSession('tab-evicted', {
      moduleKey: 'supplier',
      mode: 'edit',
    })
    editorSessionStore.setSessionStatus('tab-evicted', 'dirty')

    render()

    expect(
      getTabRouterHref('tab-evicted'),
      '前置条件: 常驻标签必须已挂载子 Router',
    ).not.toBeNull()
    expect(
      editorSessionStore.hasSession('tab-evicted'),
      '前置条件: 该标签持有编辑器会话',
    ).toBe(true)
    expect(getTabRouterHref('tab-a')).not.toBeNull()

    // 等价于超上限淘汰把 store 里的标签摘掉(淘汰发生在 store 内部, 调用方拿不到时机)
    act(() => {
      useLayoutTabsStore.setState({
        tabs: useLayoutTabsStore
          .getState()
          .tabs.filter((tab) => tab.id !== 'tab-evicted'),
      })
    })

    expect(
      getTabRouterHref('tab-evicted'),
      '淘汰后子 Router 必须被 detach, 不能泄漏在 tabRouters 里',
    ).toBeNull()
    expect(
      editorSessionStore.hasSession('tab-evicted'),
      '淘汰后编辑器会话槽必须被清空, 否则脏状态会挂在已不存在的标签上',
    ).toBe(false)
    // 未消失的标签不受影响(回收只针对消失的 id)
    expect(getTabRouterHref('tab-a')).not.toBeNull()
    expect(editorSessionStore.hasSession('tab-a')).toBe(false)
  })

  it('同时消失多个标签时逐个回收', () => {
    render()
    expect(getTabRouterHref('tab-a')).not.toBeNull()
    expect(getTabRouterHref('tab-evicted')).not.toBeNull()

    act(() => {
      useLayoutTabsStore.setState({
        tabs: useLayoutTabsStore.getState().tabs.filter((tab) => tab.pinned),
        activeTabId: 'tab-dashboard',
      })
    })

    expect(getTabRouterHref('tab-a')).toBeNull()
    expect(getTabRouterHref('tab-evicted')).toBeNull()
    // 钉选的工作台仍在
    expect(getTabRouterHref('tab-dashboard')).not.toBeNull()
  })
})
