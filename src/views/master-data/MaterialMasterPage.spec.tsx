// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { MaterialMasterPage } from './MaterialMasterPage'

/**
 * 宿主页测试：标签渲染 / 默认标签推导 / `?tab=` 切换与权限回退。
 *
 * 页面内容（通用列表页、定尺加价页、值映射页）全部换成探针：本用例只锁定宿主页
 * 自己的标签语义与路由行为，具体页面由各自的 spec 负责。
 */
const locationState = vi.hoisted(() => ({
  pathname: '/material',
  searchStr: '',
}))
const pushMock = vi.hoisted(() => vi.fn())
const permissionsState = vi.hoisted(() => ({
  current: [] as readonly string[],
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useLocation: () => ({
      pathname: locationState.pathname,
      searchStr: locationState.searchStr,
    }),
    useRouter: () => ({ history: { push: pushMock } }),
  }
})

vi.mock('@/hooks/usePermission', () => ({
  usePermissions: () => permissionsState.current,
}))

vi.mock('@/views/modules/BusinessGridPage', async () => {
  const { createElement } = await import('react')
  return {
    BusinessGridPage: ({ pageDef }: { pageDef: { key: string } }) =>
      createElement('div', {
        'data-testid': 'business-grid',
        'data-page-key': pageDef.key,
      }),
  }
})

vi.mock('./LengthPremiumPage', () => ({
  LengthPremiumPage: () => 'length-premium-page',
}))

vi.mock('./ValueAliasPage', () => ({
  ValueAliasPage: () => 'value-alias-page',
}))

/**
 * 本文件是 jsdom + antd 渲染用例，整仓并行时单用例耗时可达数百毫秒，
 * 与其它 antd 用例一致给足超时余量。
 */
vi.setConfig({ testTimeout: 20_000 })

describe('商品资料宿主页', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true

    locationState.pathname = '/material'
    locationState.searchStr = ''
    permissionsState.current = ['length-premiums:read', 'value-aliases:read']

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const flushAsync = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const renderPage = async () => {
    act(() => {
      root.render(createElement(MaterialMasterPage))
    })
    await flushAsync()
  }

  const tabLabels = () =>
    [...container.querySelectorAll('.ant-tabs-tab')].map((node) =>
      node.textContent?.trim(),
    )

  const activeTabLabel = () =>
    container.querySelector('.ant-tabs-tab-active')?.textContent?.trim()

  const clickTab = async (label: string) => {
    const target = [...container.querySelectorAll('.ant-tabs-tab')].find(
      (node) => node.textContent?.trim() === label,
    )
    expect(target, `标签 ${label} 应存在`).toBeTruthy()
    await act(async () => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('四个标签按「商品资料 / 材料类别 / 定尺加价 / 值映射」顺序渲染', async () => {
    await renderPage()

    expect(tabLabels()).toEqual([
      '商品资料',
      '商品类别',
      '定尺加价维护',
      '值映射维护',
    ])
    expect(activeTabLabel()).toBe('商品资料')
    expect(
      container
        .querySelector('[data-testid="business-grid"]')
        ?.getAttribute('data-page-key'),
    ).toBe('material')
  })

  it('深链 /material-categories 默认选中商品类别标签，且列表页使用该类别的 pageDef', async () => {
    locationState.pathname = '/material-categories'
    await renderPage()

    expect(activeTabLabel()).toBe('商品类别')
    expect(
      container
        .querySelector('[data-testid="business-grid"]')
        ?.getAttribute('data-page-key'),
    ).toBe('material-categories')
  })

  it('深链 /length-premium 默认选中定尺加价标签', async () => {
    locationState.pathname = '/length-premium'
    await renderPage()

    expect(activeTabLabel()).toBe('定尺加价维护')
    expect(container.textContent).toContain('length-premium-page')
  })

  it('深链 /value-alias 默认选中值映射标签', async () => {
    locationState.pathname = '/value-alias'
    await renderPage()

    expect(activeTabLabel()).toBe('值映射维护')
    expect(container.textContent).toContain('value-alias-page')
  })

  it('URL 上的 ?tab= 优先于 pathname 推导的默认标签', async () => {
    locationState.pathname = '/material-categories'
    locationState.searchStr = '?tab=value-alias'
    await renderPage()

    expect(activeTabLabel()).toBe('值映射维护')
  })

  it('切标签只改 ?tab=，保留其它深链参数', async () => {
    locationState.pathname = '/material'
    locationState.searchStr = '?docNo=PO-2026-0001'
    await renderPage()

    await clickTab('定尺加价维护')

    expect(pushMock).toHaveBeenCalledTimes(1)
    const href = String(pushMock.mock.calls[0][0])
    const url = new URL(href, 'http://localhost')
    expect(url.pathname).toBe('/material')
    expect(url.searchParams.get('tab')).toBe('length-premium')
    expect(url.searchParams.get('docNo')).toBe('PO-2026-0001')
  })

  it('无权限的标签不渲染（定尺加价 / 值映射需要各自读权限）', async () => {
    permissionsState.current = []
    await renderPage()

    expect(tabLabels()).toEqual(['商品资料', '商品类别'])
  })

  it('当前标签无权限时回退到默认可见标签', async () => {
    permissionsState.current = []
    locationState.pathname = '/material'
    locationState.searchStr = '?tab=value-alias'
    await renderPage()

    expect(activeTabLabel()).toBe('商品资料')
    expect(
      container
        .querySelector('[data-testid="business-grid"]')
        ?.getAttribute('data-page-key'),
    ).toBe('material')
  })

  it('深链到无权限的页面时回退到首个可见标签', async () => {
    permissionsState.current = []
    locationState.pathname = '/length-premium'
    await renderPage()

    expect(activeTabLabel()).toBe('商品资料')
  })
})
