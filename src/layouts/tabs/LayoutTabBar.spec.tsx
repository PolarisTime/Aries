// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useLayoutTabsStore } from '@/stores/layoutTabsStore'
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
})
