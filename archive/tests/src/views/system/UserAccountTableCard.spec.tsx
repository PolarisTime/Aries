import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
      {
        id: '1',
        loginName: 'admin',
        userName: 'Admin',
        departmentName: '平台部',
        mobile: '13800000000',
        status: '正常',
        totpEnabled: true,
        roleNames: ['管理员'],
        dataScope: '全部数据',
        lastLoginDate: '2026-07-03 12:00:00',
      },
      {
        id: '2',
        loginName: 'user1',
        userName: 'User 1',
        status: '正常',
        totpEnabled: false,
        roleNames: ['普通用户'],
        dataScope: '本人',
      },
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(UserAccountTableCard).toBeDefined()
    expect(typeof UserAccountTableCard).toBe('function')
  })

  it('renders the card title', () => {
    render(<UserAccountTableCard {...defaultProps} />)
    expect(
      screen.getByText('system.userAccountTable.title'),
    ).toBeInTheDocument()
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
    expect(
      screen.getAllByText('system.userAccountTable.view').length,
    ).toBeGreaterThan(0)
  })

  it('renders edit buttons when canEdit', () => {
    render(<UserAccountTableCard {...defaultProps} canEdit={true} />)
    expect(
      screen.getAllByText('system.userAccountTable.edit').length,
    ).toBeGreaterThan(0)
  })

  it('renders 2FA buttons when canEdit', () => {
    render(<UserAccountTableCard {...defaultProps} canEdit={true} />)
    expect(screen.getAllByText('2FA').length).toBeGreaterThan(0)
  })

  it('renders delete buttons when canDelete', () => {
    render(<UserAccountTableCard {...defaultProps} canDelete={true} />)
    expect(
      screen.getAllByText('system.userAccountTable.delete').length,
    ).toBeGreaterThan(0)
  })

  it('dispatches row actions with the selected user record', () => {
    render(<UserAccountTableCard {...defaultProps} />)

    fireEvent.click(screen.getAllByText('system.userAccountTable.view')[0])
    fireEvent.click(screen.getAllByText('system.userAccountTable.edit')[0])
    fireEvent.click(screen.getAllByText('2FA')[0])
    fireEvent.click(screen.getAllByText('system.userAccountTable.delete')[0])

    expect(defaultProps.onView).toHaveBeenCalledWith(defaultProps.users[0])
    expect(defaultProps.onEdit).toHaveBeenCalledWith(defaultProps.users[0])
    expect(defaultProps.onManage2fa).toHaveBeenCalledWith(defaultProps.users[0])
    expect(defaultProps.onDelete).toHaveBeenCalledWith(defaultProps.users[1])
  })

  it('hides privileged actions when permissions are missing', () => {
    render(
      <UserAccountTableCard
        {...defaultProps}
        canCreate={false}
        canDelete={false}
        canEdit={false}
      />,
    )

    expect(
      screen.queryByText('system.userAccountTable.edit'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('2FA')).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.userAccountTable.delete'),
    ).not.toBeInTheDocument()
  })

  it('renders fallback values for optional table cells', () => {
    render(
      <UserAccountTableCard
        {...defaultProps}
        users={[
          {
            id: '3',
            loginName: 'empty-user',
            userName: 'Empty User',
            departmentName: '',
            mobile: '',
            status: '禁用',
            totpEnabled: false,
            roleNames: undefined as unknown as string[],
            dataScope: '',
          },
        ]}
      />,
    )

    expect(screen.getByText('empty-user')).toBeInTheDocument()
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(4)
    expect(
      screen.getByText('system.userAccountTable.totpDisabled'),
    ).toBeInTheDocument()
    expect(screen.getByText('禁用')).toBeInTheDocument()
  })
})
