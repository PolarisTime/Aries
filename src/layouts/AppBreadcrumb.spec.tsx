// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { AppBreadcrumb } from './AppBreadcrumb'

/**
 * 回归守卫：面包屑跳转必须是客户端路由。
 *
 * 历史缺陷：面包屑用裸 `<a href>` 渲染，普通左键点击走浏览器默认导航，
 * 在 SPA 内表现为整页重载（重新下载入口 HTML 与全部 chunk、重新鉴权、
 * 所有页签重挂载）。这里断言普通左键点击被接管，且带修饰键/中键点击
 * 仍保留浏览器的「新标签页打开」语义。
 */

const { openTabMock } = vi.hoisted(() => ({ openTabMock: vi.fn() }))

vi.mock('@/layouts/tabs/use-tab-open', () => ({
  useTabOpen: () => openTabMock,
}))

let currentLocation = {
  pathname: '/purchase-order',
  searchStr: '',
  href: '/purchase-order',
}

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => currentLocation,
}))

function clickEvent(init: MouseEventInit) {
  return new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  })
}

describe('AppBreadcrumb 客户端导航契约', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    openTabMock.mockReset()
    currentLocation = {
      pathname: '/purchase-order',
      searchStr: '',
      href: '/purchase-order',
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(<AppBreadcrumb />)
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  const breadcrumbLink = () =>
    container.querySelector<HTMLAnchorElement>('.leo-breadcrumb a')

  it('普通左键点击接管为客户端路由并阻止整页导航', () => {
    const link = breadcrumbLink()
    expect(link, '未渲染可跳转的面包屑链接').toBeTruthy()
    expect(link?.getAttribute('href')).toBe('/dashboard')

    let defaultPrevented = true
    act(() => {
      defaultPrevented = !link!.dispatchEvent(clickEvent({ button: 0 }))
    })

    expect(defaultPrevented).toBe(true)
    expect(openTabMock).toHaveBeenCalledTimes(1)
    expect(openTabMock).toHaveBeenCalledWith({ pathname: '/dashboard' })
  })

  it.each([
    ['Ctrl 键', { ctrlKey: true }],
    ['Command 键', { metaKey: true }],
    ['Shift 键', { shiftKey: true }],
    ['Alt 键', { altKey: true }],
    ['中键', { button: 1 }],
  ])('%s 点击不接管，保留浏览器新标签页语义', (_label, init) => {
    const link = breadcrumbLink()
    expect(link).toBeTruthy()

    let defaultPrevented = false
    act(() => {
      defaultPrevented = !link!.dispatchEvent(clickEvent(init))
    })

    expect(defaultPrevented).toBe(false)
    expect(openTabMock).not.toHaveBeenCalled()
  })

  it('当前页（末项）不可点击', () => {
    const items = container.querySelectorAll('.leo-breadcrumb li')
    const last = items[items.length - 1]
    expect(last?.textContent).toContain('采购订单')
    expect(last?.querySelector('a')).toBeNull()
  })

  it('工作台等无跳转层级只渲染文本', () => {
    act(() => root.unmount())
    currentLocation = {
      pathname: '/dashboard',
      searchStr: '',
      href: '/dashboard',
    }
    root = createRoot(container)
    act(() => {
      root.render(<AppBreadcrumb />)
    })

    expect(breadcrumbLink()).toBeNull()
    expect(container.textContent).toContain('业务中心')
  })
})
