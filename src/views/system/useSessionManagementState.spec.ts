import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RefreshTokenRecord } from '@/api/session-management'

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
const mockBuildSessionTableColumns = vi.fn()

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
    refreshTokensBase: ['refresh-tokens'],
    refreshTokensSummary: ['refresh-tokens-summary'],
    refreshTokens: (page: number, size: number, keyword: string) => [
      'refresh-tokens',
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
  buildSessionTableColumns: (...args: unknown[]) =>
    mockBuildSessionTableColumns(...args),
}))

import { useSessionManagementState } from '@/views/system/useSessionManagementState'

const tokenRecord: RefreshTokenRecord = {
  id: 'token-1',
  userId: 'user-1',
  loginName: 'admin',
  userName: 'Admin',
  tokenId: 'refresh-token',
  loginIp: '127.0.0.1',
  deviceInfo: 'Chrome',
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-01-02T00:00:00Z',
  revokedAt: null,
  status: 'valid',
  lastActiveAt: '2026-01-01T01:00:00Z',
  online: true,
}

const defaultTokensData = {
  records: [tokenRecord],
  totalElements: 1,
}

const defaultSummaryData = {
  onlineUsers: 1,
  onlineSessions: 1,
  activeSessions: 1,
}

type QueryConfig = {
  queryKey: readonly unknown[]
  queryFn: () => unknown
  enabled: boolean
}

type ConfirmConfig = {
  title: string
  content: string
  okText: string
  cancelText: string
  okButtonProps: { danger: boolean }
  onOk: () => Promise<void>
}

type ColumnsConfig = {
  canEdit: boolean
  onRevoke: (record: RefreshTokenRecord) => void
  t: (key: string) => string
}

function setupMocks(canEdit = true) {
  mockCan.mockReturnValue(canEdit)
  mockUseQueryClient.mockReturnValue({
    invalidateQueries: mockInvalidateQueries,
  })
  mockBuildSessionTableColumns.mockReturnValue([{ key: 'action' }])
  mockUseQuery.mockImplementation((config: QueryConfig) => {
    if (config.queryKey[0] === 'refresh-tokens-summary') {
      return { data: defaultSummaryData, isLoading: false }
    }
    return { data: defaultTokensData, isLoading: true }
  })
}

function latestQueryConfig(queryName: string) {
  const config = mockUseQuery.mock.calls
    .map(([call]) => call as QueryConfig)
    .findLast((call) => call.queryKey[0] === queryName)
  if (!config) {
    throw new Error(`missing query config: ${queryName}`)
  }
  return config
}

function latestConfirmConfig() {
  const config = mockModalConfirm.mock.lastCall?.[0] as
    | ConfirmConfig
    | undefined
  if (!config) {
    throw new Error('missing confirm config')
  }
  return config
}

function latestColumnsConfig() {
  const config = mockBuildSessionTableColumns.mock.lastCall?.[0] as
    | ColumnsConfig
    | undefined
  if (!config) {
    throw new Error('missing columns config')
  }
  return config
}

describe('useSessionManagementState', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    setupMocks()
  })

  it('returns query data and initial local state', () => {
    const { result } = renderHook(() => useSessionManagementState())

    expect(result.current).toMatchObject({
      canEdit: true,
      columns: [{ key: 'action' }],
      currentPage: 1,
      isLoading: true,
      keyword: '',
      pageSize: 20,
      summary: defaultSummaryData,
      tokens: [tokenRecord],
      totalElements: 1,
    })
    expect(mockCan).toHaveBeenCalledWith('session', 'update')
    expect(mockBuildSessionTableColumns).toHaveBeenCalledWith({
      canEdit: true,
      onRevoke: expect.any(Function),
      t: expect.any(Function),
    })
  })

  it('passes enabled flag to token and summary queries', () => {
    renderHook(() => useSessionManagementState(false))

    expect(latestQueryConfig('refresh-tokens').enabled).toBe(false)
    expect(latestQueryConfig('refresh-tokens-summary').enabled).toBe(false)
  })

  it('query functions call APIs with default and trimmed params', async () => {
    const { result } = renderHook(() => useSessionManagementState())

    await latestQueryConfig('refresh-tokens').queryFn()
    await latestQueryConfig('refresh-tokens-summary').queryFn()

    expect(mockListRefreshTokens).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      keyword: undefined,
    })
    expect(mockGetRefreshTokenSummary).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.setCurrentPage(3)
      result.current.setPageSize(50)
      result.current.setKeyword('  alice  ')
    })
    await latestQueryConfig('refresh-tokens').queryFn()

    expect(mockListRefreshTokens).toHaveBeenLastCalledWith({
      page: 2,
      size: 50,
      keyword: 'alice',
    })
  })

  it('normalizes missing token data to empty values', () => {
    mockUseQuery.mockImplementation((config: QueryConfig) => {
      if (config.queryKey[0] === 'refresh-tokens-summary') {
        return { data: undefined, isLoading: false }
      }
      return { data: undefined, isLoading: false }
    })

    const { result } = renderHook(() => useSessionManagementState())

    expect(result.current.tokens).toEqual([])
    expect(result.current.totalElements).toBe(0)
    expect(result.current.summary).toBeUndefined()
  })

  it('normalizes falsy token records and total values', () => {
    mockUseQuery.mockImplementation((config: QueryConfig) => {
      if (config.queryKey[0] === 'refresh-tokens-summary') {
        return { data: defaultSummaryData, isLoading: false }
      }
      return {
        data: { records: undefined, totalElements: Number.NaN },
        isLoading: false,
      }
    })

    const { result } = renderHook(() => useSessionManagementState())

    expect(result.current.tokens).toEqual([])
    expect(result.current.totalElements).toBe(0)
  })

  it('refreshes session and summary queries manually', () => {
    const { result } = renderHook(() => useSessionManagementState())

    act(() => {
      result.current.refreshSessionData()
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['refresh-tokens'],
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['refresh-tokens-summary'],
    })
  })

  it('refreshes while enabled and clears the interval on unmount', () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useSessionManagementState(true))

    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['refresh-tokens'],
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['refresh-tokens-summary'],
    })

    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('does not start an interval while disabled', () => {
    vi.useFakeTimers()
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

    renderHook(() => useSessionManagementState(false))

    expect(setIntervalSpy).not.toHaveBeenCalled()
  })

  it('warns instead of revoking one session when permission is missing', () => {
    setupMocks(false)
    renderHook(() => useSessionManagementState())

    act(() => {
      latestColumnsConfig().onRevoke(tokenRecord)
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(mockModalConfirm).not.toHaveBeenCalled()
  })

  it('revokes one session after confirmation', async () => {
    renderHook(() => useSessionManagementState())

    act(() => {
      latestColumnsConfig().onRevoke(tokenRecord)
    })

    expect(latestConfirmConfig()).toMatchObject({
      title: 'system.session.disable',
      content: 'system.session.disableConfirm',
      okText: 'common.confirm',
      cancelText: 'common.cancel',
      okButtonProps: { danger: true },
    })

    await act(async () => {
      await latestConfirmConfig().onOk()
    })

    expect(mockRevokeRefreshToken).toHaveBeenCalledWith('token-1')
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'system.session.disabledSuccess',
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['refresh-tokens'],
    })
  })

  it('shows request error when revoking one session fails', async () => {
    const error = new Error('disable failed')
    mockRevokeRefreshToken.mockRejectedValueOnce(error)
    renderHook(() => useSessionManagementState())

    act(() => {
      latestColumnsConfig().onRevoke(tokenRecord)
    })
    await act(async () => {
      await latestConfirmConfig().onOk()
    })

    expect(mockShowError).toHaveBeenCalledWith(
      error,
      'api.disableSessionFailed',
    )
  })

  it('warns instead of revoking all sessions when permission is missing', () => {
    setupMocks(false)
    const { result } = renderHook(() => useSessionManagementState())

    act(() => {
      result.current.handleRevokeAll()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(mockModalConfirm).not.toHaveBeenCalled()
  })

  it('revokes all sessions and uses response message when present', async () => {
    mockRevokeAllRefreshTokens.mockResolvedValueOnce({ message: 'done' })
    const { result } = renderHook(() => useSessionManagementState())

    act(() => {
      result.current.handleRevokeAll()
    })

    expect(latestConfirmConfig()).toMatchObject({
      title: 'system.session.revokeAll',
      content: 'system.session.revokeAllConfirm',
      okText: 'common.confirm',
      cancelText: 'common.cancel',
      okButtonProps: { danger: true },
    })

    await act(async () => {
      await latestConfirmConfig().onOk()
    })

    expect(mockRevokeAllRefreshTokens).toHaveBeenCalledTimes(1)
    expect(mockMessageSuccess).toHaveBeenCalledWith('done')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['refresh-tokens-summary'],
    })
  })

  it('revokes all sessions and falls back to translated success message', async () => {
    mockRevokeAllRefreshTokens.mockResolvedValueOnce({})
    const { result } = renderHook(() => useSessionManagementState())

    act(() => {
      result.current.handleRevokeAll()
    })
    await act(async () => {
      await latestConfirmConfig().onOk()
    })

    expect(mockMessageSuccess).toHaveBeenCalledWith('system.session.revoked')
  })

  it('shows request error when revoking all sessions fails', async () => {
    const error = new Error('clear failed')
    mockRevokeAllRefreshTokens.mockRejectedValueOnce(error)
    const { result } = renderHook(() => useSessionManagementState())

    act(() => {
      result.current.handleRevokeAll()
    })
    await act(async () => {
      await latestConfirmConfig().onOk()
    })

    expect(mockShowError).toHaveBeenCalledWith(
      error,
      'api.clearAllSessionsFailed',
    )
  })
})
