import { beforeEach, describe, expect, it, vi } from 'vitest'
import { businessPageConfigs } from '@/config/business-pages'
import { useGlobalSearchSupport } from '@/layouts/use-global-search-support'

describe('useGlobalSearchSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('searches only accessible modules and routes to the selected result', async () => {
    const router = {
      push: vi.fn(),
    }
    const searchModule = vi.fn(async (moduleKey: string) => [
      {
        id: `${moduleKey}-1`,
        orderNo: 'CG20260001',
        status: '已审核',
      },
    ])

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders', 'sales-orders'],
      pageConfigs: businessPageConfigs,
      router,
      canAccessModule: (moduleKey) => moduleKey === 'purchase-orders',
      searchModule,
      buildSummary: (record) => String(record.status || ''),
    })

    await support.performSearch('CG20260001')

    expect(searchModule).toHaveBeenCalledTimes(1)
    expect(searchModule).toHaveBeenCalledWith('purchase-orders', 'CG20260001')
    expect(support.resultOptions.value).toHaveLength(1)

    support.handleSelect('purchase-orders::CG20260001')

    expect(router.push).toHaveBeenCalledWith({
      path: '/purchase-orders',
      query: {
        docNo: 'CG20260001',
        trackId: 'purchase-orders-1',
        openDetail: '1',
      },
    })
    expect(support.results.value).toEqual([])
  })

  it('jumps directly when submit finds an exact primary number match', async () => {
    const router = {
      push: vi.fn(),
    }
    const searchModule = vi.fn(async () => [
      {
        id: 'purchase-order-1',
        orderNo: 'CG20260001',
        status: '已审核',
      },
      {
        id: 'purchase-order-2',
        orderNo: 'CG20260002',
        status: '待审核',
      },
    ])

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders'],
      pageConfigs: businessPageConfigs,
      router,
      canAccessModule: () => true,
      searchModule,
      buildSummary: (record) => String(record.status || ''),
    })

    await support.handleSubmit('CG20260001')

    expect(searchModule).toHaveBeenCalledWith('purchase-orders', 'CG20260001')
    expect(router.push).toHaveBeenCalledWith({
      path: '/purchase-orders',
      query: {
        docNo: 'CG20260001',
        trackId: 'purchase-order-1',
        openDetail: '1',
      },
    })
    expect(support.results.value).toEqual([])
  })

  it('can look up and route by trackId', async () => {
    const router = {
      push: vi.fn(),
    }
    const searchModule = vi.fn(async () => [])
    const lookupRecordById = vi.fn(async () => ({
      id: '1914876201459236001',
      orderNo: 'CG20260001',
      status: '已审核',
    }))

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders'],
      pageConfigs: businessPageConfigs,
      router,
      canAccessModule: () => true,
      searchModule,
      lookupRecordById,
      buildSummary: (record) => String(record.status || ''),
    })

    await support.handleSubmit('1914876201459236001')

    expect(searchModule).not.toHaveBeenCalled()
    expect(lookupRecordById).toHaveBeenCalledWith('purchase-orders', '1914876201459236001')
    expect(router.push).toHaveBeenCalledWith({
      path: '/purchase-orders',
      query: {
        docNo: 'CG20260001',
        trackId: '1914876201459236001',
        openDetail: '1',
      },
    })
  })

  it('debounces keyword input and only searches the latest value', async () => {
    vi.useFakeTimers()
    const searchModule = vi.fn(async () => [])

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders'],
      pageConfigs: businessPageConfigs,
      router: { push: vi.fn() },
      canAccessModule: () => true,
      searchModule,
    })

    await support.handleSearch('CG2026')
    await support.handleSearch('CG20260001')

    expect(support.loading.value).toBe(false)
    expect(support.results.value).toEqual([])
    expect(searchModule).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(219)
    expect(searchModule).not.toHaveBeenCalled()
    expect(support.results.value).toEqual([])

    await vi.advanceTimersByTimeAsync(1)

    expect(searchModule).toHaveBeenCalledTimes(1)
    expect(searchModule).toHaveBeenCalledWith('purchase-orders', 'CG20260001')
    expect(support.keyword.value).toBe('CG20260001')
  })

  it('aborts the previous aggregated search request before sending the next one', async () => {
    vi.useFakeTimers()

    const signals: AbortSignal[] = []
    const searchAllModules = vi.fn(
      (_keyword: string, _moduleKeys: string[], signal?: AbortSignal) =>
        new Promise<never[]>((_, reject) => {
          if (signal) {
            signals.push(signal)
            signal.addEventListener('abort', () => {
              const error = new Error('aborted')
              ;(error as Error & { name: string }).name = 'AbortError'
              reject(error)
            }, { once: true })
          }
        }),
    )

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders'],
      pageConfigs: businessPageConfigs,
      router: { push: vi.fn() },
      canAccessModule: () => true,
      searchAllModules,
    })

    await support.handleSearch('CG2026')
    await vi.advanceTimersByTimeAsync(220)
    expect(searchAllModules).toHaveBeenCalledTimes(1)
    expect(signals[0]?.aborted).toBe(false)

    await support.handleSearch('CG20260001')
    expect(signals[0]?.aborted).toBe(true)

    await vi.advanceTimersByTimeAsync(220)
    expect(searchAllModules).toHaveBeenCalledTimes(2)
    expect(signals[1]?.aborted).toBe(false)
  })
})
