// @vitest-environment jsdom

import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { MarketSyncView } from '@/views/market/MarketSyncView'

const api = vi.hoisted(() => ({
  fetchSteelQuoteCalendars: vi.fn(),
  fetchSteelQuotes: vi.fn(),
  fetchBackfillStatus: vi.fn(),
  syncSteelQuotes: vi.fn(),
  backfillSteelQuotes: vi.fn(),
}))

vi.mock('@/api/market/steel-quotes', () => api)

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    destroy: vi.fn(),
  },
}))

notifyManager.setScheduler((callback) => {
  callback()
})

const idleBackfillStatus = {
  running: false,
  from: '2026-08-01',
  to: '2026-09-11',
  finishedAt: '2026-09-11T00:00:00',
  syncedDays: 0,
  failedDays: 0,
  totalRows: 0,
}

describe('MarketSyncView（迁移到 TanStack Query）', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true

    api.fetchSteelQuoteCalendars.mockReset()
    api.fetchSteelQuotes.mockReset()
    api.fetchBackfillStatus.mockReset()
    api.syncSteelQuotes.mockReset()
    api.backfillSteelQuotes.mockReset()

    useAuthStore.setState({ isAuthenticated: true })

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
    queryClient.clear()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const renderView = () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(MarketSyncView),
        ),
      )
    })
  }

  it('认证后加载日历并自动选中最新时段，再按选中条件查询明细', async () => {
    api.fetchSteelQuoteCalendars.mockResolvedValue([
      {
        quoteDate: '2026-09-10',
        periods: ['上午'],
        periodRows: { 上午: 2 },
      },
      {
        quoteDate: '2026-09-11',
        periods: ['上午', '下午'],
        periodRows: { 上午: 5, 下午: 4 },
      },
    ])
    api.fetchSteelQuotes.mockResolvedValue({
      rows: [
        {
          id: '1',
          quoteDate: '2026-09-11',
          period: '上午',
          factory: '沙钢',
          breed: '螺纹钢',
          price: 4200,
        },
      ],
      total: 1,
    })
    api.fetchBackfillStatus.mockResolvedValue(idleBackfillStatus)

    renderView()
    await act(async () => {
      await Promise.resolve()
    })

    expect(api.fetchSteelQuoteCalendars).toHaveBeenCalledTimes(1)
    expect(api.fetchSteelQuotes).toHaveBeenCalledTimes(1)
    const [quotesParams] = api.fetchSteelQuotes.mock.calls[0] as [
      { quoteDate: string; period: string; page: number; size: number },
    ]
    expect(quotesParams).toMatchObject({
      quoteDate: '2026-09-11',
      period: '上午',
      page: 0,
      size: 20,
    })
    expect(container.textContent).toContain('沙钢')
    expect(container.textContent).toContain('共 1 条')
  })

  it('未认证时不发起任何请求', async () => {
    useAuthStore.setState({ isAuthenticated: false })

    renderView()
    await act(async () => {
      await Promise.resolve()
    })

    expect(api.fetchSteelQuoteCalendars).not.toHaveBeenCalled()
    expect(api.fetchSteelQuotes).not.toHaveBeenCalled()
    expect(api.fetchBackfillStatus).not.toHaveBeenCalled()
  })

  it('补数进行中按 3 秒轮询，任务结束后停止', async () => {
    vi.useFakeTimers()
    api.fetchSteelQuoteCalendars.mockResolvedValue([])
    api.fetchSteelQuotes.mockResolvedValue({ rows: [], total: 0 })
    api.fetchBackfillStatus
      .mockResolvedValueOnce({
        ...idleBackfillStatus,
        running: true,
        finishedAt: undefined,
      })
      .mockResolvedValue({
        ...idleBackfillStatus,
        running: false,
        syncedDays: 1,
        totalRows: 3,
      })

    renderView()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api.fetchBackfillStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(api.fetchBackfillStatus).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(api.fetchBackfillStatus).toHaveBeenCalledTimes(2)
  })
})
