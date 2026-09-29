// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldAdoptMainSearchForUnmountedTab } from './useTabRouteReconciliation'

const getTabRouterHrefMock = vi.fn<(tabId: string) => string | null>(() => null)
const pushExternalIntentMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('@/layouts/tabs/tab-location-sync', () => ({
  getTabRouterHref: (tabId: string) => getTabRouterHrefMock(tabId),
  pushExternalIntent: (tabId: string, href: string) => {
    pushExternalIntentMock(tabId, href)
  },
}))

vi.mock('@/router', () => ({
  router: {
    history: { replace: (href: string) => replaceMock(href) },
    state: { location: { href: '' } },
  },
}))

let currentLocation = {
  pathname: '/purchase-inbound',
  searchStr: '',
  href: '/purchase-inbound',
}

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => currentLocation,
}))

vi.mock('@/stores/layoutTabsStore', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/stores/layoutTabsStore')>()
  return {
    ...actual,
    // 路由注册表在单测中不加载页面清单，这里只放行被测路径。
    isRegisteredPagePath: () => true,
  }
})

const { useTabRouteReconciliation } = await import(
  './useTabRouteReconciliation'
)
const { useLayoutTabsStore } = await import('@/stores/layoutTabsStore')

const INBOUND_TAB_ID = 'tab-purchase-inbound'
const PARENT_IMPORT_SEARCH =
  'sourceModule=purchase-order&sourceRecordId=9007199254740993'

function Harness() {
  useTabRouteReconciliation()
  return null
}

describe('shouldAdoptMainSearchForUnmountedTab', () => {
  it('未挂载 Tab 且主路由携带查询串时写回 Tab 状态', () => {
    expect(
      shouldAdoptMainSearchForUnmountedTab(null, PARENT_IMPORT_SEARCH),
    ).toBe(true)
  })

  it('已挂载 Tab 交给子 Router 注入，不写回', () => {
    expect(
      shouldAdoptMainSearchForUnmountedTab('/purchase-inbound', 'docNo=PO-1'),
    ).toBe(false)
  })

  it('主地址栏无查询串时保持 Tab 原有筛选', () => {
    expect(shouldAdoptMainSearchForUnmountedTab(null, '')).toBe(false)
    expect(shouldAdoptMainSearchForUnmountedTab(null, '?')).toBe(false)
  })
})

describe('useTabRouteReconciliation', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    getTabRouterHrefMock.mockReset()
    getTabRouterHrefMock.mockReturnValue(null)
    pushExternalIntentMock.mockReset()
    replaceMock.mockReset()
    useLayoutTabsStore.setState({
      tabs: [
        {
          id: INBOUND_TAB_ID,
          pathname: '/purchase-inbound',
          search: '',
          pinned: false,
          mountedOnce: true,
          reloadKey: 0,
        },
      ],
      activeTabId: 'tab-dashboard',
    })
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
    root = null
    container = null
  })

  function renderHook() {
    container = document.createElement('div')
    document.body.append(container)
    const host = container
    root = createRoot(host)
    act(() => {
      root?.render(createElement(Harness))
    })
  }

  it('未挂载的已有 Tab 仍接收本次跳转的父级导入意图', () => {
    currentLocation = {
      pathname: '/purchase-inbound',
      searchStr: PARENT_IMPORT_SEARCH,
      href: `/purchase-inbound?${PARENT_IMPORT_SEARCH}`,
    }

    renderHook()

    const tab = useLayoutTabsStore
      .getState()
      .tabs.find((item) => item.id === INBOUND_TAB_ID)
    expect(tab?.search).toBe(PARENT_IMPORT_SEARCH)
    expect(useLayoutTabsStore.getState().activeTabId).toBe(INBOUND_TAB_ID)
    // 未挂载时不存在子 Router，不应注入意图。
    expect(pushExternalIntentMock).not.toHaveBeenCalled()
  })

  it('主地址栏无查询串时不覆盖未挂载 Tab 已保存的筛选', () => {
    useLayoutTabsStore.setState({
      tabs: [
        {
          id: INBOUND_TAB_ID,
          pathname: '/purchase-inbound',
          search: 'docNo=PO-1',
          pinned: false,
          mountedOnce: true,
          reloadKey: 0,
        },
      ],
      activeTabId: 'tab-dashboard',
    })
    currentLocation = {
      pathname: '/purchase-inbound',
      searchStr: '',
      href: '/purchase-inbound',
    }

    renderHook()

    const tab = useLayoutTabsStore
      .getState()
      .tabs.find((item) => item.id === INBOUND_TAB_ID)
    expect(tab?.search).toBe('docNo=PO-1')
  })

  it('已挂载 Tab 仍通过子 Router 注入外部意图', () => {
    getTabRouterHrefMock.mockReturnValue('/purchase-inbound')
    currentLocation = {
      pathname: '/purchase-inbound',
      searchStr: PARENT_IMPORT_SEARCH,
      href: `/purchase-inbound?${PARENT_IMPORT_SEARCH}`,
    }

    renderHook()

    expect(pushExternalIntentMock).toHaveBeenCalledWith(
      INBOUND_TAB_ID,
      `/purchase-inbound?${PARENT_IMPORT_SEARCH}`,
    )
  })
})
