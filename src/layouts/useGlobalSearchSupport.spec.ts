import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as globalSearchApi from '@/api/global-search'
import * as globalSearch from '@/layouts/global-search'
import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'

vi.mock('@/api/global-search', () => ({
  searchGlobalDocuments: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/config/page-registry', () => ({
  appPageDefinitions: [],
  getSearchableModuleKeys: vi.fn().mockReturnValue(['purchase-order']),
}))

vi.mock('@/layouts/global-search', () => ({
  buildGlobalSearchSummary: vi.fn(),
  searchAccessibleModules: vi.fn(),
}))

describe('useGlobalSearchSupport', () => {
  const makeResult = (
    overrides: Partial<globalSearch.GlobalSearchResult> = {},
  ): globalSearch.GlobalSearchResult => ({
    value: 'purchase-order::1001',
    label: '采购订单 | PO-001',
    moduleKey: 'purchase-order',
    title: '采购订单',
    trackId: '1001',
    primaryNo: 'PO-001',
    summary: '',
    matchedByTrackId: false,
    ...overrides,
  })

  const defaultOptions = {
    canAccessModule: vi.fn().mockReturnValue(true),
    onJump: vi.fn(),
    searchModule: vi.fn().mockResolvedValue({ data: { rows: [] } }),
  }

  beforeEach(() => {
    vi.mocked(globalSearch.searchAccessibleModules).mockReset()
    vi.mocked(globalSearchApi.searchGlobalDocuments).mockReset()
    vi.mocked(globalSearchApi.searchGlobalDocuments).mockResolvedValue([])
    defaultOptions.canAccessModule.mockReturnValue(true)
    defaultOptions.onJump.mockReset()
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))
    expect(result.current.keyword).toBe('')
    expect(result.current.loading).toBe(false)
    expect(result.current.results).toEqual([])
    expect(result.current.resultOptions).toEqual([])
  })

  it('updates keyword on handleSearch', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSearch('test')
    })

    expect(result.current.keyword).toBe('test')
  })

  it('sets loading during search', async () => {
    let resolveSearch: (value: any) => void
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve
    })
    vi.mocked(globalSearch.searchAccessibleModules).mockReturnValue(
      searchPromise as any,
    )

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    act(() => {
      result.current.handleSearch('test')
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolveSearch!([])
    })

    expect(result.current.loading).toBe(false)
  })

  it('clears results on empty keyword search', async () => {
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSearch('')
    })

    expect(result.current.results).toEqual([])
  })

  it('maps results to resultOptions', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      {
        value: 'purchase-order::1001',
        label: '采购订单 | PO-001',
        moduleKey: 'purchase-order',
        title: '采购订单',
        trackId: '1001',
        primaryNo: 'PO-001',
        summary: '供应商',
        matchedByTrackId: false,
      },
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSearch('PO-001')
    })

    expect(result.current.resultOptions).toEqual([
      { value: 'purchase-order::1001', label: '采购订单 | PO-001' },
    ])
  })

  it('jumps to result on handleSelect', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      {
        value: 'purchase-order::1001',
        label: '采购订单 | PO-001',
        moduleKey: 'purchase-order',
        title: '采购订单',
        trackId: '1001',
        primaryNo: 'PO-001',
        summary: '',
        matchedByTrackId: false,
      },
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSearch('PO-001')
    })

    act(() => {
      result.current.handleSelect('purchase-order::1001')
    })

    expect(defaultOptions.onJump).toHaveBeenCalledWith(
      expect.objectContaining({ primaryNo: 'PO-001' }),
    )
    expect(result.current.results).toEqual([])
  })

  it('does not jump on handleSelect with unknown value', async () => {
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    act(() => {
      result.current.handleSelect('unknown-key')
    })

    expect(defaultOptions.onJump).not.toHaveBeenCalled()
  })

  it('clears results on handleBlur after timeout', async () => {
    vi.useFakeTimers()
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      {
        value: 'purchase-order::1001',
        label: '采购订单 | PO-001',
        moduleKey: 'purchase-order',
        title: '采购订单',
        trackId: '1001',
        primaryNo: 'PO-001',
        summary: '',
        matchedByTrackId: false,
      },
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSearch('test')
    })

    expect(result.current.results).toHaveLength(1)

    act(() => {
      result.current.handleBlur()
    })

    act(() => {
      vi.advanceTimersByTime(120)
    })

    expect(result.current.results).toEqual([])
    vi.useRealTimers()
  })

  it('handleSubmit jumps to exact match', async () => {
    const matchedResult = {
      value: 'purchase-order::1001',
      label: '采购订单 | PO-001',
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: '1001',
      primaryNo: 'PO-001',
      summary: '',
      matchedByTrackId: false,
    }
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      matchedResult,
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSubmit('PO-001')
    })

    expect(defaultOptions.onJump).toHaveBeenCalledWith(matchedResult)
  })

  it('handleSubmit clears results on empty keyword', async () => {
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSubmit('')
    })

    expect(result.current.results).toEqual([])
    expect(defaultOptions.onJump).not.toHaveBeenCalled()
  })

  it('clearResults resets results', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      {
        value: 'purchase-order::1001',
        label: '采购订单 | PO-001',
        moduleKey: 'purchase-order',
        title: '采购订单',
        trackId: '1001',
        primaryNo: 'PO-001',
        summary: '',
        matchedByTrackId: false,
      },
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSearch('test')
    })

    expect(result.current.results).toHaveLength(1)

    act(() => {
      result.current.clearResults()
    })

    expect(result.current.results).toEqual([])
  })

  it('jumpToResult clears results and calls onJump', async () => {
    const result_ = {
      value: 'purchase-order::1001',
      label: '采购订单 | PO-001',
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: '1001',
      primaryNo: 'PO-001',
      summary: '',
      matchedByTrackId: false,
    }

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    act(() => {
      result.current.jumpToResult(result_)
    })

    expect(defaultOptions.onJump).toHaveBeenCalledWith(result_)
    expect(result.current.results).toEqual([])
  })

  it('handleSubmit jumps to single result when only one exists', async () => {
    const singleResult = {
      value: 'purchase-order::1002',
      label: '采购订单 | PO-002',
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: '1002',
      primaryNo: 'PO-002',
      summary: '',
      matchedByTrackId: false,
    }
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      singleResult,
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSubmit('供应商')
    })

    expect(defaultOptions.onJump).toHaveBeenCalledWith(singleResult)
  })

  it('handleSubmit does not jump when multiple results and no exact match', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      {
        value: 'purchase-order::1001',
        label: '采购订单 | PO-001',
        moduleKey: 'purchase-order',
        title: '采购订单',
        trackId: '1001',
        primaryNo: 'PO-001',
        summary: '',
        matchedByTrackId: false,
      },
      {
        value: 'sales-order::1002',
        label: '销售订单 | SO-001',
        moduleKey: 'sales-order',
        title: '销售订单',
        trackId: '1002',
        primaryNo: 'SO-001',
        summary: '',
        matchedByTrackId: false,
      },
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSubmit('test')
    })

    expect(defaultOptions.onJump).not.toHaveBeenCalled()
  })

  it('handleSubmit matches by trackId', async () => {
    const matchedResult = {
      value: 'purchase-order::1001',
      label: '采购订单 | PO-001',
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: '1001',
      primaryNo: 'PO-001',
      summary: '',
      matchedByTrackId: true,
    }
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      matchedResult,
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSubmit('1001')
    })

    expect(defaultOptions.onJump).toHaveBeenCalledWith(matchedResult)
  })

  it('handleBlur clears results immediately when window is undefined', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      makeResult(),
    ])
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSearch('test')
    })

    expect(result.current.results).toHaveLength(1)

    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'window',
    )
    const originalWindow = window
    let windowReadCount = 0
    try {
      act(() => {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          get: () => {
            windowReadCount += 1
            return windowReadCount === 1 ? undefined : originalWindow
          },
        })
        result.current.handleBlur()
      })
    } finally {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor!)
    }

    expect(result.current.results).toEqual([])
  })

  it('setKeyword updates keyword directly', () => {
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    act(() => {
      result.current.setKeyword('direct-set')
    })

    expect(result.current.keyword).toBe('direct-set')
  })

  it('performSearch returns results', async () => {
    const searchResult = {
      value: 'purchase-order::1001',
      label: '采购订单 | PO-001',
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: '1001',
      primaryNo: 'PO-001',
      summary: '',
      matchedByTrackId: false,
    }
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([
      searchResult,
    ])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    let returnedResults: any
    await act(async () => {
      returnedResults = await result.current.performSearch('test')
    })

    expect(returnedResults).toEqual([searchResult])
  })

  it('performSearch returns empty array for empty keyword', async () => {
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    let returnedResults: any
    await act(async () => {
      returnedResults = await result.current.performSearch('   ')
    })

    expect(returnedResults).toEqual([])
  })

  it('uses default pageConfigs when not provided', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([])
    const optionsWithoutPageConfigs = {
      canAccessModule: vi.fn().mockReturnValue(true),
      onJump: vi.fn(),
      searchModule: vi.fn().mockResolvedValue({ data: { rows: [] } }),
    }

    const { result } = renderHook(() =>
      useGlobalSearchSupport(optionsWithoutPageConfigs),
    )

    await act(async () => {
      await result.current.handleSearch('test')
    })

    expect(result.current.keyword).toBe('test')
  })

  it('uses default moduleKeys when not provided', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([])
    const optionsWithoutModuleKeys = {
      canAccessModule: vi.fn().mockReturnValue(true),
      onJump: vi.fn(),
      searchModule: vi.fn().mockResolvedValue({ data: { rows: [] } }),
    }

    const { result } = renderHook(() =>
      useGlobalSearchSupport(optionsWithoutModuleKeys),
    )

    await act(async () => {
      await result.current.handleSearch('test')
    })

    expect(result.current.keyword).toBe('test')
  })

  it('aborts previous search when new search starts', async () => {
    let resolveFirst: (value: any) => void
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve
    })
    vi.mocked(globalSearch.searchAccessibleModules)
      .mockReturnValueOnce(firstPromise as any)
      .mockResolvedValueOnce([])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    act(() => {
      result.current.handleSearch('first')
    })

    await act(async () => {
      await result.current.handleSearch('second')
    })

    resolveFirst!([])
    expect(result.current.keyword).toBe('second')
  })

  it('ignores stale aborted search errors after a newer search starts', async () => {
    let rejectFirst: (error: unknown) => void
    const firstPromise = new Promise((_, reject) => {
      rejectFirst = reject
    })
    vi.mocked(globalSearch.searchAccessibleModules)
      .mockReturnValueOnce(firstPromise as any)
      .mockResolvedValueOnce([])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    let firstSearch: Promise<any>
    act(() => {
      firstSearch = result.current.performSearch('first')
    })

    await act(async () => {
      await result.current.performSearch('second')
    })

    await act(async () => {
      rejectFirst!(new Error('first aborted'))
      await expect(firstSearch).resolves.toEqual([])
    })

    expect(result.current.loading).toBe(false)
  })

  it('rethrows stale non-aborted search errors without changing current loading', async () => {
    class NonAbortingAbortController {
      readonly signal = { aborted: false }

      abort = vi.fn()
    }

    vi.stubGlobal('AbortController', NonAbortingAbortController)
    try {
      let rejectFirst: (error: unknown) => void
      const firstPromise = new Promise((_, reject) => {
        rejectFirst = reject
      })
      vi.mocked(globalSearch.searchAccessibleModules)
        .mockReturnValueOnce(firstPromise as any)
        .mockResolvedValueOnce([])

      const { result } = renderHook(() =>
        useGlobalSearchSupport(defaultOptions),
      )

      let firstSearch: Promise<any>
      act(() => {
        firstSearch = result.current.performSearch('first')
      })

      await act(async () => {
        await result.current.performSearch('second')
      })

      await act(async () => {
        rejectFirst!(new Error('stale search failed'))
        await expect(firstSearch).rejects.toThrow('stale search failed')
      })

      expect(result.current.loading).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('uses global document search when no local search callbacks are provided', async () => {
    const remoteResult = makeResult()
    vi.mocked(globalSearchApi.searchGlobalDocuments).mockResolvedValue([
      remoteResult,
    ])
    const canAccessModule = vi.fn((moduleKey: string) =>
      moduleKey.startsWith('purchase'),
    )
    const onJump = vi.fn()

    const { result } = renderHook(() =>
      useGlobalSearchSupport({
        canAccessModule,
        onJump,
        moduleKeys: ['purchase-order', 'sales-order'],
      }),
    )

    let returnedResults: any
    await act(async () => {
      returnedResults = await result.current.performSearch('  PO-001  ')
    })

    expect(globalSearchApi.searchGlobalDocuments).toHaveBeenCalledWith(
      'PO-001',
      ['purchase-order'],
      expect.any(AbortSignal),
    )
    expect(globalSearch.searchAccessibleModules).not.toHaveBeenCalled()
    expect(returnedResults).toEqual([remoteResult])
    expect(result.current.results).toEqual([remoteResult])
  })

  it('uses default local searchModule when only lookupRecordById is provided', async () => {
    const lookupRecordById = vi.fn()
    const buildSummary = vi.fn()
    const pageConfigs = {}
    vi.mocked(globalSearch.searchAccessibleModules).mockImplementation(
      async (config: any) => {
        expect(config.pageConfigs).toBe(pageConfigs)
        expect(config.lookupRecordById).toBe(lookupRecordById)
        expect(config.buildSummary).toBe(buildSummary)
        expect(await config.searchModule('purchase-order', 'PO-001')).toEqual({
          data: { rows: [] },
        })
        return []
      },
    )

    const { result } = renderHook(() =>
      useGlobalSearchSupport({
        canAccessModule: vi.fn().mockReturnValue(true),
        onJump: vi.fn(),
        moduleKeys: ['purchase-order'],
        pageConfigs,
        lookupRecordById,
        buildSummary,
      }),
    )

    await act(async () => {
      await result.current.performSearch('PO-001')
    })

    expect(globalSearch.searchAccessibleModules).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: 'PO-001',
        moduleKeys: ['purchase-order'],
      }),
    )
  })

  it('clears loading and rethrows rejected search errors', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockRejectedValue(
      new Error('async search failed'),
    )

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await expect(result.current.performSearch('fail')).rejects.toThrow(
        'async search failed',
      )
    })

    expect(result.current.loading).toBe(false)
  })

  it('clears loading and rethrows synchronous search errors', async () => {
    vi.mocked(globalSearch.searchAccessibleModules).mockImplementation(() => {
      throw new Error('sync search failed')
    })

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await expect(result.current.performSearch('fail')).rejects.toThrow(
        'sync search failed',
      )
    })

    expect(result.current.loading).toBe(false)
  })

  it('stops loading when the active search is aborted by an empty search', async () => {
    let rejectSearch: (error: unknown) => void
    const searchPromise = new Promise((_, reject) => {
      rejectSearch = reject
    })
    vi.mocked(globalSearch.searchAccessibleModules).mockReturnValue(
      searchPromise as any,
    )

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    let pendingSearch: Promise<any>
    act(() => {
      pendingSearch = result.current.performSearch('PO-001')
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await expect(result.current.performSearch('   ')).resolves.toEqual([])
    })

    await act(async () => {
      rejectSearch!(new Error('request aborted'))
      await expect(pendingSearch).resolves.toEqual([])
    })

    expect(result.current.loading).toBe(false)
  })

  it('aborts an active search when submitting an empty keyword', async () => {
    let rejectSearch: (error: unknown) => void
    const searchPromise = new Promise((_, reject) => {
      rejectSearch = reject
    })
    vi.mocked(globalSearch.searchAccessibleModules).mockReturnValue(
      searchPromise as any,
    )

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    let pendingSearch: Promise<any>
    act(() => {
      pendingSearch = result.current.performSearch('PO-001')
    })

    await act(async () => {
      await result.current.handleSubmit('   ')
    })

    await act(async () => {
      rejectSearch!(new Error('request aborted'))
      await expect(pendingSearch).resolves.toEqual([])
    })

    expect(result.current.results).toEqual([])
    expect(defaultOptions.onJump).not.toHaveBeenCalled()
  })
})
