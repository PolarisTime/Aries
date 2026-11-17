// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldAdoptMainSearchForUnmountedTab } from './useTabRouteReconciliation'

const getTabRouterHrefMock = vi.fn<(tabId: string) => string | null>(() => null)
const pushExternalIntentMock = vi.fn()
const replaceMock = vi.fn()
const pushMock = vi.fn()
const requestCloseMock =
  vi.fn<(t: unknown, tabId: string, onClose: () => void) => void>()

vi.mock('@/layouts/tabs/tab-location-sync', () => ({
  getTabRouterHref: (tabId: string) => getTabRouterHrefMock(tabId),
  pushExternalIntent: (tabId: string, href: string) => {
    pushExternalIntentMock(tabId, href)
  },
  resolveTabHref: (tab: { id: string; pathname: string; search: string }) => {
    const subHref = getTabRouterHrefMock(tab.id)
    const ownHref = tab.search ? `${tab.pathname}?${tab.search}` : tab.pathname
    if (subHref && subHref.split('?')[0].replace(/\/+$/, '') === tab.pathname) {
      return subHref
    }
    return ownHref
  },
}))

vi.mock('@/layouts/editor-session/request-close', () => ({
  requestEditorSessionClose: (t: unknown, tabId: string, onClose: () => void) =>
    requestCloseMock(t, tabId, onClose),
}))

vi.mock('@/router', () => ({
  router: {
    history: {
      replace: (href: string) => replaceMock(href),
      push: (href: string) => pushMock(href),
    },
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
const { editorSessionStore } = await import(
  '@/layouts/editor-session/editor-session-store'
)

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
    pushMock.mockReset()
    requestCloseMock.mockReset()
    editorSessionStore.clearAll()
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
    editorSessionStore.clearAll()
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

  it('子 Router 与标签分叉时收敛回标签 href，不把地址栏拉到别的页面', () => {
    // 历史守卫拒绝改名后，子 Router 可能停在别的 pathname 且带自己的查询串。
    // 协调层若把这段 href 当激活目标写回地址栏，就会与跟随 effect 形成来回跳转。
    getTabRouterHrefMock.mockReturnValue('/sales-order?docNo=SO-1')
    currentLocation = {
      pathname: '/purchase-inbound',
      searchStr: '',
      href: '/purchase-inbound',
    }

    renderHook()

    expect(replaceMock).not.toHaveBeenCalledWith('/sales-order?docNo=SO-1')
    expect(pushExternalIntentMock).toHaveBeenCalledWith(
      INBOUND_TAB_ID,
      '/purchase-inbound',
    )
  })

  /**
   * 单页模型下浏览器后退/前进会绕过 useTabOpen 直接改地址；当前页脏时必须先确认，
   * 否则离开即卸载编辑器、未保存内容静默丢失（真机复现过的缺陷）。
   */
  it('从脏页面被浏览器后退带走时：先恢复地址并弹确认，放弃后才继续导航', () => {
    useLayoutTabsStore.setState({
      tabs: [
        {
          id: 'tab-dashboard',
          pathname: '/dashboard',
          search: '',
          pinned: true,
          mountedOnce: true,
          reloadKey: 0,
        },
        {
          id: INBOUND_TAB_ID,
          pathname: '/purchase-inbound',
          search: 'x=1',
          pinned: false,
          mountedOnce: true,
          reloadKey: 0,
        },
      ],
      activeTabId: INBOUND_TAB_ID,
    })
    editorSessionStore.beginSession(INBOUND_TAB_ID, {
      moduleKey: 'purchase-inbound',
      mode: 'create',
    })
    editorSessionStore.setSessionStatus(INBOUND_TAB_ID, 'dirty')
    currentLocation = {
      pathname: '/dashboard',
      searchStr: '',
      href: '/dashboard',
    }

    renderHook()

    // 地址先被拉回当前页（取消这次离开），并弹出与关闭页签相同的确认框
    expect(replaceMock).toHaveBeenCalledWith('/purchase-inbound?x=1')
    expect(requestCloseMock).toHaveBeenCalledTimes(1)
    expect(requestCloseMock.mock.calls[0]?.[1]).toBe(INBOUND_TAB_ID)
    // 确认期间不得新建/移除标签（否则面板已经切走，确认框就失去意义）
    expect(useLayoutTabsStore.getState().tabs.map((tab) => tab.id)).toEqual([
      'tab-dashboard',
      INBOUND_TAB_ID,
    ])
    expect(useLayoutTabsStore.getState().activeTabId).toBe(INBOUND_TAB_ID)

    // 用户选择「放弃修改」后，按原目标重新导航
    const onConfirmed = requestCloseMock.mock.calls[0]?.[2]
    act(() => {
      onConfirmed?.()
    })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })
})
