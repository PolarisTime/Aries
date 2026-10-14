// @vitest-environment jsdom

import { Activity, act, createElement, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { tabPanelDomId } from '@/layouts/tabs/tab-aria-ids'
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
// 真实 RouterProvider 会在每个面板里渲染整棵业务路由树；换成浅壳后,
// attachTabRouter/detachTabRouter 仍走真实实现, 资源回收才可观测。
// 壳里保留一个面板内容节点：Activity 隐藏的是子树宿主节点（也就是它），断言要看这里。
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    RouterProvider: () => <div className="probe-panel-content" />,
  }
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

describe('AppTabContainer 激活即已挂载', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
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

  /**
   * 「激活即已挂载」不变式守护（浏览器层由 tests/e2e/navigation.spec.ts 的 P2-25 覆盖可观测后果）：
   * 竞态本体已收口（hydrate 移到布局阶段 + 建标签收成幂等入口），本用例守住结果不变式——
   * 任何来源（含 `mountedOnce=false` 的恢复标签）只要成为激活项，就必须在提交后被记为已挂载。
   * 本组件在激活时无条件渲染该标签的面板，若漏记，它一转非激活面板就会被卸载重建。
   */
  it('激活的标签(即使 mountedOnce=false)在渲染后被记为已挂载', () => {
    useLayoutTabsStore.setState({
      tabs: [
        makeTab('tab-dashboard', DASHBOARD_TAB_PATH, true),
        { ...makeTab('tab-hydrated', '/material'), mountedOnce: false },
      ],
      activeTabId: 'tab-hydrated',
    })

    act(() => {
      root.render(createElement(AppTabContainer))
    })

    // 激活即挂载：面板已渲染并建立子 Router
    expect(getTabRouterHref('tab-hydrated')).not.toBeNull()
    // 且该事实必须被记录，否则转非激活后面板会被卸载重建
    expect(
      useLayoutTabsStore
        .getState()
        .tabs.find((tab) => tab.id === 'tab-hydrated')?.mountedOnce,
      '激活的标签必须被记为已挂载',
    ).toBe(true)

    // 转非激活后常驻：子 Router 不被销毁（面板由 mountedOnce 决定是否保留）
    act(() => {
      useLayoutTabsStore.setState({ activeTabId: 'tab-dashboard' })
    })
    expect(
      getTabRouterHref('tab-hydrated'),
      '已挂载标签转非激活后必须常驻',
    ).not.toBeNull()
  })
})

describe('AppTabContainer 用 Activity 承载非激活面板', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    editorSessionStore.clearAll()
    useLayoutTabsStore.setState({ tabs: TABS, activeTabId: 'tab-a' })
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

  const panelOf = (tabId: string): HTMLElement => {
    const panel = document.getElementById(tabPanelDomId(tabId))
    if (!panel) throw new Error(`未找到面板 ${tabId}`)
    return panel
  }

  const activate = (tabId: string) => {
    act(() => {
      useLayoutTabsStore.setState({ activeTabId: tabId })
    })
  }

  /**
   * 语义边界（官方语义）：Activity 在 hidden 时用 `display:none !important` 隐藏子树、
   * 销毁子树 effect，但 **state 与 DOM 全部保留**；恢复时重跑 setup。
   * 本用例钉住三件实现依赖的东西：隐藏靠内联 display（不是 hidden 属性）、DOM/子 Router 不重建、
   * 恢复后重新可见。
   */
  it('非激活面板的内容被 display:none 隐藏, DOM 与子 Router 都保留, 恢复后重新可见', () => {
    render()

    const contentOf = (tabId: string): HTMLElement => {
      const node = panelOf(tabId).querySelector<HTMLElement>(
        '.probe-panel-content',
      )
      if (!node) throw new Error(`面板 ${tabId} 内没有内容节点`)
      return node
    }

    expect(
      contentOf('tab-a').style.display,
      '前置条件：激活面板内容必须可见',
    ).not.toBe('none')
    expect(
      contentOf('tab-evicted').style.display,
      '非激活面板的内容必须被 Activity 的 display:none 隐藏',
    ).toBe('none')
    expect(
      contentOf('tab-evicted').style.getPropertyPriority('display'),
      'Activity 用 !important，避免被面板上的 display:flex 顶回来',
    ).toBe('important')
    expect(
      panelOf('tab-evicted').hasAttribute('hidden'),
      '走 Activity 时不得再设 hidden 属性（恢复只清内联 display）',
    ).toBe(false)
    expect(
      panelOf('tab-a').getAttribute('data-tab-active'),
      '激活锚点：隐藏态没有 hidden 属性可判，DOM 查询要靠它',
    ).toBe('true')
    expect(panelOf('tab-evicted').getAttribute('data-tab-active')).toBeNull()
    expect(
      getTabRouterHref('tab-evicted'),
      'DOM 与子 Router 都必须保留（重建即丢面板内状态）',
    ).not.toBeNull()

    activate('tab-evicted')

    expect(contentOf('tab-evicted').style.display).not.toBe('none')
    expect(contentOf('tab-a').style.display).toBe('none')
    expect(getTabRouterHref('tab-a')).not.toBeNull()
    expect(panelOf('tab-evicted').getAttribute('data-tab-active')).toBe('true')
  })
})

/** 模拟面板内的 body 级弹层：antd Modal / Dropdown 的 portal 走的是同一条 createPortal 路径。 */
function PortalProbe() {
  return createPortal(
    createElement('div', { id: 'probe-popup' }, '弹层'),
    document.body,
  )
}

interface ListenerCounters {
  adds: number
  removes: number
}

/** 模拟面板内的 document 级监听（真实场景是 WorkspaceOverlay 的焦点陷阱）。 */
function DocumentListenerProbe({ counters }: { counters: ListenerCounters }) {
  useEffect(() => {
    const handler = () => undefined
    document.addEventListener('keydown', handler)
    counters.adds += 1
    return () => {
      document.removeEventListener('keydown', handler)
      counters.removes += 1
    }
  }, [counters])
  return null
}

/**
 * 会话宿主哨兵探针：编辑器用「哨兵节点还在不在文档里」区分隐藏与卸载
 * （Activity 隐藏会置空 host node 的 ref，所以 ref 不可用）。
 */
function SessionSentinelProbe({ observations }: { observations: boolean[] }) {
  useEffect(() => {
    return () => {
      observations.push(document.getElementById('probe-sentinel') !== null)
    }
  }, [observations])
  return <span id="probe-sentinel" hidden aria-hidden="true" />
}

describe('Activity 隐藏态语义（本实现依赖的官方行为）', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  const renderBoundary = (
    mode: 'hidden' | 'visible',
    children: ReturnType<typeof createElement>,
  ) => {
    act(() => {
      root.render(createElement(Activity, { mode, children }))
    })
  }

  /**
   * 隐藏态要「关闭弹层」的落地方式：Activity 不只隐藏宿主节点，子树里的 portal
   * （Modal / Dropdown 的渲染路径）也一起被 display:none 隐藏，视觉、指针与键盘都不可达；
   * 恢复后弹层还原（keep-alive：不销毁组件状态，用户切回来不会丢未完成的操作）。
   */
  it('隐藏时子树内的 portal（Modal/Dropdown 路径）一起不可见, 恢复后还原', () => {
    renderBoundary('hidden', createElement(PortalProbe))
    const hiddenPopup = document.getElementById('probe-popup')
    expect(hiddenPopup, '前置条件：portal 节点必须已渲染').not.toBeNull()
    expect(
      hiddenPopup?.style.display,
      '隐藏面板里的弹层必须连同 subtree 一起 display:none，不能悬在别的标签上',
    ).toBe('none')

    renderBoundary('visible', createElement(PortalProbe))
    expect(document.getElementById('probe-popup')?.style.display).not.toBe(
      'none',
    )
  })

  /**
   * 隐藏态不得在别的标签里抢键盘：面板内挂 document 级监听的组件（焦点陷阱）
   * 随子树 effect 销毁而摘掉监听，恢复时才重新武装。
   */
  /**
   * 会话生命周期靠这条语义区分「隐藏」与「卸载」：隐藏时节点还在文档里（ref 已被 React 置空），
   * 卸载时节点已被移除。少了它，隐藏就会误判成卸载并把未保存会话清掉。
   */
  it('哨兵节点可区分隐藏与卸载：隐藏时还在文档里, 卸载后已移除', () => {
    const observations: boolean[] = []

    renderBoundary(
      'visible',
      createElement(SessionSentinelProbe, { observations }),
    )
    renderBoundary(
      'hidden',
      createElement(SessionSentinelProbe, { observations }),
    )
    expect(
      observations[0],
      '前置条件：Activity 隐藏时哨兵节点必须还在文档里（隐藏不等于卸载）',
    ).toBe(true)

    renderBoundary(
      'visible',
      createElement(SessionSentinelProbe, { observations }),
    )
    act(() => {
      root.unmount()
    })
    expect(
      observations[1],
      '真正卸载后哨兵节点必须已被移除（此时才结束会话）',
    ).toBe(false)
  })

  it('隐藏时摘掉 document 级监听（焦点陷阱不抢 Tab）, 恢复时重新武装', () => {
    const counters: ListenerCounters = { adds: 0, removes: 0 }

    renderBoundary(
      'visible',
      createElement(DocumentListenerProbe, { counters }),
    )
    expect(counters.adds, '前置条件：可见时必须已注册监听').toBe(1)
    expect(counters.removes).toBe(0)

    renderBoundary('hidden', createElement(DocumentListenerProbe, { counters }))
    expect(
      counters.removes,
      '隐藏时必须摘掉监听，否则隐藏面板的焦点陷阱会在当前标签里抢 Tab/Escape',
    ).toBe(1)

    renderBoundary(
      'visible',
      createElement(DocumentListenerProbe, { counters }),
    )
    expect(counters.adds, '恢复时必须重新武装').toBe(2)
    expect(counters.removes, '监听数不得累积').toBe(1)
  })
})
