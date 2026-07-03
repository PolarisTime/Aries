import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUsePageVisibility = vi.fn()
const mockUseSessionManagementState = vi.fn()
const mockSessionCard = vi.fn()

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => mockUsePageVisibility(),
}))

vi.mock('@/views/system/useSessionManagementState', () => ({
  useSessionManagementState: (...args: unknown[]) =>
    mockUseSessionManagementState(...args),
}))

vi.mock('@/views/system/SessionManagementCard', () => ({
  SessionManagementCard: (props: Record<string, unknown>) => {
    mockSessionCard(props)
    return <div data-testid="session-card">SessionCard</div>
  },
}))

import { SessionManagementView } from '@/views/system/SessionManagementView'

describe('SessionManagementView', () => {
  const state = {
    canEdit: true,
    columns: [{ key: 'operation' }],
    currentPage: 2,
    handleRevokeAll: vi.fn(),
    isLoading: false,
    keyword: 'admin',
    pageSize: 50,
    refreshSessionData: vi.fn(),
    setCurrentPage: vi.fn(),
    setKeyword: vi.fn(),
    setPageSize: vi.fn(),
    summary: { onlineUsers: 1, onlineSessions: 2, activeSessions: 3 },
    tokens: [{ id: 'token-1' }],
    totalElements: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePageVisibility.mockReturnValue(true)
    mockUseSessionManagementState.mockReturnValue(state)
  })

  const latestCardProps = () => {
    const props = mockSessionCard.mock.lastCall?.[0]
    if (!props) {
      throw new Error('missing SessionManagementCard props')
    }
    return props as {
      onKeywordChange: (keyword: string) => void
      onSearch: () => void
      onRefresh: () => void
      onRevokeAll: () => void
      onPageChange: (page: number, size: number) => void
    } & typeof state
  }

  it('passes visible active state to session state hook by default', () => {
    render(<SessionManagementView />)

    expect(screen.getByTestId('session-card')).toBeInTheDocument()
    expect(mockUseSessionManagementState).toHaveBeenCalledWith(true)
    expect(latestCardProps()).toMatchObject({
      canEdit: state.canEdit,
      columns: state.columns,
      currentPage: state.currentPage,
      isLoading: state.isLoading,
      keyword: state.keyword,
      pageSize: state.pageSize,
      summary: state.summary,
      tokens: state.tokens,
      totalElements: state.totalElements,
    })
  })

  it('disables session state when the view is inactive', () => {
    render(<SessionManagementView active={false} />)

    expect(mockUseSessionManagementState).toHaveBeenCalledWith(false)
  })

  it('disables session state when the page is hidden', () => {
    mockUsePageVisibility.mockReturnValue(false)

    render(<SessionManagementView />)

    expect(mockUseSessionManagementState).toHaveBeenCalledWith(false)
  })

  it('wires card callbacks to state handlers', () => {
    render(<SessionManagementView />)

    latestCardProps().onKeywordChange('alice')
    latestCardProps().onSearch()
    latestCardProps().onRefresh()
    latestCardProps().onRevokeAll()
    latestCardProps().onPageChange(3, 100)

    expect(state.setKeyword).toHaveBeenCalledWith('alice')
    expect(state.setCurrentPage).toHaveBeenCalledWith(1)
    expect(state.refreshSessionData).toHaveBeenCalledTimes(2)
    expect(state.handleRevokeAll).toHaveBeenCalledTimes(1)
    expect(state.setCurrentPage).toHaveBeenCalledWith(3)
    expect(state.setPageSize).toHaveBeenCalledWith(100)
  })
})
