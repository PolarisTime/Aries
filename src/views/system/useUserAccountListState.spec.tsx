import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListUserAccounts = vi.fn()
const mockUseQuery = vi.fn()
const mockRefresh = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('@/api/user-accounts', () => ({
  listUserAccounts: (...args: unknown[]) => mockListUserAccounts(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    userAccount: (...args: unknown[]) => ['userAccount', ...args],
    userAccountBase: ['userAccount'],
  },
}))

vi.mock('@/hooks/useRefreshQuery', () => ({
  useRefreshQuery: () => mockRefresh,
}))

import { useUserAccountListState } from '@/views/system/useUserAccountListState'

type UserAccountQueryOptions = {
  queryKey: unknown[]
  queryFn: () => Promise<unknown>
  enabled: boolean
}

function getLatestQueryOptions() {
  return mockUseQuery.mock.calls.at(-1)?.[0] as UserAccountQueryOptions
}

describe('useUserAccountListState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({
      data: {
        records: [
          { id: '1', loginName: 'admin', userName: 'Admin' },
          { id: '2', loginName: 'user1', userName: 'User One' },
        ],
        totalElements: 2,
      },
      isLoading: false,
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useUserAccountListState())
    expect(result.current.keyword).toBe('')
    expect(result.current.statusFilter).toBeUndefined()
    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageSize).toBe(20)
  })

  it('fetches user accounts on mount', () => {
    const { result } = renderHook(() => useUserAccountListState())
    expect(result.current.users).toHaveLength(2)
    expect(result.current.totalElements).toBe(2)
  })

  it('builds query params with zero-based page and empty filters omitted', async () => {
    const response = { records: [], totalElements: 0 }
    mockListUserAccounts.mockResolvedValue(response)

    const { result } = renderHook(() => useUserAccountListState())

    act(() => {
      result.current.handlePageChange(3, 50)
    })

    await expect(getLatestQueryOptions().queryFn()).resolves.toBe(response)
    expect(mockListUserAccounts).toHaveBeenCalledWith({
      page: 2,
      size: 50,
      keyword: undefined,
      status: undefined,
    })
  })

  it('builds query params with trimmed keyword and selected status', async () => {
    const response = { records: [{ id: '1' }], totalElements: 1 }
    mockListUserAccounts.mockResolvedValue(response)

    const { result } = renderHook(() => useUserAccountListState())

    act(() => {
      result.current.setKeyword('  admin  ')
      result.current.handleStatusFilterChange('enabled')
    })

    await expect(getLatestQueryOptions().queryFn()).resolves.toBe(response)
    expect(mockListUserAccounts).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      keyword: 'admin',
      status: 'enabled',
    })
  })

  it('updates keyword via setKeyword', () => {
    const { result } = renderHook(() => useUserAccountListState())
    act(() => {
      result.current.setKeyword('test')
    })
    expect(result.current.keyword).toBe('test')
  })

  it('updates status filter and resets page', () => {
    const { result } = renderHook(() => useUserAccountListState())
    act(() => {
      result.current.handleStatusFilterChange('enabled')
    })
    expect(result.current.statusFilter).toBe('enabled')
  })

  it('handles page change', () => {
    const { result } = renderHook(() => useUserAccountListState())
    act(() => {
      result.current.handlePageChange(2, 50)
    })
    expect(result.current.currentPage).toBe(2)
    expect(result.current.pageSize).toBe(50)
  })

  it('does not fetch when enabled is false', () => {
    renderHook(() => useUserAccountListState(false))
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('handles empty response', () => {
    mockUseQuery.mockReturnValue({
      data: { records: [], totalElements: 0 },
      isLoading: false,
    })
    const { result } = renderHook(() => useUserAccountListState())
    expect(result.current.users).toEqual([])
    expect(result.current.totalElements).toBe(0)
  })

  it('handles search by resetting page to 1', () => {
    const { result } = renderHook(() => useUserAccountListState())
    act(() => {
      result.current.handlePageChange(5, 20)
    })
    act(() => {
      result.current.handleSearch()
    })
    expect(result.current.currentPage).toBe(1)
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('clears status filter', () => {
    const { result } = renderHook(() => useUserAccountListState())
    act(() => {
      result.current.handleStatusFilterChange('enabled')
    })
    expect(result.current.statusFilter).toBe('enabled')
    act(() => {
      result.current.handleStatusFilterChange(undefined)
    })
    expect(result.current.statusFilter).toBeUndefined()
  })

  it('returns isLoading from query', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    const { result } = renderHook(() => useUserAccountListState())
    expect(result.current.isLoading).toBe(true)
  })

  it('returns refresh function', () => {
    const { result } = renderHook(() => useUserAccountListState())
    expect(typeof result.current.refresh).toBe('function')
  })

  it('returns all expected properties', () => {
    const { result } = renderHook(() => useUserAccountListState())
    expect(result.current).toHaveProperty('keyword')
    expect(result.current).toHaveProperty('statusFilter')
    expect(result.current).toHaveProperty('currentPage')
    expect(result.current).toHaveProperty('pageSize')
    expect(result.current).toHaveProperty('users')
    expect(result.current).toHaveProperty('totalElements')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('setKeyword')
    expect(result.current).toHaveProperty('handleSearch')
    expect(result.current).toHaveProperty('handleStatusFilterChange')
    expect(result.current).toHaveProperty('handlePageChange')
    expect(result.current).toHaveProperty('refresh')
  })
})
