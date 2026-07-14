import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusValues: ['正常', '禁用'],
}))

import { RoleActionRoleListCard } from '@/views/system/RoleActionRoleListCard'

describe('RoleActionRoleListCard', () => {
  const mockRoles = [
    {
      id: '1',
      roleName: 'Admin',
      roleCode: 'admin',
      roleType: '系统',
      status: '正常',
      userCount: 5,
    },
    {
      id: '2',
      roleName: 'User',
      roleCode: 'user',
      roleType: '自定义',
      status: '正常',
      userCount: 10,
    },
  ]

  const defaultProps = {
    roles: mockRoles,
    selectedRoleId: null,
    canCreateRole: true,
    onCreate: vi.fn(),
    onSelectRole: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(RoleActionRoleListCard).toBeDefined()
    expect(typeof RoleActionRoleListCard).toBe('function')
  })

  it('renders the card title', () => {
    render(<RoleActionRoleListCard {...defaultProps} />)
    expect(screen.getByText('system.roleList.title')).toBeInTheDocument()
  })

  it('renders create button when canCreateRole is true', () => {
    render(<RoleActionRoleListCard {...defaultProps} canCreateRole={true} />)
    expect(screen.getByText('system.roleList.create')).toBeInTheDocument()
  })

  it('does not render create button when canCreateRole is false', () => {
    render(<RoleActionRoleListCard {...defaultProps} canCreateRole={false} />)
    expect(screen.queryByText('system.roleList.create')).not.toBeInTheDocument()
  })

  it('renders role names', () => {
    render(<RoleActionRoleListCard {...defaultProps} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('renders disabled role status', () => {
    render(
      <RoleActionRoleListCard
        {...defaultProps}
        roles={[
          {
            ...mockRoles[0],
            status: '禁用',
          },
        ]}
      />,
    )
    expect(screen.getByText('禁用')).toBeInTheDocument()
  })

  it('renders role codes', () => {
    render(<RoleActionRoleListCard {...defaultProps} />)
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('user')).toBeInTheDocument()
  })

  it('calls onCreate when create button clicked', () => {
    const onCreate = vi.fn()
    render(<RoleActionRoleListCard {...defaultProps} onCreate={onCreate} />)
    fireEvent.click(screen.getByText('system.roleList.create'))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('calls onSelectRole when role clicked', () => {
    const onSelectRole = vi.fn()
    render(
      <RoleActionRoleListCard {...defaultProps} onSelectRole={onSelectRole} />,
    )
    fireEvent.click(screen.getByText('Admin'))
    expect(onSelectRole).toHaveBeenCalledWith(mockRoles[0])
  })

  it('renders empty state when no roles', () => {
    render(<RoleActionRoleListCard {...defaultProps} roles={[]} />)
    expect(screen.getByText('system.roleList.noRoles')).toBeInTheDocument()
  })

  it('highlights selected role', () => {
    render(<RoleActionRoleListCard {...defaultProps} selectedRoleId="1" />)
    const adminButton = screen.getByText('Admin').closest('button')
    expect(adminButton?.className).toContain('highlight')
  })
})
