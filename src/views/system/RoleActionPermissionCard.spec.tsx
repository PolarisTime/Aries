import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { RoleActionPermissionCard } from '@/views/system/RoleActionPermissionCard'

describe('RoleActionPermissionCard', () => {
  const defaultProps = {
    selectedRoleInfo: undefined,
    viewMode: 'list' as const,
    menuTree: [],
    matrixColumns: [],
    matrixData: [],
    permissionActions: { editable: true, saving: false },
    onSelectAll: vi.fn(),
    onDeselectAll: vi.fn(),
    onViewModeChange: vi.fn(),
    onSave: vi.fn(),
    isMenuChecked: vi.fn(() => false),
    isMenuPartiallyChecked: vi.fn(() => false),
    isActionSelected: vi.fn(() => false),
    onToggleAllMenuActions: vi.fn(),
    onToggleAction: vi.fn(),
    actionLabels: {},
  }

  it('renders without crashing', () => {
    expect(RoleActionPermissionCard).toBeDefined()
    expect(typeof RoleActionPermissionCard).toBe('function')
  })

  it('renders empty state when no role selected', () => {
    render(<RoleActionPermissionCard {...defaultProps} />)
    expect(screen.getByText('system.rolePermission.selectRoleHint')).toBeInTheDocument()
  })

  it('renders role info when role is selected', () => {
    render(
      <RoleActionPermissionCard
        {...defaultProps}
        selectedRoleInfo={{ id: '1', roleName: 'Admin', roleCode: 'admin' } as never}
      />,
    )
    expect(screen.getByText(/Admin/)).toBeInTheDocument()
  })

  it('renders select all button when editable', () => {
    render(
      <RoleActionPermissionCard
        {...defaultProps}
        selectedRoleInfo={{ id: '1', roleName: 'Admin' } as never}
        permissionActions={{ editable: true, saving: false }}
      />,
    )
    expect(screen.getByText('system.rolePermission.selectAll')).toBeInTheDocument()
  })

  it('renders deselect all button when editable', () => {
    render(
      <RoleActionPermissionCard
        {...defaultProps}
        selectedRoleInfo={{ id: '1', roleName: 'Admin' } as never}
        permissionActions={{ editable: true, saving: false }}
      />,
    )
    expect(screen.getByText('system.rolePermission.deselectAll')).toBeInTheDocument()
  })

  it('renders save button when editable', () => {
    render(
      <RoleActionPermissionCard
        {...defaultProps}
        selectedRoleInfo={{ id: '1', roleName: 'Admin' } as never}
        permissionActions={{ editable: true, saving: false }}
      />,
    )
    expect(screen.getByText('system.rolePermission.savePerm')).toBeInTheDocument()
  })

  it('renders list view mode toggle', () => {
    render(
      <RoleActionPermissionCard
        {...defaultProps}
        selectedRoleInfo={{ id: '1', roleName: 'Admin' } as never}
      />,
    )
    expect(screen.getByText('system.rolePermission.listView')).toBeInTheDocument()
    expect(screen.getByText('system.rolePermission.matrixView')).toBeInTheDocument()
  })

  it('renders permission alert', () => {
    render(
      <RoleActionPermissionCard
        {...defaultProps}
        selectedRoleInfo={{ id: '1', roleName: 'Admin' } as never}
      />,
    )
    expect(screen.getByText('system.rolePermission.attachmentPermTitle')).toBeInTheDocument()
  })

  it('renders menu tree items', () => {
    render(
      <RoleActionPermissionCard
        {...defaultProps}
        selectedRoleInfo={{ id: '1', roleName: 'Admin' } as never}
        menuTree={[
          {
            menuCode: 'system',
            menuName: '系统管理',
            resourceCode: '',
            actions: [],
            children: [
              {
                menuCode: 'user',
                menuName: '用户管理',
                resourceCode: 'user-account',
                actions: ['read', 'create'],
                children: [],
              },
            ],
          },
        ]}
        actionLabels={{ read: '查看', create: '新建' }}
      />,
    )
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('查看')).toBeInTheDocument()
    expect(screen.getByText('新建')).toBeInTheDocument()
  })
})
