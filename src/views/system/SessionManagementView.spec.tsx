import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseSessionManagementState = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

vi.mock('@/views/system/useSessionManagementState', () => ({
  useSessionManagementState: (...args: unknown[]) => mockUseSessionManagementState(...args),
}))

vi.mock('@/views/system/SessionManagementCard', () => ({
  SessionManagementCard: () => <div data-testid="session-card">SessionCard</div>,
}))

import { SessionManagementView } from '@/views/system/SessionManagementView'

describe('SessionManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSessionManagementState.mockReturnValue({
      canEdit: true,
      columns: [],
      currentPage: 1,
      handleRevokeAll: vi.fn(),
      isLoading: false,
      keyword: '',
      pageSize: 20,
      refreshSessionData: vi.fn(),
      setCurrentPage: vi.fn(),
      setKeyword: vi.fn(),
      setPageSize: vi.fn(),
      summary: { onlineUsers: 0, onlineSessions: 0, activeSessions: 0 },
      tokens: [],
      totalElements: 0,
    })
  })

  it('renders without crashing', () => {
    expect(SessionManagementView).toBeDefined()
    expect(typeof SessionManagementView).toBe('function')
  })

  it('renders session management card', () => {
    render(<SessionManagementView />)
    expect(screen.getByTestId('session-card')).toBeInTheDocument()
  })
})
