import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListRefreshTokens = vi.fn()
const mockGetRefreshTokenSummary = vi.fn()
const mockRevokeRefreshToken = vi.fn()
const mockRevokeAllRefreshTokens = vi.fn()
const mockShowError = vi.fn()
const mockCan = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockModalConfirm = vi.fn()
const mockUseQuery = vi.fn()
const mockUseQueryClient = vi.fn()
const mockInvalidateQueries = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/api/session-management', () => ({
  listRefreshTokens: (...args: unknown[]) => mockListRefreshTokens(...args),
  getRefreshTokenSummary: (...args: unknown[]) =>
    mockGetRefreshTokenSummary(...args),
  revokeRefreshToken: (...args: unknown[]) => mockRevokeRefreshToken(...args),
  revokeAllRefreshTokens: (...args: unknown[]) =>
    mockRevokeAllRefreshTokens(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    refreshTokensBase: ['refreshTokens'],
    refreshTokensSummary: ['refreshTokensSummary'],
    refreshTokens: (page: number, size: number, keyword: string) => [
      'refreshTokens',
      page,
      size,
      keyword,
    ],
  },
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
  modal: { confirm: (...args: unknown[]) => mockModalConfirm(...args) },
}))

vi.mock('@/views/system/session-management-view-utils', () => ({
  buildSessionTableColumns: vi.fn(() => []),
}))

import { useSessionManagementState } from '@/views/system/useSessionManagementState'

const defaultTokensData = {
  records: [
    { id: '1', username: 'admin', device: 'Chrome' },
    { id: '2', username: 'user1', device: 'Firefox' },
  ],
  totalElements: 2,
}

const defaultSummaryData = { total: 2, active: 2 }

function setupMocks(canEdit = true) {
  mockCan.mockReturnValue(canEdit)
  mockUseQueryClient.mockReturnValue({
    invalidateQueries: mockInvalidateQueries,
  })
  mockUseQuery.mockReset()
  // Return different data based on the query key
  mockUseQuery.mockImplementation((args: { queryKey: unknown }) => {
    const queryKey = args.queryKey as string[]
    if (queryKey[0] === 'refreshTokensSummary') {
      return { data: defaultSummaryData, isLoading: false }
    }
    return { data: defaultTokensData, isLoading: false }
  })
}

describe('useSessionManagementState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useSessionManagementState())
    expect(result.current.keyword).toBe('')
    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageSize).toBe(20)
  })

  it('fetches tokens on mount', () => {
    const { result } = renderHook(() => useSessionManagementState())
    expect(result.current.tokens).toHaveLength(2)
    expect(result.current.totalElements).toBe(2)
  })

  it('fetches summary on mount', () => {
    const { result } = renderHook(() => useSessionManagementState())
    expect(result.current.summary).toEqual(defaultSummaryData)
  })

  it('does not fetch when enabled is false', () => {
    mockUseQuery.mockReset()
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false })
    renderHook(() => useSessionManagementState(false))
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('updates keyword via setKeyword', () => {
    const { result } = renderHook(() => useSessionManagementState())
    act(() => {
      result.current.setKeyword('test')
    })
    expect(result.current.keyword).toBe('test')
  })

  it('updates currentPage via setCurrentPage', () => {
    const { result } = renderHook(() => useSessionManagementState())
    act(() => {
      result.current.setCurrentPage(3)
    })
    expect(result.current.currentPage).toBe(3)
  })

  it('updates pageSize via setPageSize', () => {
    const { result } = renderHook(() => useSessionManagementState())
    act(() => {
      result.current.setPageSize(50)
    })
    expect(result.current.pageSize).toBe(50)
  })

  it('returns canEdit based on permission', () => {
    setupMocks(false)
    const { result } = renderHook(() => useSessionManagementState())
    expect(result.current.canEdit).toBe(false)
    expect(mockCan).toHaveBeenCalledWith('session', 'update')
  })

  it('handleRevokeAll shows warning when no permission', () => {
    setupMocks(false)
    const { result } = renderHook(() => useSessionManagementState())
    act(() => {
      result.current.handleRevokeAll()
    })
    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(mockModalConfirm).not.toHaveBeenCalled()
  })

  it('handleRevokeAll shows confirm dialog when has permission', () => {
    const { result } = renderHook(() => useSessionManagementState())
    act(() => {
      result.current.handleRevokeAll()
    })
    expect(mockModalConfirm).toHaveBeenCalled()
  })

  it('returns columns built from buildSessionTableColumns', () => {
    const { result } = renderHook(() => useSessionManagementState())
    expect(result.current.columns).toBeDefined()
    expect(Array.isArray(result.current.columns)).toBe(true)
  })

  it('returns refreshSessionData function', () => {
    const { result } = renderHook(() => useSessionManagementState())
    expect(typeof result.current.refreshSessionData).toBe('function')
  })

  it('handles empty token list', () => {
    mockUseQuery.mockReset()
    mockUseQuery.mockImplementation((args: { queryKey: unknown }) => {
      const queryKey = args.queryKey as string[]
      if (queryKey[0] === 'refreshTokensSummary') {
        return { data: undefined, isLoading: false }
      }
      return { data: { records: [], totalElements: 0 }, isLoading: false }
    })
    const { result } = renderHook(() => useSessionManagementState())
    expect(result.current.tokens).toEqual([])
    expect(result.current.totalElements).toBe(0)
  })
})
