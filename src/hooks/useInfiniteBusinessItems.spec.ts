import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useQueryMock, listBusinessModuleMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  listBusinessModuleMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: 'keepPreviousData',
  useQuery: useQueryMock,
}))

vi.mock('@/api/business-listing', () => ({
  listBusinessModule: listBusinessModuleMock,
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    businessGridList: vi.fn(
      (moduleKey: string, filters: any, page: number, size: number) => [
        'businessGridList',
        moduleKey,
        filters,
        page,
        size,
      ],
    ),
  },
}))

import { useInfiniteBusinessItems } from './useInfiniteBusinessItems'

describe('useInfiniteBusinessItems', () => {
  const defaultProps = {
    moduleKey: 'sales-order',
    filters: { status: 'pending' },
    enabled: true,
    currentPage: 1,
    pageSize: 20,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    useQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  it('returns default values when no data', () => {
    const { result } = renderHook(() => useInfiniteBusinessItems(defaultProps))
    expect(result.current.records).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.responseCode).toBe(0)
    expect(result.current.warningMessage).toBe('')
  })

  it('returns records from query data', () => {
    const data = {
      code: 0,
      data: {
        rows: [{ id: '1', name: 'Test' }],
        total: 1,
      },
    }
    useQueryMock.mockReturnValue({
      data,
      isLoading: false,
      isFetching: false,
      error: null,
    })

    const { result } = renderHook(() => useInfiniteBusinessItems(defaultProps))
    expect(result.current.records).toEqual([{ id: '1', name: 'Test' }])
    expect(result.current.total).toBe(1)
  })

  it('returns warning message when response code is not 0', () => {
    const data = {
      code: 400,
      message: 'Invalid request',
      data: { rows: [], total: 0 },
    }
    useQueryMock.mockReturnValue({
      data,
      isLoading: false,
      isFetching: false,
      error: null,
    })

    const { result } = renderHook(() => useInfiniteBusinessItems(defaultProps))
    expect(result.current.responseCode).toBe(400)
    expect(result.current.warningMessage).toBe('Invalid request')
  })

  it('passes correct query configuration', () => {
    renderHook(() => useInfiniteBusinessItems(defaultProps))

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'businessGridList',
          'sales-order',
          { status: 'pending' },
          1,
          20,
        ],
        enabled: true,
        staleTime: 5_000,
        placeholderData: 'keepPreviousData',
      }),
    )
  })

  it('disables query when enabled is false', () => {
    renderHook(() =>
      useInfiniteBusinessItems({ ...defaultProps, enabled: false }),
    )
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('disables query when moduleKey is empty', () => {
    renderHook(() =>
      useInfiniteBusinessItems({ ...defaultProps, moduleKey: '' }),
    )
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('returns loading state', () => {
    useQueryMock.mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: false,
      error: null,
    })

    const { result } = renderHook(() => useInfiniteBusinessItems(defaultProps))
    expect(result.current.isLoading).toBe(true)
  })

  it('returns fetching state', () => {
    useQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: true,
      error: null,
    })

    const { result } = renderHook(() => useInfiniteBusinessItems(defaultProps))
    expect(result.current.isFetching).toBe(true)
  })

  it('returns error state', () => {
    const error = new Error('Network error')
    useQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error,
    })

    const { result } = renderHook(() => useInfiniteBusinessItems(defaultProps))
    expect(result.current.error).toBe(error)
  })
})
