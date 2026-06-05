import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRefreshQuery } from './useRefreshQuery'

const invalidateQueriesMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

describe('useRefreshQuery', () => {
  it('returns a function that invalidates the given query key', () => {
    const { result } = renderHook(() => useRefreshQuery('orders'))
    result.current()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })

  it('works with different query keys', () => {
    const { result } = renderHook(() => useRefreshQuery('users'))
    result.current()
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['users'] })
  })
})
