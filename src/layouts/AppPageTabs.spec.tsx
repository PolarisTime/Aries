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
})
