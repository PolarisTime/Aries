// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routerState = vi.hoisted((): { error: unknown } => ({
  error: null,
}))

const navigateMock = vi.hoisted(() => vi.fn())

const I18N_TEXTS = vi.hoisted(() => {
  const texts: Record<string, string> = {
    'errorBoundary.accessDenied': '当前页面拒绝访问',
    'errorBoundary.forbiddenHint': '请联系管理员开通相关权限',
    'errorBoundary.networkError': '网络连接异常',
    'errorBoundary.networkHint': '请检查网络连接后重试',
    'errorBoundary.serverBusy': '服务器繁忙，请稍后重试',
    'errorBoundary.runtimeTitle': '页面渲染出错',
    'errorBoundary.runtimeHint': '请刷新页面重试；若问题持续请联系技术支持',
  }
  return texts
})

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: { defaultValue?: string }) =>
      I18N_TEXTS[key] ?? options?.defaultValue ?? key,
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    state: {
      error: routerState.error,
      location: { pathname: '/sales-orders' },
    },
  }),
  useNavigate: () => navigateMock,
}))

import { ErrorView } from '@/views/error/ErrorView'

interface RequestError extends Error {
  status?: number
  code?: number
  traceId?: string
}

describe('ErrorView', () => {
  let container: HTMLDivElement
  let root: Root
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    routerState.error = null
    navigateMock.mockClear()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    consoleErrorSpy.mockRestore()
  })

  function renderErrorView() {
    act(() => {
      root.render(createElement(ErrorView))
    })
  }

  it('渲染 403 权限错误分类', () => {
    const error = new Error('denied') as RequestError
    error.status = 403
    routerState.error = error

    renderErrorView()

    expect(container.querySelector('.ant-result-403')).not.toBeNull()
    expect(container.textContent).toContain('当前页面拒绝访问')
    expect(container.textContent).toContain('请联系管理员开通相关权限')
  })

  it('渲染网络错误分类（warning 图标）', () => {
    routerState.error = new Error('Failed to fetch')

    renderErrorView()

    expect(container.querySelector('.ant-result-warning')).not.toBeNull()
    expect(container.textContent).toContain('网络连接异常')
    expect(container.textContent).toContain('请检查网络连接后重试')
  })

  it('渲染 500 服务器错误分类', () => {
    const error = new Error('server error') as RequestError
    error.status = 500
    routerState.error = error

    renderErrorView()

    expect(container.querySelector('.ant-result-500')).not.toBeNull()
    expect(container.textContent).toContain('服务器繁忙，请稍后重试')
  })

  it('默认分类渲染运行时错误（error 图标）', () => {
    routerState.error = new Error('boom')

    renderErrorView()

    expect(container.querySelector('.ant-result-error')).not.toBeNull()
    expect(container.textContent).toContain('页面渲染出错')
    expect(container.textContent).toContain('boom')
  })

  it('展示后端 traceId 并保持错误上报日志', () => {
    const error = new Error('boom') as RequestError
    error.traceId = 'trace-456'
    routerState.error = error

    renderErrorView()

    expect(container.textContent).toContain('trace-456')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ErrorView] traceId=trace-456',
      error,
    )
  })
})
