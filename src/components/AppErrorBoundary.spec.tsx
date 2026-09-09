// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const captureMock = vi.fn()
vi.mock('@/observability/sentry', () => ({
  captureFrontendException: (...args: unknown[]) => captureMock(...args),
}))

vi.mock('@/api/core/request-errors', () => ({
  readRequestError: (error: unknown) => {
    const source = (error ?? {}) as {
      status?: number
      code?: number
      traceId?: string
    }
    return {
      status: source.status,
      code: source.code,
      traceId: source.traceId,
      handled: false,
    }
  },
}))

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  },
}))

import { AppErrorBoundary } from '@/components/AppErrorBoundary'

interface RequestError extends Error {
  status?: number
  code?: number
  traceId?: string
}

let shouldThrow = true

function ThrowingChild(): ReactNode {
  if (shouldThrow) {
    const error = new Error('boom') as RequestError
    error.traceId = 'trace-123'
    throw error
  }
  return createElement('div', { 'data-testid': 'child-ok' })
}

describe('AppErrorBoundary', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    shouldThrow = true
    navigateMock.mockClear()
    captureMock.mockClear()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    delete (navigator as { clipboard?: unknown }).clipboard
    vi.restoreAllMocks()
  })

  function renderBoundary(children: ReactNode = createElement('div')) {
    act(() => {
      root.render(
        createElement(AppErrorBoundary, { resetKey: 'test', children }),
      )
    })
  }

  async function click(element: Element | null) {
    act(() => {
      element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(() => Promise.resolve())
  }

  function query(selector: string): Element | null {
    return container.querySelector(selector)
  }

  it('渲染网络错误分类（warning 图标 + 描述）', () => {
    function NetworkChild(): never {
      throw new Error('Failed to fetch')
    }
    renderBoundary(createElement(NetworkChild))
    expect(query('.ant-result-warning')).not.toBeNull()
    expect(
      query('[data-testid="app-error-boundary-description"]'),
    ).not.toBeNull()
  })

  it('渲染权限错误分类（403 图标）', () => {
    function ForbiddenChild(): never {
      const error = new Error('forbidden') as RequestError
      error.status = 403
      throw error
    }
    renderBoundary(createElement(ForbiddenChild))
    expect(query('.ant-result-403')).not.toBeNull()
    expect(query('[data-testid="app-error-boundary-retry"]')).not.toBeNull()
  })

  it('渲染运行时错误分类并展示可复制的错误摘要', () => {
    function RuntimeChild(): never {
      throw new Error('boom')
    }
    renderBoundary(createElement(RuntimeChild))
    expect(query('.ant-result-error')).not.toBeNull()
    const copyValue = query('[data-testid="app-error-boundary-copy-value"]')
    expect(copyValue?.textContent).toContain('boom')
    expect(query('[data-testid="app-error-boundary-copy"]')).not.toBeNull()
  })

  it('复制按钮将 traceId 写入剪贴板', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    function TracedChild(): never {
      const error = new Error('boom') as RequestError
      error.traceId = 'trace-123'
      throw error
    }
    renderBoundary(createElement(TracedChild))

    expect(
      query('[data-testid="app-error-boundary-copy-value"]')?.textContent,
    ).toContain('trace-123')

    await click(query('[data-testid="app-error-boundary-copy"]'))

    expect(writeText).toHaveBeenCalledWith('trace-123')
  })

  it('剪贴板失败时降级 alert', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
      configurable: true,
    })

    function RuntimeChild(): never {
      throw new Error('boom')
    }
    renderBoundary(createElement(RuntimeChild))

    await click(query('[data-testid="app-error-boundary-copy"]'))

    expect(alertMock).toHaveBeenCalled()
  })

  it('点击重试后清除错误并重新渲染子树', async () => {
    renderBoundary(createElement(ThrowingChild))
    expect(query('[data-testid="app-error-boundary-retry"]')).not.toBeNull()
    expect(query('[data-testid="child-ok"]')).toBeNull()

    shouldThrow = false
    await click(query('[data-testid="app-error-boundary-retry"]'))

    expect(query('[data-testid="child-ok"]')).not.toBeNull()
  })

  it('点击返回首页使用路由导航', async () => {
    renderBoundary(createElement(ThrowingChild))

    const homeButton = container.querySelector<HTMLButtonElement>(
      '.ant-result-extra button.ant-btn-primary',
    )
    expect(homeButton).not.toBeNull()

    await click(homeButton)

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard' }),
    )
  })

  it('捕获错误时保持 Sentry 上报行为', () => {
    function RuntimeChild(): never {
      throw new Error('boom')
    }
    renderBoundary(createElement(RuntimeChild))

    expect(captureMock).toHaveBeenCalledTimes(1)
    const [error, context] = captureMock.mock.calls[0] as [
      Error,
      { componentStack?: string },
    ]
    expect(error.message).toBe('boom')
    expect(typeof context.componentStack).toBe('string')
  })
})
