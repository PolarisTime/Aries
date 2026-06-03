import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useModuleFilters } from './useModuleFilters'

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
    expect(result.current.filters).toEqual({ status: 'pending', keyword: 'test' })
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
