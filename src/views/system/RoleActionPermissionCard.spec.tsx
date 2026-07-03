import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuNode, RoleRecord } from '@/api/role-actions'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { RoleActionPermissionCard } from '@/views/system/RoleActionPermissionCard'

describe('RoleActionPermissionCard', () => {
  type Props = ComponentProps<typeof RoleActionPermissionCard>

  const createRole = (overrides: Partial<RoleRecord> = {}): RoleRecord => ({
    id: '1',
    roleCode: 'admin',
    roleName: 'Admin',
    roleType: 'SYSTEM',
    dataScope: 'ALL',
    status: 'ENABLED',
    userCount: 0,
    remark: null,
    ...overrides,
  })

  const createMenu = (overrides: Partial<MenuNode>): MenuNode => ({
    menuCode: 'menu',
    menuName: '菜单',
    parentCode: null,
    routePath: null,
    icon: null,
    sortOrder: 0,
    menuType: 'MENU',
    resourceCode: null,
    actions: [],
    children: [],
    ...overrides,
  })

  const createProps = (overrides: Partial<Props> = {}): Props => ({
    selectedRoleInfo: undefined,
    viewMode: 'list',
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
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(RoleActionPermissionCard).toBeDefined()
    expect(typeof RoleActionPermissionCard).toBe('function')
  })

  it('renders empty state when no role selected', () => {
    render(<RoleActionPermissionCard {...createProps()} />)
    expect(
      screen.getByText('system.rolePermission.selectRoleHint'),
    ).toBeInTheDocument()
  })

  it('renders role info when role is selected', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
        })}
      />,
    )
    expect(screen.getByText(/Admin/)).toBeInTheDocument()
  })

  it('renders select all button when editable', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
          permissionActions: { editable: true, saving: false },
        })}
      />,
    )
    expect(
      screen.getByText('system.rolePermission.selectAll'),
    ).toBeInTheDocument()
  })

  it('renders deselect all button when editable', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
          permissionActions: { editable: true, saving: false },
        })}
      />,
    )
    expect(
      screen.getByText('system.rolePermission.deselectAll'),
    ).toBeInTheDocument()
  })

  it('renders save button when editable', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
          permissionActions: { editable: true, saving: false },
        })}
      />,
    )
    expect(
      screen.getByText('system.rolePermission.savePerm'),
    ).toBeInTheDocument()
  })

  it('renders list view mode toggle', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
        })}
      />,
    )
    expect(
      screen.getByText('system.rolePermission.listView'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.rolePermission.matrixView'),
    ).toBeInTheDocument()
  })

  it('renders permission alert', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
        })}
      />,
    )
    expect(
      screen.getByText('system.rolePermission.attachmentPermTitle'),
    ).toBeInTheDocument()
  })

  it('renders menu tree items', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
          menuTree: [
            createMenu({
              menuCode: 'system',
              menuName: '系统管理',
              resourceCode: '',
              children: [
                createMenu({
                  menuCode: 'user',
                  menuName: '用户管理',
                  resourceCode: 'user-account',
                  actions: ['read', 'create'],
                }),
              ],
            }),
          ],
          actionLabels: { read: '查看', create: '新建' },
        })}
      />,
    )
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('查看')).toBeInTheDocument()
    expect(screen.getByText('新建')).toBeInTheDocument()
  })

  it('invokes toolbar callbacks and switches view mode', () => {
    const props = createProps({
      selectedRoleInfo: createRole(),
      permissionActions: { editable: true, saving: false },
    })

    render(<RoleActionPermissionCard {...props} />)

    fireEvent.click(screen.getByText('system.rolePermission.selectAll'))
    fireEvent.click(screen.getByText('system.rolePermission.deselectAll'))
    fireEvent.click(screen.getByText('system.rolePermission.savePerm'))
    fireEvent.click(screen.getByText('system.rolePermission.matrixView'))

    expect(props.onSelectAll).toHaveBeenCalledTimes(1)
    expect(props.onDeselectAll).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onViewModeChange).toHaveBeenCalledWith('matrix')
  })

  it('renders read-only list permissions without edit controls', () => {
    const readonlyMenu = createMenu({
      menuCode: 'reports',
      menuName: '报表中心',
      actions: ['read', 'export'],
    })

    const props = createProps({
      selectedRoleInfo: createRole(),
      permissionActions: { editable: false, saving: false },
      menuTree: [readonlyMenu],
      isMenuChecked: vi.fn(() => true),
      isMenuPartiallyChecked: vi.fn(() => true),
      isActionSelected: vi.fn(
        (menuCode, action) => menuCode === 'reports' && action === 'read',
      ),
      actionLabels: { read: '查看' },
    })

    render(<RoleActionPermissionCard {...props} />)

    expect(
      screen.queryByText('system.rolePermission.selectAll'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.rolePermission.deselectAll'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.rolePermission.savePerm'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('查看')).toBeInTheDocument()
    expect(screen.getByText('export')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '报表中心' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: '查看' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'export' })).toBeDisabled()
  })

  it('invokes list permission checkbox callbacks', () => {
    const userMenu = createMenu({
      menuCode: 'user',
      menuName: '用户管理',
      resourceCode: 'user-account',
      actions: ['read'],
    })
    const emptyMenu = createMenu({
      menuCode: 'audit',
      menuName: '审计日志',
      actions: [],
    })
    const reportsMenu = createMenu({
      menuCode: 'reports',
      menuName: '报表中心',
      actions: ['export'],
    })
    const groupMenu = createMenu({
      menuCode: 'system',
      menuName: '系统管理',
      children: [userMenu, emptyMenu],
    })
    const props = createProps({
      selectedRoleInfo: createRole(),
      menuTree: [groupMenu, reportsMenu],
      isMenuChecked: vi.fn((menuCode) => menuCode === 'user'),
      isMenuPartiallyChecked: vi.fn((menu) => menu.menuCode === 'reports'),
      isActionSelected: vi.fn(
        (menuCode, action) => menuCode === 'user' && action === 'read',
      ),
      actionLabels: { read: '查看' },
    })

    render(<RoleActionPermissionCard {...props} />)

    expect(screen.getByText('系统管理')).toBeInTheDocument()
    expect(screen.queryByText('审计日志')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: '用户管理' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '查看' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '报表中心' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'export' }))

    expect(props.onToggleAllMenuActions).toHaveBeenNthCalledWith(1, userMenu)
    expect(props.onToggleAllMenuActions).toHaveBeenNthCalledWith(2, reportsMenu)
    expect(props.onToggleAction).toHaveBeenNthCalledWith(1, 'user', 'read')
    expect(props.onToggleAction).toHaveBeenNthCalledWith(2, 'reports', 'export')
  })

  it('renders matrix view table', () => {
    render(
      <RoleActionPermissionCard
        {...createProps({
          selectedRoleInfo: createRole(),
          viewMode: 'matrix',
          matrixColumns: [
            { dataIndex: 'menuName', title: '菜单' },
            { dataIndex: 'read', title: '查看' },
          ],
          matrixData: [{ key: 'user', menuName: '用户管理', read: '已授权' }],
        })}
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: '菜单' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: '查看' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '用户管理' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '已授权' })).toBeInTheDocument()
  })
})
