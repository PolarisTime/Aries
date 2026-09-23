// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PriceSheet } from './types'

const api = vi.hoisted(() => ({
  fetchMaterialPriceMatches: vi.fn(),
  fetchSteelQuoteCalendars: vi.fn(),
}))

vi.mock('@/api/market/steel-quotes', () => api)
vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

import { usePriceComparePricing } from './usePriceComparePricing'

const sheet: PriceSheet = {
  id: 's1',
  name: '批次',
  status: '报价',
  projectId: 'p1',
  projectName: '项目',
  orderDate: '2026-09-22',
  refDate: '2026-09-22',
  refPeriod: '上午',
  lengthPremium: 30,
  inputs: {},
  rows: [],
}

describe('usePriceComparePricing 数据源联动', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    api.fetchMaterialPriceMatches.mockReset().mockResolvedValue([])
    api.fetchSteelQuoteCalendars.mockReset().mockResolvedValue([])
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      await Promise.resolve()
    })
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
  })

  function Harness({
    source,
    region,
  }: {
    source?: 'MYSTEEL' | 'STEELX'
    region?: string
  }) {
    usePriceComparePricing({
      active: sheet,
      data: {},
      isAuthenticated: true,
      quoteSource: source,
      quoteRegion: region,
    })
    return null
  }

  async function render(source?: 'MYSTEEL' | 'STEELX', region?: string) {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Harness, { source, region }),
        ),
      )
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('日历请求按数据源/地区区分(西本不复用 Mysteel 时段)', async () => {
    await render('STEELX', '杭州')
    const last = api.fetchSteelQuoteCalendars.mock.calls.at(-1)
    // 参数: (from, to, signal, source, region)
    expect(last?.[3]).toBe('STEELX')
    expect(last?.[4]).toBe('杭州')
  })

  it('日历未加载时回退单据时段, 发出非空时段请求', async () => {
    // 日历返回空 → calendarPeriods 为空 → 应回退 sheet.refPeriod(上午)
    await render('STEELX', '杭州')
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    const calls = api.fetchMaterialPriceMatches.mock.calls
    // 至少一次请求携带 period=上午
    expect(calls.some((c) => c[1] === '上午')).toBe(true)
  })
})
