// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { MAX_LAYOUT_TABS, useLayoutTabsStore } from '@/stores/layoutTabsStore'
import { LayoutTabBar } from './LayoutTabBar'

const { modalConfirmMock } = vi.hoisted(() => ({ modalConfirmMock: vi.fn() }))

// 接管确认框：测试里只捕获配置、不自动确认，等价于「用户点了取消」。
// 不 mock 的话 modal.confirm 在未绑定 antd App 上下文时是空操作，afterClose 永不执行，
// 会让 request-close 的模块级 confirming 标记永久为 true 并污染后续用例。
vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    destroy: vi.fn(),
  },
  modal: {
    confirm: modalConfirmMock,
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

const TABS = [
  {
    id: 'tab-workbench',
    pathname: '/workbench',
    search: '',
    pinned: true,
    mountedOnce: true,
    reloadKey: 0,
  },
  {
    id: 'tab-price-compare',
    pathname: '/price-compare',
    search: '',
    pinned: false,
    mountedOnce: true,
    reloadKey: 0,
  },
]

describe('LayoutTabBar 右键菜单键盘契约', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    useLayoutTabsStore.setState({
      tabs: TABS,
      activeTabId: 'tab-price-compare',
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    document.querySelectorAll('.ant-dropdown').forEach((el) => {
      el.remove()
    })
  })

  const render = () => {
    act(() => {
      root.render(
        createElement(
          ConfigProvider,
          { theme: { token: { motion: false } } },
          createElement(LayoutTabBar),
        ),
      )
    })
  }

  const tabButton = (title: string) =>
    [...container.querySelectorAll<HTMLElement>('.ant-tabs-tab-btn')].find(
      (element) => element.textContent?.includes(title),
    )

  it('Shift+F10 打开当前聚焦标签的菜单, 菜单带可访问名且焦点进首项', async () => {
    render()
    const button = tabButton('报单比价')
    expect(button).toBeTruthy()
    button?.focus()

    act(() => {
      button?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F10',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    const menu = document.querySelector('.ant-dropdown-menu')
    expect(menu?.getAttribute('role')).toBe('menu')
    expect(menu?.getAttribute('aria-label')).toBe('「报单比价」标签操作菜单')
    expect(document.activeElement).toBe(
      document.querySelector('.ant-dropdown-menu-item'),
    )
  })

  it('上下文菜单键(ContextMenu)同样可唤起', async () => {
    render()
    const button = tabButton('报单比价')
    expect(button, '未找到报单比价标签').toBeTruthy()
    button?.focus()
    act(() => {
      button?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ContextMenu',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    expect(
      document.querySelector('.ant-dropdown-menu')?.getAttribute('aria-label'),
    ).toBe('「报单比价」标签操作菜单')
  })

  it('标签数未超上限时不显示超限指示器', () => {
    render()
    expect(container.querySelector('.leo-tabbar-overlimit')).toBeNull()
  })

  it('标签数超出上限时显示带说明的超限指示器', () => {
    render()
    act(() => {
      useLayoutTabsStore.setState({
        tabs: [
          ...TABS,
          ...Array.from({ length: MAX_LAYOUT_TABS }, (_, index) => ({
            id: `extra-${index}`,
            pathname: `/page-${index}`,
            search: '',
            pinned: false,
            mountedOnce: false,
            reloadKey: 0,
          })),
        ],
        activeTabId: 'tab-price-compare',
      })
    })

    const indicator = container.querySelector<HTMLElement>(
      '.leo-tabbar-overlimit',
    )
    expect(indicator, '未渲染超限指示器').toBeTruthy()
    // 完整解释挂在 aria-label 上（角标只显示计数）；非交互元素不得进入 Tab 序列
    expect(indicator?.getAttribute('aria-label')).toContain('超出上限')
    expect(indicator?.getAttribute('tabindex')).toBeNull()
    expect(indicator?.textContent).toContain(`/${MAX_LAYOUT_TABS}`)
  })

  it('tablist 带可访问名、标签 aria-controls 指向真实面板、关闭按钮用中文可访问名', async () => {
    render()
    // rc-tabs 会在自身重渲染时覆盖 aria-controls，等 MutationObserver 重夺后再断言
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

    expect(
      container.querySelector('[role="tablist"]')?.getAttribute('aria-label'),
    ).toBe('已打开的页面标签')

    // 指向 .leo-tab-panel 的 id，而不是 rc-tabs 那个空且被隐藏的面板
    expect(
      container
        .querySelector('[data-node-key="tab-price-compare"] [role="tab"]')
        ?.getAttribute('aria-controls'),
    ).toBe('leo-tab-panel-tab-price-compare')

    // rc-tabs 默认是硬编码英文 'remove'，中文界面下读屏会念英文
    expect(
      container
        .querySelector(
          '[data-node-key="tab-price-compare"] .ant-tabs-tab-remove',
        )
        ?.getAttribute('aria-label'),
    ).toBe('关闭「报单比价」标签')
  })

  /*
   * Delete / Backspace 关闭标签由 rc-tabs 的 TabNavList.handleRemoveTab 内置实现
   * （尊重 closable，并经 onOffset 把焦点移到相邻标签）。它依赖 rc-tabs 内部的 focusKey
   * 状态机，jsdom 无法可靠驱动，因此「Delete 关闭并归还焦点」的契约改由
   * tests/e2e/navigation.spec.ts 在真实浏览器中守护；此处只保留钉选保护这一条。
   */
  it('Delete 不关闭钉选标签', () => {
    render()
    const pinned = container.querySelector<HTMLElement>(
      '[data-node-key="tab-workbench"] [role="tab"]',
    )
    expect(pinned, '未找到钉选的工作台标签').toBeTruthy()
    pinned?.focus()

    act(() => {
      pinned?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(
      container.querySelector('[data-node-key="tab-workbench"]'),
      '钉选标签不得被 Delete 关闭',
    ).toBeTruthy()
  })

  it('「关闭其他」确认框被取消时不移除任何标签', async () => {
    // 三标签场景：对非激活的 tab-extra 执行「关闭其他」，其待关闭集合里有脏的 tab-price-compare。
    // 不能用 focus 打开菜单 —— antd Tabs 聚焦即激活，会先把前提破坏掉，因此走鼠标右键。
    useLayoutTabsStore.setState({
      tabs: [
        ...TABS,
        {
          id: 'tab-extra',
          pathname: '/material',
          search: '',
          pinned: false,
          mountedOnce: false,
          reloadKey: 0,
        },
      ],
      activeTabId: 'tab-price-compare',
    })
    editorSessionStore.beginSession('tab-price-compare', {
      moduleKey: 'price-compare',
      mode: 'edit',
    })
    editorSessionStore.setSessionStatus('tab-price-compare', 'dirty')
    modalConfirmMock.mockClear()
    expect(
      editorSessionStore.requiresConfirmation('tab-price-compare'),
      '前置条件：tab-price-compare 必须处于需确认状态',
    ).toBe(true)

    render()
    expect(
      useLayoutTabsStore.getState().activeTabId,
      '渲染后激活项不应变化',
    ).toBe('tab-price-compare')

    const label = container.querySelector<HTMLElement>(
      '[data-node-key="tab-extra"] .leo-tabbar-label',
    )
    expect(label, '未找到 tab-extra 标签').toBeTruthy()
    act(() => {
      label?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    expect(
      useLayoutTabsStore.getState().activeTabId,
      '右键打开菜单本身不应切换标签',
    ).toBe('tab-price-compare')

    const closeOthers = [
      ...document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    ].find((element) => element.textContent?.includes('关闭其他'))
    expect(closeOthers, '未找到「关闭其他」菜单项').toBeTruthy()
    act(() => {
      closeOthers?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    expect(modalConfirmMock, '存在脏会话时应弹出确认框').toHaveBeenCalled()
    // 取消（不调用 onOk）：不得移除任何标签。
    // 这里刻意不断言 activeTabId —— 菜单关闭时会把焦点还给触发器（标签内的 label span），
    // 而 antd Tabs 聚焦即激活，因此该标签会因「焦点归还」而非关闭逻辑被切到。这是独立于
    // 本次修复的既有行为，断言它会让本用例测不到真正想测的东西。
    expect(
      useLayoutTabsStore.getState().tabs,
      '取消后不得移除任何标签',
    ).toHaveLength(TABS.length + 1)

    // 复位 request-close 的模块级 confirming 标记并清理会话，避免污染后续用例
    const lastConfirm = modalConfirmMock.mock.calls.at(-1)?.[0] as
      | { afterClose?: () => void }
      | undefined
    lastConfirm?.afterClose?.()
    editorSessionStore.endSession('tab-price-compare')
  })
})
