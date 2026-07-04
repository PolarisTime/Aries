import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRefreshQuery } from './useRefreshQuery'

const invalidateQueriesMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    generalSetting: ['general-setting'],
    numberRules: ['number-rules'],
    runtimeConfig: ['runtime-config'],
  },
}))

describe('useRefreshQuery', () => {
  beforeEach(() => {
    invalidateQueriesMock.mockClear()
  })

  it('returns a function that invalidates the given query key', () => {
    const { result } = renderHook(() => useRefreshQuery(['orders']))
    result.current()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })

  it('works with different query keys', () => {
    const { result } = renderHook(() => useRefreshQuery(['users']))
    result.current()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['users'] })
  })

  it('invalidates runtime config when refreshing general settings', () => {
    const { result } = renderHook(() => useRefreshQuery(['general-setting']))
    result.current()

    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(1, {
      queryKey: ['general-setting'],
    })
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(2, {
      queryKey: ['number-rules'],
    })
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(3, {
      queryKey: ['runtime-config'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(3)
  })

  it('invalidates shared system setting caches when refreshing number rules', () => {
    const { result } = renderHook(() => useRefreshQuery(['number-rules']))
    result.current()

    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(1, {
      queryKey: ['number-rules'],
    })
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(2, {
      queryKey: ['general-setting'],
    })
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(3, {
      queryKey: ['runtime-config'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(3)
  })
})
