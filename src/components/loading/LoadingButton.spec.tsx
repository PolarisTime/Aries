// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoadingButton, type LoadingButtonProps } from '@/components/loading'

interface Deferred {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
}

function createDeferred(): Deferred {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('LoadingButton', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  const getButton = () => container.querySelector<HTMLButtonElement>('button')

  const click = () => {
    act(() => {
      getButton()?.click()
    })
  }

  const flush = async (ms = 0) => {
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
    })
  }

  const renderButton = (props: LoadingButtonProps = {}) => {
    act(() => {
      root.render(createElement(LoadingButton, props, '保存'))
    })
  }

  it('异步回调期间按钮进入 loading：disabled 且 aria-busy', async () => {
    const deferred = createDeferred()
    const handleClick = vi.fn(() => deferred.promise)
    renderButton({ onClick: handleClick })

    click()

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(getButton()?.disabled).toBe(true)
    expect(getButton()?.getAttribute('aria-busy')).toBe('true')

    deferred.resolve()
    await flush()
  })

  it('loading 期间忽略重复点击（防重复提交），完成后恢复', async () => {
    const deferred = createDeferred()
    const handleClick = vi.fn(() => deferred.promise)
    renderButton({ onClick: handleClick })

    click()
    click()
    click()
    expect(handleClick).toHaveBeenCalledTimes(1)

    deferred.resolve()
    await flush()

    expect(getButton()?.disabled).toBe(false)
    expect(getButton()?.getAttribute('aria-busy')).toBeNull()

    click()
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('回调抛错时同样退出 loading', async () => {
    const deferred = createDeferred()
    const handleClick = vi.fn(() => deferred.promise)
    renderButton({ onClick: handleClick })

    click()
    deferred.promise.catch(() => {})
    deferred.reject(new Error('failed'))
    await flush()

    expect(getButton()?.getAttribute('aria-busy')).toBeNull()
    expect(getButton()?.disabled).toBe(false)
  })

  it('同步回调不进入 loading', () => {
    const handleClick = vi.fn(() => 'sync')
    renderButton({ onClick: handleClick })

    click()

    expect(getButton()?.getAttribute('aria-busy')).toBeNull()
    expect(getButton()?.disabled).toBe(false)
  })

  it('超过 timeoutMs 触发 onTimeout 并渲染超时提示', async () => {
    const deferred = createDeferred()
    const onTimeout = vi.fn()
    renderButton({
      onClick: () => deferred.promise,
      timeoutMs: 20,
      onTimeout,
      timeoutHint: '请求耗时较长，请稍候',
    })

    click()
    await flush(60)

    const hint = container.querySelector('[role="status"]')
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(hint?.getAttribute('aria-live')).toBe('polite')
    expect(hint?.textContent).toBe('请求耗时较长，请稍候')
    expect(getButton()?.getAttribute('data-loading-timeout')).toBe('true')

    deferred.resolve()
    await flush()
  })

  it('完成后取消未触发的超时定时器', async () => {
    const deferred = createDeferred()
    const onTimeout = vi.fn()
    renderButton({
      onClick: () => deferred.promise,
      timeoutMs: 60,
      onTimeout,
    })

    click()
    deferred.resolve()
    await flush()
    await flush(100)

    expect(onTimeout).not.toHaveBeenCalled()
    expect(container.querySelector('[role="status"]')).toBeNull()
  })
})
