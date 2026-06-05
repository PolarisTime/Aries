import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { AppPageTabs } from './AppPageTabs'

const pages = [
  {
    key: '/dashboard',
    path: '/dashboard',
    title: '工作台',
    closable: false,
  },
  {
    key: '/material',
    path: '/material',
    title: '商品资料',
    closable: true,
  },
  {
    key: '/customer',
    path: '/customer',
    title: '客户资料',
    closable: true,
  },
]

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('AppPageTabs', () => {
  it('closes closable tab on double click', () => {
    const closePage = vi.fn()
    const navigate = vi.fn()

    render(
      <AppPageTabs
        activeKey="/material"
        closePage={closePage}
        isTopNavigationLayout={false}
        onNavigateToPath={navigate}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    fireEvent.doubleClick(screen.getByText('商品资料'))

    expect(closePage).toHaveBeenCalledWith('/material', navigate, {
      fallbackPath: '/dashboard',
    })
  })

  it('keeps current tab active after double clicking another tab to close it', () => {
    const closePage = vi.fn()
    const navigate = vi.fn()

    render(
      <AppPageTabs
        activeKey="/customer"
        closePage={closePage}
        isTopNavigationLayout={false}
        onNavigateToPath={navigate}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    fireEvent.doubleClick(screen.getByText('商品资料'))

    expect(closePage).toHaveBeenCalledWith('/material', navigate, {
      fallbackPath: '/customer',
    })
  })

  it('keeps the home tab open on double click', () => {
    const closePage = vi.fn()

    render(
      <AppPageTabs
        activeKey="/dashboard"
        closePage={closePage}
        isTopNavigationLayout={false}
        onNavigateToPath={vi.fn()}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    fireEvent.doubleClick(screen.getByText('工作台'))

    expect(closePage).not.toHaveBeenCalled()
  })

  it('navigates to page on tab click', () => {
    const navigate = vi.fn()

    render(
      <AppPageTabs
        activeKey="/dashboard"
        closePage={vi.fn()}
        isTopNavigationLayout={false}
        onNavigateToPath={navigate}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    fireEvent.click(screen.getByText('商品资料'))

    expect(navigate).toHaveBeenCalledWith('/material')
  })

  it('renders with top-nav class when isTopNavigationLayout is true', () => {
    const { container } = render(
      <AppPageTabs
        activeKey="/dashboard"
        closePage={vi.fn()}
        isTopNavigationLayout={true}
        onNavigateToPath={vi.fn()}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    expect(container.querySelector('.tab-layout-tabs-top-nav')).toBeDefined()
  })

  it('does not render top-nav class when isTopNavigationLayout is false', () => {
    const { container } = render(
      <AppPageTabs
        activeKey="/dashboard"
        closePage={vi.fn()}
        isTopNavigationLayout={false}
        onNavigateToPath={vi.fn()}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    expect(container.querySelector('.tab-layout-tabs-top-nav')).toBeNull()
  })

  it('applies shellFontStyle to container', () => {
    const style = { fontSize: '14px', color: 'red' }
    const { container } = render(
      <AppPageTabs
        activeKey="/dashboard"
        closePage={vi.fn()}
        isTopNavigationLayout={false}
        onNavigateToPath={vi.fn()}
        pages={pages}
        shellFontStyle={style}
      />,
    )

    const tabContainer = container.querySelector('.tab-layout-tabs')
    expect(tabContainer).toBeDefined()
  })

  it('renders all page tabs', () => {
    render(
      <AppPageTabs
        activeKey="/dashboard"
        closePage={vi.fn()}
        isTopNavigationLayout={false}
        onNavigateToPath={vi.fn()}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    expect(screen.getByText('工作台')).toBeDefined()
    expect(screen.getByText('商品资料')).toBeDefined()
    expect(screen.getByText('客户资料')).toBeDefined()
  })

  it('uses previous page as fallback when closing non-active tab', () => {
    const closePage = vi.fn()
    const navigate = vi.fn()

    render(
      <AppPageTabs
        activeKey="/dashboard"
        closePage={closePage}
        isTopNavigationLayout={false}
        onNavigateToPath={navigate}
        pages={pages}
        shellFontStyle={{}}
      />,
    )

    fireEvent.doubleClick(screen.getByText('客户资料'))

    expect(closePage).toHaveBeenCalledWith('/customer', navigate, {
      fallbackPath: '/dashboard',
    })
  })

  it('falls back to any other page when closing first tab', () => {
    const closePage = vi.fn()
    const navigate = vi.fn()

    const pagesWithFirstClosable = [
      { key: '/first', path: '/first', title: '第一个', closable: true },
      { key: '/second', path: '/second', title: '第二个', closable: true },
    ]

    render(
      <AppPageTabs
        activeKey="/first"
        closePage={closePage}
        isTopNavigationLayout={false}
        onNavigateToPath={navigate}
        pages={pagesWithFirstClosable}
        shellFontStyle={{}}
      />,
    )

    fireEvent.doubleClick(screen.getByText('第一个'))

    expect(closePage).toHaveBeenCalledWith('/first', navigate, {
      fallbackPath: '/second',
    })
  })
})
