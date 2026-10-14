// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { router as mainRouter } from '@/router'
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

  /**
   * 浏览器默认行为是 mousedown 即聚焦被点元素：右键若把焦点挪到被点标签上，
   * 菜单关闭时"归还打开前的焦点元素"就会把焦点还给这个（非激活）标签。
   * 因此右键必须在捕获阶段就阻止默认聚焦，左键不得受影响。
   */
  it('右键阻止 mousedown 默认聚焦，左键不阻止', () => {
    render()
    const label = container.querySelector<HTMLElement>(
      '[data-node-key="tab-price-compare"] .leo-tabbar-label',
    )
    expect(label, '未找到报单比价标签').toBeTruthy()

    const rightDown = new MouseEvent('mousedown', {
      button: 2,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      label?.dispatchEvent(rightDown)
    })
    expect(rightDown.defaultPrevented, '右键必须阻止默认聚焦').toBe(true)

    const leftDown = new MouseEvent('mousedown', {
      button: 0,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      label?.dispatchEvent(leftDown)
    })
    expect(leftDown.defaultPrevented, '左键必须保持默认聚焦行为').toBe(false)
  })

  /** APG: Escape 关闭菜单并把焦点归还给"打开前的焦点元素"，而不是被右键的标签。 */
  it('Escape 关闭菜单后焦点归还给打开前的焦点元素', async () => {
    render()
    // 模拟"右键前焦点在别处"（例如内容区的编辑器输入框）
    const opener = document.createElement('button')
    opener.className = 'pre-open-opener'
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const label = container.querySelector<HTMLElement>(
      '[data-node-key="tab-price-compare"] .leo-tabbar-label',
    )
    act(() => {
      label?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    expect(document.activeElement).not.toBe(opener)

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    expect(
      document.activeElement,
      'Escape 必须把焦点还给打开前的焦点元素',
    ).toBe(opener)
    expect(document.activeElement, '焦点不得落在被右键的标签上').not.toBe(label)
    opener.remove()
  })

  it('打开前的焦点元素已消失时 Escape 把焦点归还给当前激活标签', async () => {
    render()
    const transient = document.createElement('button')
    transient.className = 'transient-opener'
    document.body.appendChild(transient)
    transient.focus()

    // 右键非激活的工作台标签；当前激活标签是 tab-price-compare
    const label = container.querySelector<HTMLElement>(
      '[data-node-key="tab-workbench"] .leo-tabbar-label',
    )
    expect(label, '未找到工作台标签').toBeTruthy()
    act(() => {
      label?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    // 打开菜单后把原焦点元素移除，等价于"打开上下文已消失"
    transient.remove()

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    expect(
      document.activeElement,
      '兜底目标必须是当前激活标签的 tab 元素',
    ).toBe(
      container.querySelector(
        '[data-node-key="tab-price-compare"] [role="tab"]',
      ),
    )
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
    // rc-tabs 把 tabBarExtraContent 渲染在 role="tablist" 内部（上游 open 缺陷 #1013，
    // 重述 antd #49502/#53584），会让 tablist 拥有非 tab 子元素并触发
    // aria-required-children 违规。指示器必须留在 tablist 之外。
    expect(
      indicator?.closest('[role="tablist"]'),
      '超限指示器不得位于 tablist 内部',
    ).toBeNull()
    expect(indicator?.parentElement?.className).toContain(
      'leo-tabbar-keyboard-host',
    )
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

  it('「关闭其他」确认框被取消时不移标签、不切走当前标签、不多推历史', async () => {
    // 三标签场景：对非激活的 tab-extra 执行「关闭其他」，其待关闭集合里有脏的 tab-price-compare。
    // 用鼠标右键打开菜单：这是缺陷的真实路径（键盘唤起时焦点本就在标签上，不会改变激活项）。
    // 注：antd Tabs 的 activeKey 由 store 受控，rc-tabs 的 onFocus 只改内部 focusKey，
    // 程序化 focus 非激活标签并不会激活它——真正会激活的是菜单项点击沿 React 树的冒泡。
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
    const pushSpy = vi.spyOn(mainRouter.history, 'push')
    /*
     * 双重守护：确认框弹出时刻的 activeTabId 必须仍是 tab-price-compare。
     * 一条是修复 79eeebaf 修掉的"先 activateTab 再弹框"；另一条（本条用例真正要钉住的）
     * 是菜单项点击事件沿 React 树冒泡到被右键标签 onClick 导致的隐式激活 —— 由
     * ContextMenu 在弹层截断事件解决，真实浏览器里表现为 URL 被切走（见
     * tests/e2e/navigation.spec.ts 的 P2-22）。
     */
    let activeTabIdWhenConfirming: string | null = null
    modalConfirmMock.mockImplementation(() => {
      activeTabIdWhenConfirming = useLayoutTabsStore.getState().activeTabId
    })
    act(() => {
      closeOthers?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(modalConfirmMock, '存在脏会话时应弹出确认框').toHaveBeenCalled()
    expect(
      activeTabIdWhenConfirming,
      '取消前不得先切走当前标签（修复前 activateTab 在弹框之前执行）',
    ).toBe('tab-price-compare')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    // 取消（不调用 onOk）：不得移除任何标签，也不得多推浏览器历史。
    // 修复前切换激活项会经 useTabRouteReconciliation 顺带推出一条本不该产生的历史。
    expect(
      useLayoutTabsStore.getState().tabs,
      '取消后不得移除任何标签',
    ).toHaveLength(TABS.length + 1)
    expect(pushSpy, '取消后不得多推浏览器历史').not.toHaveBeenCalled()
    pushSpy.mockRestore()

    // 复位 request-close 的模块级 confirming 标记并清理会话，避免污染后续用例
    const lastConfirm = modalConfirmMock.mock.calls.at(-1)?.[0] as
      | { afterClose?: () => void }
      | undefined
    lastConfirm?.afterClose?.()
    editorSessionStore.endSession('tab-price-compare')
  })
})
