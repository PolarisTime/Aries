// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ProjectMasterPage } from './ProjectMasterPage'

/**
 * 项目资料宿主页测试：两个标签、深链默认标签、切标签写 `?tab=`、权限回退。
 * 页面内容换成探针，具体页面由各自的 spec 负责。
 */
const locationState = vi.hoisted(() => ({
  pathname: '/project',
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

vi.mock('./QuoteRegionPage', () => ({
  QuoteRegionPage: () => 'quote-region-page',
}))

vi.setConfig({ testTimeout: 20_000 })

describe('项目资料宿主页', () => {
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

    locationState.pathname = '/project'
    locationState.searchStr = ''
    permissionsState.current = ['quote-regions:read']

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
      root.render(createElement(ProjectMasterPage))
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

  it('两个标签按「项目资料 / 报价地区」顺序渲染，默认选中项目资料', async () => {
    await renderPage()

    expect(tabLabels()).toEqual(['项目资料', '取价地区维护'])
    expect(activeTabLabel()).toBe('项目资料')
    expect(
      container
        .querySelector('[data-testid="business-grid"]')
        ?.getAttribute('data-page-key'),
    ).toBe('project')
  })

  it('深链 /quote-region 默认选中报价地区标签并渲染报价地区页', async () => {
    locationState.pathname = '/quote-region'
    await renderPage()

    expect(activeTabLabel()).toBe('取价地区维护')
    expect(container.textContent).toContain('quote-region-page')
  })

  it('切到报价地区标签时只写 ?tab=，pathname 不变', async () => {
    await renderPage()

    await clickTab('取价地区维护')

    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(String(pushMock.mock.calls[0][0])).toBe('/project?tab=quote-region')
  })

  it('无报价地区权限时只渲染项目资料标签，深链回退到项目资料', async () => {
    permissionsState.current = []
    locationState.pathname = '/quote-region'
    await renderPage()

    expect(tabLabels()).toEqual(['项目资料'])
    expect(activeTabLabel()).toBe('项目资料')
  })
})
