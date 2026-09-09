// @vitest-environment jsdom

import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GlobalLoadingIndicator } from '@/components/loading'

// 让 react-query 的批量通知同步执行，消除测试中的调度时序不确定性
notifyManager.setScheduler((callback) => {
  callback()
})

function ignoreRejection(promise: Promise<unknown>): void {
  promise.catch(() => {})
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('GlobalLoadingIndicator', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { gcTime: 0 },
      },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  const renderIndicator = (announcement?: string) => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(GlobalLoadingIndicator, {
            showDelayMs: 0,
            hideDelayMs: 0,
            ...(announcement ? { announcement } : {}),
          }),
        ),
      )
    })
  }

  const getBar = () =>
    container.querySelector<HTMLElement>('.aries-global-loading-bar')

  const getAnnouncement = () =>
    container.querySelector<HTMLElement>('[role="status"]')

  it('空闲时进度条隐藏且通知为空', () => {
    renderIndicator()

    expect(getBar()?.getAttribute('data-state')).toBe('hidden')
    expect(getAnnouncement()?.textContent).toBe('')
  })

  it('请求进行中显示进度条并通知屏幕阅读器，结束后恢复', async () => {
    renderIndicator('正在加载数据')

    let release!: () => void
    const gate = new Promise<string>((resolve) => {
      release = () => {
        resolve('done')
      }
    })

    await act(async () => {
      ignoreRejection(
        queryClient.fetchQuery({
          queryKey: ['test', 'inflight'],
          queryFn: () => gate,
        }),
      )
      await tick()
    })

    expect(getBar()?.getAttribute('data-state')).toBe('visible')
    expect(getAnnouncement()?.textContent).toBe('正在加载数据')
    expect(getBar()?.getAttribute('aria-hidden')).toBe('true')

    await act(async () => {
      release()
      await gate
      await tick()
    })

    expect(getBar()?.getAttribute('data-state')).toBe('hidden')
    expect(getAnnouncement()?.textContent).toBe('')
  })

  it('全部请求结束后隐藏进度条并清空通知', async () => {
    renderIndicator()

    let release!: () => void
    const gate = new Promise<string>((resolve) => {
      release = () => {
        resolve('done')
      }
    })

    await act(async () => {
      ignoreRejection(
        queryClient.fetchQuery({
          queryKey: ['test', 'gated'],
          queryFn: () => gate,
        }),
      )
      await tick()
    })
    expect(getBar()?.getAttribute('data-state')).toBe('visible')

    await act(async () => {
      release()
      await gate
      await tick()
    })

    expect(getBar()?.getAttribute('data-state')).toBe('hidden')
    expect(getAnnouncement()?.textContent).toBe('')
  })

  it('mutation 期间同样显示进度条', async () => {
    renderIndicator()

    let release!: () => void
    const gate = new Promise<string>((resolve) => {
      release = () => {
        resolve('ok')
      }
    })

    await act(async () => {
      const mutation = queryClient.getMutationCache().build(queryClient, {
        mutationFn: () => gate,
      })
      ignoreRejection(mutation.execute(undefined))
      await tick()
    })
    expect(getBar()?.getAttribute('data-state')).toBe('visible')

    await act(async () => {
      release()
      await gate
      await tick()
    })
    expect(getBar()?.getAttribute('data-state')).toBe('hidden')
  })
})
