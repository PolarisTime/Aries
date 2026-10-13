// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { MAX_LAYOUT_TABS, useLayoutTabsStore } from '@/stores/layoutTabsStore'
import { LayoutTabBar } from './LayoutTabBar'

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

  it('Delete 关闭当前聚焦标签并把焦点交还相邻标签', async () => {
    render()
    const button = tabButton('报单比价')
    expect(button, '未找到报单比价标签').toBeTruthy()
    button?.focus()

    act(() => {
      button?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    expect(tabButton('报单比价'), '标签应已被 Delete 关闭').toBeUndefined()
    expect(
      document.activeElement
        ?.closest('.ant-tabs-tab')
        ?.getAttribute('data-node-key'),
      '焦点应移到前一个（此处唯一剩余的）标签',
    ).toBe('tab-workbench')
  })

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
})
