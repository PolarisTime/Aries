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
    clientSettings: ['general-setting', 'client-settings'],
    displaySwitches: ['display-switches'],
    generalSetting: ['general-setting'],
    numberRules: ['number-rules'],
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

  it('invalidates client settings when refreshing general settings', () => {
    const { result } = renderHook(() => useRefreshQuery(['general-setting']))
    result.current()

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['general-setting'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['number-rules'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['general-setting', 'client-settings'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['display-switches'],
    })
  })

  it('invalidates shared system setting caches when refreshing number rules', () => {
    const { result } = renderHook(() => useRefreshQuery(['number-rules']))
    result.current()

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['number-rules'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['general-setting'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['general-setting', 'client-settings'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['display-switches'],
    })
  })
})
