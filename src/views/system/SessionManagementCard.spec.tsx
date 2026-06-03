import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/SystemTableToolbar', () => ({
  SystemTableToolbar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toolbar">{children}</div>
  ),
}))

vi.mock('@/hooks/usePaginationConfig', () => ({
  createPaginationConfig: (opts: Record<string, unknown>) => opts,
}))

import { SessionManagementCard } from '@/views/system/SessionManagementCard'

describe('SessionManagementCard', () => {
  const defaultProps = {
    canEdit: true,
    columns: [
      { title: 'Token', dataIndex: 'tokenId', width: 200 },
    ],
    currentPage: 1,
    isLoading: false,
    keyword: '',
    pageSize: 20,
    summary: { onlineUsers: 5, onlineSessions: 10, activeSessions: 8 },
    tokens: [
      { id: '1', tokenId: 'token-1', loginName: 'admin', userName: 'Admin', status: '有效' },
    ],
    totalElements: 1,
    onKeywordChange: vi.fn(),
    onSearch: vi.fn(),
    onRefresh: vi.fn(),
    onRevokeAll: vi.fn(),
    onPageChange: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(SessionManagementCard).toBeDefined()
    expect(typeof SessionManagementCard).toBe('function')
  })

  it('renders the card title', () => {
    render(<SessionManagementCard {...defaultProps} />)
    expect(screen.getByText('system.session.title')).toBeInTheDocument()
  })

  it('renders statistics', () => {
    render(<SessionManagementCard {...defaultProps} />)
    expect(screen.getByText('system.session.onlineUsers')).toBeInTheDocument()
    expect(screen.getByText('system.session.onlineDevices')).toBeInTheDocument()
    expect(screen.getByText('system.session.activeSessions')).toBeInTheDocument()
  })

  it('displays summary values', () => {
    render(<SessionManagementCard {...defaultProps} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('renders table', () => {
    const { container } = render(<SessionManagementCard {...defaultProps} />)
    expect(container.querySelector('.ant-table')).toBeInTheDocument()
  })

  it('renders toolbar', () => {
    render(<SessionManagementCard {...defaultProps} />)
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })

  it('renders revoke all button when canEdit', () => {
    render(<SessionManagementCard {...defaultProps} canEdit={true} />)
    expect(screen.getByText('system.session.revokeAll')).toBeInTheDocument()
  })

  it('does not render revoke all button when not canEdit', () => {
    render(<SessionManagementCard {...defaultProps} canEdit={false} />)
    expect(screen.queryByText('system.session.revokeAll')).not.toBeInTheDocument()
  })
})
