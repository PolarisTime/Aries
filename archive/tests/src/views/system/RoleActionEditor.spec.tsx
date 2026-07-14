import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const role = {
    id: '1',
    roleName: 'Admin',
    roleCode: 'admin',
    roleType: '系统',
    status: '正常',
    userCount: 5,
  }

  return {
    role,
    mockCan: vi.fn(),
    mockUsePageVisibility: vi.fn(),
    mockUseRoleSettingsList: vi.fn(),
    mockUseRoleActionPermissions: vi.fn(),
    mockUseRoleEditor: vi.fn(),
    mockSetViewMode: vi.fn(),
    mockSelectRole: vi.fn(),
    mockSelectAll: vi.fn(),
    mockDeselectAll: vi.fn(),
    mockSaveRoleActions: vi.fn(),
    mockIsMenuChecked: vi.fn(),
    mockIsMenuPartiallyChecked: vi.fn(),
    mockIsActionSelected: vi.fn(),
    mockToggleAllMenuActions: vi.fn(),
    mockToggleAction: vi.fn(),
    mockOpenRoleForm: vi.fn(),
    mockHandleSaveRole: vi.fn(),
    mockCloseRoleModal: vi.fn(),
  }
})

vi.mock('antd', () => ({
  Row: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div className={className} data-testid="antd-row">
      {children}
    </div>
  ),
  Col: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div className={className} data-testid="antd-col">
      {children}
    </div>
  ),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mocks.mockCan }),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => mocks.mockUsePageVisibility(),
}))

vi.mock('@/views/system/useRoleSettingsList', () => ({
  useRoleSettingsList: (...args: unknown[]) =>
    mocks.mockUseRoleSettingsList(...args),
}))

vi.mock('@/views/system/useRoleActionPermissions', () => ({
  useRoleActionPermissions: (...args: unknown[]) =>
    mocks.mockUseRoleActionPermissions(...args),
}))

vi.mock('@/views/system/useRoleEditor', () => ({
  useRoleEditor: (...args: unknown[]) => mocks.mockUseRoleEditor(...args),
}))

vi.mock('@/views/system/RoleActionRoleListCard', () => ({
  RoleActionRoleListCard: ({
    roles,
    selectedRoleId,
    canCreateRole,
    onCreate,
    onSelectRole,
  }: {
    roles: unknown[]
    selectedRoleId: string | null
    canCreateRole: boolean
    onCreate: () => void
    onSelectRole: (role: unknown) => void
  }) => (
    <section data-testid="role-list">
      <div data-testid="role-count">{roles.length}</div>
      <div data-testid="selected-role-id">{selectedRoleId ?? 'none'}</div>
      <div data-testid="can-create-role">{String(canCreateRole)}</div>
      <button type="button" onClick={onCreate}>
        create role
      </button>
      <button type="button" onClick={() => onSelectRole(mocks.role)}>
        select role
      </button>
    </section>
  ),
}))

vi.mock('@/views/system/RoleActionPermissionCard', () => ({
  RoleActionPermissionCard: ({
    selectedRoleInfo,
    viewMode,
    menuTree,
    matrixColumns,
    matrixData,
    permissionActions,
    onSelectAll,
    onDeselectAll,
    onViewModeChange,
    onSave,
    isMenuChecked,
    isMenuPartiallyChecked,
    isActionSelected,
    onToggleAllMenuActions,
    onToggleAction,
    actionLabels,
  }: {
    selectedRoleInfo: unknown
    viewMode: string
    menuTree: unknown[]
    matrixColumns: unknown[]
    matrixData: unknown[]
    permissionActions: { editable: boolean; saving: boolean }
    onSelectAll: () => void
    onDeselectAll: () => void
    onViewModeChange: (mode: string) => void
    onSave: () => void
    isMenuChecked: (menuId: string) => boolean
    isMenuPartiallyChecked: (menuId: string) => boolean
    isActionSelected: (menuId: string, action: string) => boolean
    onToggleAllMenuActions: (menuId: string, checked: boolean) => void
    onToggleAction: (menuId: string, action: string, checked: boolean) => void
    actionLabels: Record<string, string>
  }) => (
    <section data-testid="permission-card">
      <div data-testid="selected-role-info">
        {selectedRoleInfo ? 'selected' : 'none'}
      </div>
      <div data-testid="view-mode">{viewMode}</div>
      <div data-testid="menu-count">{menuTree.length}</div>
      <div data-testid="matrix-column-count">{matrixColumns.length}</div>
      <div data-testid="matrix-row-count">{matrixData.length}</div>
      <div data-testid="permission-editable">
        {String(permissionActions.editable)}
      </div>
      <div data-testid="permission-saving">
        {String(permissionActions.saving)}
      </div>
      <div data-testid="menu-checked">{String(isMenuChecked('menu-1'))}</div>
      <div data-testid="menu-partial">
        {String(isMenuPartiallyChecked('menu-1'))}
      </div>
      <div data-testid="action-selected">
        {String(isActionSelected('menu-1', 'read'))}
      </div>
      <div data-testid="action-label">{actionLabels.read}</div>
      <button type="button" onClick={onSelectAll}>
        select all
      </button>
      <button type="button" onClick={onDeselectAll}>
        deselect all
      </button>
      <button type="button" onClick={() => onViewModeChange('matrix')}>
        matrix mode
      </button>
      <button type="button" onClick={onSave}>
        save permissions
      </button>
      <button
        type="button"
        onClick={() => onToggleAllMenuActions('menu-1', true)}
      >
        toggle menu
      </button>
      <button
        type="button"
        onClick={() => onToggleAction('menu-1', 'read', false)}
      >
        toggle action
      </button>
    </section>
  ),
}))

vi.mock('@/views/system/RoleActionEditorModal', () => ({
  RoleActionEditorModal: ({
    open,
    editingRole,
    form,
    saving,
    onSave,
    onClose,
  }: {
    open: boolean
    editingRole: unknown
    form: unknown
    saving: boolean
    onSave: () => void
    onClose: () => void
  }) =>
    open ? (
      <section data-testid="editor-modal">
        <div data-testid="editing-role">{editingRole ? 'editing' : 'none'}</div>
        <div data-testid="form-present">{form ? 'yes' : 'no'}</div>
        <div data-testid="modal-saving">{String(saving)}</div>
        <button type="button" onClick={onSave}>
          save role
        </button>
        <button type="button" onClick={onClose}>
          close modal
        </button>
      </section>
    ) : null,
}))

import { RoleActionEditor } from '@/views/system/RoleActionEditor'

function arrange({
  canCreateRole = true,
  canEditRole = true,
  canEditPermissions = true,
  isPageVisible = true,
  roleModalOpen = false,
}: {
  canCreateRole?: boolean
  canEditRole?: boolean
  canEditPermissions?: boolean
  isPageVisible?: boolean
  roleModalOpen?: boolean
} = {}) {
  mocks.mockCan.mockImplementation((resource: string, action: string) => {
    if (resource !== 'role') {
      return false
    }

    return {
      create: canCreateRole,
      update: canEditRole,
      manage_permissions: canEditPermissions,
    }[action]
  })
  mocks.mockUsePageVisibility.mockReturnValue(isPageVisible)
  mocks.mockUseRoleSettingsList.mockReturnValue({ roles: [mocks.role] })
  mocks.mockUseRoleActionPermissions.mockReturnValue({
    selectedRoleId: mocks.role.id,
    selectedRoleInfo: mocks.role,
    viewMode: 'list',
    setViewMode: mocks.mockSetViewMode,
    menuTree: [{ id: 'menu-1' }],
    matrixColumns: [{ key: 'read' }],
    matrixData: [{ key: 'menu-1' }],
    savePending: true,
    selectRole: mocks.mockSelectRole,
    selectAll: mocks.mockSelectAll,
    deselectAll: mocks.mockDeselectAll,
    saveRoleActions: mocks.mockSaveRoleActions,
    isMenuChecked: mocks.mockIsMenuChecked,
    isMenuPartiallyChecked: mocks.mockIsMenuPartiallyChecked,
    isActionSelected: mocks.mockIsActionSelected,
    toggleAllMenuActions: mocks.mockToggleAllMenuActions,
    toggleAction: mocks.mockToggleAction,
    actionLabels: { read: 'Read' },
  })
  mocks.mockUseRoleEditor.mockReturnValue({
    roleModalOpen,
    editingRole: roleModalOpen ? mocks.role : null,
    roleForm: roleModalOpen ? { form: true } : null,
    savePending: roleModalOpen,
    openRoleForm: mocks.mockOpenRoleForm,
    handleSaveRole: mocks.mockHandleSaveRole,
    closeRoleModal: mocks.mockCloseRoleModal,
  })
  mocks.mockIsMenuChecked.mockReturnValue(true)
  mocks.mockIsMenuPartiallyChecked.mockReturnValue(false)
  mocks.mockIsActionSelected.mockReturnValue(true)
}

describe('RoleActionEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    arrange()
  })

  it('passes permission and role state into child cards', () => {
    render(<RoleActionEditor />)

    expect(screen.getByTestId('role-list')).toBeInTheDocument()
    expect(screen.getByTestId('permission-card')).toBeInTheDocument()
    expect(screen.getByTestId('role-count')).toHaveTextContent('1')
    expect(screen.getByTestId('selected-role-id')).toHaveTextContent('1')
    expect(screen.getByTestId('can-create-role')).toHaveTextContent('true')
    expect(screen.getByTestId('permission-editable')).toHaveTextContent('true')
    expect(screen.getByTestId('permission-saving')).toHaveTextContent('true')
    expect(screen.getByTestId('action-label')).toHaveTextContent('Read')
    expect(mocks.mockUseRoleSettingsList).toHaveBeenCalledWith(true)
    expect(mocks.mockUseRoleActionPermissions).toHaveBeenCalledWith({
      roles: [mocks.role],
      canEditPermissions: true,
      enabled: true,
    })
    expect(mocks.mockUseRoleEditor).toHaveBeenCalledWith({
      canCreateRole: true,
      canEditRole: true,
      onCreatedRoleSelect: expect.any(Function),
    })
  })

  it('disables permission queries when the editor is inactive', () => {
    render(<RoleActionEditor active={false} />)

    expect(mocks.mockUseRoleSettingsList).toHaveBeenCalledWith(false)
    expect(mocks.mockUseRoleActionPermissions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('disables permission queries when the page is hidden', () => {
    arrange({ isPageVisible: false })

    render(<RoleActionEditor />)

    expect(mocks.mockUseRoleSettingsList).toHaveBeenCalledWith(false)
    expect(mocks.mockUseRoleActionPermissions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('forwards role list and permission card callbacks', () => {
    render(<RoleActionEditor />)

    fireEvent.click(screen.getByRole('button', { name: 'create role' }))
    fireEvent.click(screen.getByRole('button', { name: 'select role' }))
    fireEvent.click(screen.getByRole('button', { name: 'select all' }))
    fireEvent.click(screen.getByRole('button', { name: 'deselect all' }))
    fireEvent.click(screen.getByRole('button', { name: 'matrix mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'save permissions' }))
    fireEvent.click(screen.getByRole('button', { name: 'toggle menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'toggle action' }))

    expect(mocks.mockOpenRoleForm).toHaveBeenCalledWith('create')
    expect(mocks.mockSelectRole).toHaveBeenCalledWith(mocks.role)
    expect(mocks.mockSelectAll).toHaveBeenCalledTimes(1)
    expect(mocks.mockDeselectAll).toHaveBeenCalledTimes(1)
    expect(mocks.mockSetViewMode).toHaveBeenCalledWith('matrix')
    expect(mocks.mockSaveRoleActions).toHaveBeenCalledTimes(1)
    expect(mocks.mockToggleAllMenuActions).toHaveBeenCalledWith('menu-1', true)
    expect(mocks.mockToggleAction).toHaveBeenCalledWith('menu-1', 'read', false)
  })

  it('selects a newly created role from the role editor callback', () => {
    render(<RoleActionEditor />)

    const editorOptions = mocks.mockUseRoleEditor.mock.calls[0]?.[0]
    editorOptions.onCreatedRoleSelect(mocks.role)

    expect(mocks.mockSelectRole).toHaveBeenCalledWith(mocks.role)
  })

  it('renders the editor modal and forwards modal callbacks', () => {
    arrange({ roleModalOpen: true })

    render(<RoleActionEditor />)

    expect(screen.getByTestId('editor-modal')).toBeInTheDocument()
    expect(screen.getByTestId('editing-role')).toHaveTextContent('editing')
    expect(screen.getByTestId('form-present')).toHaveTextContent('yes')
    expect(screen.getByTestId('modal-saving')).toHaveTextContent('true')

    fireEvent.click(screen.getByRole('button', { name: 'save role' }))
    fireEvent.click(screen.getByRole('button', { name: 'close modal' }))

    expect(mocks.mockHandleSaveRole).toHaveBeenCalledTimes(1)
    expect(mocks.mockCloseRoleModal).toHaveBeenCalledTimes(1)
  })

  it('does not render the editor modal when it is closed', () => {
    render(<RoleActionEditor />)

    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('passes denied permissions through to hooks and child cards', () => {
    arrange({
      canCreateRole: false,
      canEditRole: false,
      canEditPermissions: false,
    })

    render(<RoleActionEditor />)

    expect(screen.getByTestId('can-create-role')).toHaveTextContent('false')
    expect(screen.getByTestId('permission-editable')).toHaveTextContent('false')
    expect(mocks.mockUseRoleActionPermissions).toHaveBeenCalledWith(
      expect.objectContaining({ canEditPermissions: false }),
    )
    expect(mocks.mockUseRoleEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        canCreateRole: false,
        canEditRole: false,
      }),
    )
  })
})
