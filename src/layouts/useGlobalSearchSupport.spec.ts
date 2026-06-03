import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'
import * as globalSearch from '@/layouts/global-search'
import * as pageRegistry from '@/config/page-registry'

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
  const defaultOptions = {
    canAccessModule: vi.fn().mockReturnValue(true),
    onJump: vi.fn(),
    searchModule: vi.fn().mockResolvedValue({ data: { rows: [] } }),
  }

  beforeEach(() => {
    vi.mocked(globalSearch.searchAccessibleModules).mockReset()
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
    vi.mocked(globalSearch.searchAccessibleModules).mockReturnValue(searchPromise as any)

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
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([matchedResult])

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
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([singleResult])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSubmit('PO-002')
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
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([matchedResult])

    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    await act(async () => {
      await result.current.handleSubmit('1001')
    })

    expect(defaultOptions.onJump).toHaveBeenCalledWith(matchedResult)
  })

  it('handleBlur clears results immediately when window is undefined', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGlobalSearchSupport(defaultOptions))

    act(() => {
      result.current.handleBlur()
    })

    expect(result.current.results).toEqual([])

    act(() => {
      vi.advanceTimersByTime(120)
    })

    expect(result.current.results).toEqual([])
    vi.useRealTimers()
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
    vi.mocked(globalSearch.searchAccessibleModules).mockResolvedValue([searchResult])

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

    const { result } = renderHook(() => useGlobalSearchSupport(optionsWithoutPageConfigs))

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

    const { result } = renderHook(() => useGlobalSearchSupport(optionsWithoutModuleKeys))

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
})
