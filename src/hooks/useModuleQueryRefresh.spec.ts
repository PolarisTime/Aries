import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { useQueryClientMock, invalidateQueriesMock } = vi.hoisted(() => ({
  useQueryClientMock: vi.fn(),
  invalidateQueriesMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: useQueryClientMock,
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    businessGrid: vi.fn((key: string) => ['businessGrid', key]),
    businessGridAll: vi.fn((key: string) => ['businessGridAll', key]),
  },
}))

import { useModuleQueryRefresh } from './useModuleQueryRefresh'

describe('useModuleQueryRefresh', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    })
  })

  it('returns refreshModuleQueries function', () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    expect(result.current.refreshModuleQueries).toBeDefined()
  })

  it('invalidates businessGrid query', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGrid', 'sales-order'],
    })
  })

  it('invalidates businessGridAll query', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGridAll', 'sales-order'],
    })
  })

  it('invalidates both queries in parallel', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledTimes(2)
  })

  it('uses correct module key', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('purchase-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGrid', 'purchase-order'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGridAll', 'purchase-order'],
    })
  })
})
