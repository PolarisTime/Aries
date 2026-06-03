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

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [
    { label: '正常', value: '正常' },
    { label: '禁用', value: '禁用' },
  ],
}))

vi.mock('@/hooks/usePaginationConfig', () => ({
  createPaginationConfig: (opts: Record<string, unknown>) => opts,
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: (v: unknown, fallback: string) => (v ? String(v) : fallback),
}))

import { UserAccountTableCard } from '@/views/system/UserAccountTableCard'

describe('UserAccountTableCard', () => {
  const defaultProps = {
    keyword: '',
    statusFilter: undefined,
    currentPage: 1,
    pageSize: 20,
    totalElements: 2,
    users: [
      { id: '1', loginName: 'admin', userName: 'Admin', status: '正常', totpEnabled: true, roleNames: ['管理员'], dataScope: '全部数据' },
      { id: '2', loginName: 'user1', userName: 'User 1', status: '正常', totpEnabled: false, roleNames: ['普通用户'], dataScope: '本人' },
    ],
    loading: false,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    getStatusColor: vi.fn(() => 'green'),
    getTotpColor: vi.fn(() => 'processing'),
    onKeywordChange: vi.fn(),
    onSearch: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onRefresh: vi.fn(),
    onCreate: vi.fn(),
    onView: vi.fn(),
    onEdit: vi.fn(),
    onManage2fa: vi.fn(),
    onDelete: vi.fn(),
    onPageChange: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(UserAccountTableCard).toBeDefined()
    expect(typeof UserAccountTableCard).toBe('function')
  })

  it('renders the card title', () => {
    render(<UserAccountTableCard {...defaultProps} />)
    expect(screen.getByText('system.userAccountTable.title')).toBeInTheDocument()
  })

  it('renders user login names', () => {
    render(<UserAccountTableCard {...defaultProps} />)
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('user1')).toBeInTheDocument()
  })

  it('renders user names', () => {
    render(<UserAccountTableCard {...defaultProps} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('User 1')).toBeInTheDocument()
  })

  it('renders table', () => {
    const { container } = render(<UserAccountTableCard {...defaultProps} />)
    expect(container.querySelector('.ant-table')).toBeInTheDocument()
  })

  it('renders toolbar', () => {
    render(<UserAccountTableCard {...defaultProps} />)
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })

  it('renders view buttons', () => {
    render(<UserAccountTableCard {...defaultProps} />)
    expect(screen.getAllByText('system.userAccountTable.view').length).toBeGreaterThan(0)
  })

  it('renders edit buttons when canEdit', () => {
    render(<UserAccountTableCard {...defaultProps} canEdit={true} />)
    expect(screen.getAllByText('system.userAccountTable.edit').length).toBeGreaterThan(0)
  })

  it('renders 2FA buttons when canEdit', () => {
    render(<UserAccountTableCard {...defaultProps} canEdit={true} />)
    expect(screen.getAllByText('2FA').length).toBeGreaterThan(0)
  })

  it('renders delete buttons when canDelete', () => {
    render(<UserAccountTableCard {...defaultProps} canDelete={true} />)
    expect(screen.getAllByText('system.userAccountTable.delete').length).toBeGreaterThan(0)
  })
})
