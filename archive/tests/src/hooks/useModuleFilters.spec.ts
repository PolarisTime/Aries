import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildDefaultModuleFilters, useModuleFilters } from './useModuleFilters'

describe('useModuleFilters', () => {
  const defaultProps = {
    setCurrentPage: vi.fn(),
  }

  it('initializes with empty filters', () => {
    const { result } = renderHook(() => useModuleFilters(defaultProps))
    expect(result.current.filters).toEqual({})
    expect(result.current.submittedFilters).toEqual({})
  })

  it('updates filter with updateFilter', () => {
    const { result } = renderHook(() => useModuleFilters(defaultProps))
    act(() => {
      result.current.updateFilter('status', 'pending')
    })
    expect(result.current.filters).toEqual({ status: 'pending' })
  })

  it('updates multiple filters', () => {
    const { result } = renderHook(() => useModuleFilters(defaultProps))
    act(() => {
      result.current.updateFilter('status', 'pending')
      result.current.updateFilter('keyword', 'test')
    })
    expect(result.current.filters).toEqual({
      status: 'pending',
      keyword: 'test',
    })
  })

  it('submits filters and resets page to 1', () => {
    const setCurrentPage = vi.fn()
    const { result } = renderHook(() => useModuleFilters({ setCurrentPage }))

    act(() => {
      result.current.updateFilter('status', 'pending')
    })
    act(() => {
      result.current.handleSearch()
    })

    expect(result.current.submittedFilters).toEqual({ status: 'pending' })
    expect(setCurrentPage).toHaveBeenCalledWith(1)
  })

  it('resets filters and page', () => {
    const setCurrentPage = vi.fn()
    const { result } = renderHook(() => useModuleFilters({ setCurrentPage }))

    act(() => {
      result.current.updateFilter('status', 'pending')
      result.current.updateFilter('keyword', 'test')
    })
    act(() => {
      result.current.handleSearch()
    })
    act(() => {
      result.current.handleReset()
    })

    expect(result.current.filters).toEqual({})
    expect(result.current.submittedFilters).toEqual({})
    expect(setCurrentPage).toHaveBeenCalledWith(1)
  })

  it('initializes with default filters', () => {
    const defaultFilters = {
      status: 'open',
      orderDate: ['2026-05-29', '2026-06-28'],
    }
    const { result } = renderHook(() =>
      useModuleFilters({ ...defaultProps, defaultFilters }),
    )

    expect(result.current.filters).toEqual(defaultFilters)
    expect(result.current.submittedFilters).toEqual(defaultFilters)
    expect(result.current.filters).not.toBe(defaultFilters)
    expect(result.current.submittedFilters).not.toBe(defaultFilters)
  })

  it('resets to default filters', () => {
    const setCurrentPage = vi.fn()
    const defaultFilters = { orderDate: ['2026-05-29', '2026-06-28'] }
    const { result } = renderHook(() =>
      useModuleFilters({ setCurrentPage, defaultFilters }),
    )

    act(() => {
      result.current.updateFilter('keyword', 'PO-001')
    })
    act(() => {
      result.current.handleReset()
    })

    expect(result.current.filters).toEqual(defaultFilters)
    expect(result.current.submittedFilters).toEqual(defaultFilters)
    expect(setCurrentPage).toHaveBeenCalledWith(1)
  })

  it('merges changed default filters without dropping user filters', () => {
    const { result, rerender } = renderHook(
      ({ defaultFilters }) =>
        useModuleFilters({ ...defaultProps, defaultFilters }),
      {
        initialProps: {
          defaultFilters: {},
        },
      },
    )

    act(() => {
      result.current.updateFilter('keyword', 'PO-001')
    })

    rerender({
      defaultFilters: { orderDate: ['2026-05-29', '2026-06-28'] },
    })

    expect(result.current.filters).toEqual({
      orderDate: ['2026-05-29', '2026-06-28'],
      keyword: 'PO-001',
    })
    expect(result.current.submittedFilters).toEqual({
      orderDate: ['2026-05-29', '2026-06-28'],
    })
  })

  it('replaces previous default filters when defaults change', () => {
    const { result, rerender } = renderHook(
      ({ defaultFilters }) =>
        useModuleFilters({ ...defaultProps, defaultFilters }),
      {
        initialProps: {
          defaultFilters: { orderDate: ['2026-05-29', '2026-06-28'] },
        },
      },
    )

    act(() => {
      result.current.updateFilter('keyword', 'PO-001')
    })

    rerender({
      defaultFilters: { createdAt: ['2026-06-01', '2026-06-28'] },
    })

    expect(result.current.filters).toEqual({
      createdAt: ['2026-06-01', '2026-06-28'],
      keyword: 'PO-001',
    })
    expect(result.current.submittedFilters).toEqual({
      createdAt: ['2026-06-01', '2026-06-28'],
    })
  })

  it('builds date range defaults from the first dateRange filter', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-28T12:00:00+08:00'))

    const defaults = buildDefaultModuleFilters({
      key: 'purchase-order',
      title: '采购订单',
      kicker: '',
      description: '',
      filters: [{ key: 'orderDate', label: '订单日期', type: 'dateRange' }],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
    })

    expect(defaults).toEqual({
      orderDate: ['2026-05-28', '2026-06-28'],
    })
    vi.useRealTimers()
  })

  it('keeps one-month date range defaults valid at month end', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T12:00:00+08:00'))

    const defaults = buildDefaultModuleFilters({
      key: 'purchase-order',
      title: '采购订单',
      kicker: '',
      description: '',
      filters: [{ key: 'orderDate', label: '订单日期', type: 'dateRange' }],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
    })

    expect(defaults).toEqual({
      orderDate: ['2026-02-28', '2026-03-31'],
    })
    vi.useRealTimers()
  })

  it('does not build defaults without dateRange filters', () => {
    expect(
      buildDefaultModuleFilters({
        key: 'material',
        title: '商品',
        kicker: '',
        description: '',
        filters: [{ key: 'keyword', label: '关键字', type: 'input' }],
        columns: [],
        detailFields: [],
        data: [],
        buildOverview: () => [],
      }),
    ).toEqual({})
  })

  it('does not build defaults without config', () => {
    expect(buildDefaultModuleFilters(null)).toEqual({})
  })

  it('sets filters directly', () => {
    const { result } = renderHook(() => useModuleFilters(defaultProps))
    act(() => {
      result.current.setFilters({ status: 'confirmed' })
    })
    expect(result.current.filters).toEqual({ status: 'confirmed' })
  })

  it('sets submitted filters directly', () => {
    const { result } = renderHook(() => useModuleFilters(defaultProps))
    act(() => {
      result.current.setSubmittedFilters({ status: 'confirmed' })
    })
    expect(result.current.submittedFilters).toEqual({ status: 'confirmed' })
  })

  it('applies filters and submits them immediately', () => {
    const setCurrentPage = vi.fn()
    const { result } = renderHook(() => useModuleFilters({ setCurrentPage }))

    act(() => {
      result.current.applyFilters({ status: 'open' })
    })

    expect(result.current.filters).toEqual({ status: 'open' })
    expect(result.current.submittedFilters).toEqual({ status: 'open' })
    expect(setCurrentPage).toHaveBeenCalledWith(1)
  })

  it('creates a copy of filters when submitting', () => {
    const { result } = renderHook(() => useModuleFilters(defaultProps))

    act(() => {
      result.current.updateFilter('status', 'pending')
    })
    act(() => {
      result.current.handleSearch()
    })

    expect(result.current.submittedFilters).not.toBe(result.current.filters)
    expect(result.current.submittedFilters).toEqual(result.current.filters)
  })
})
