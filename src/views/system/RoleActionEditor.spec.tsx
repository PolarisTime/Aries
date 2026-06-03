import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockCan = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

vi.mock('@/views/system/useRoleSettingsList', () => ({
  useRoleSettingsList: () => ({
    roles: [
      { id: '1', roleName: 'Admin', roleCode: 'admin', roleType: '系统', status: '正常', userCount: 5 },
    ],
  }),
}))

vi.mock('@/views/system/useRoleActionPermissions', () => ({
  useRoleActionPermissions: () => ({
    selectedRoleId: null,
    selectedRoleInfo: null,
    viewMode: 'list',
    setViewMode: vi.fn(),
    menuTree: [],
    matrixColumns: [],
    matrixData: [],
    savePending: false,
    selectRole: vi.fn(),
    selectAll: vi.fn(),
    deselectAll: vi.fn(),
    saveRoleActions: vi.fn(),
    isMenuChecked: () => false,
    isMenuPartiallyChecked: () => false,
    isActionSelected: () => false,
    toggleAllMenuActions: vi.fn(),
    toggleAction: vi.fn(),
    actionLabels: {},
  }),
}))

vi.mock('@/views/system/useRoleEditor', () => ({
  useRoleEditor: () => ({
    roleModalOpen: false,
    editingRole: null,
    roleForm: {},
    savePending: false,
    openRoleForm: vi.fn(),
    handleSaveRole: vi.fn(),
    closeRoleModal: vi.fn(),
  }),
}))

vi.mock('@/views/system/RoleActionRoleListCard', () => ({
  RoleActionRoleListCard: () => <div data-testid="role-list">RoleList</div>,
}))

vi.mock('@/views/system/RoleActionPermissionCard', () => ({
  RoleActionPermissionCard: () => <div data-testid="permission-card">PermissionCard</div>,
}))

vi.mock('@/views/system/RoleActionEditorModal', () => ({
  RoleActionEditorModal: () => <div data-testid="editor-modal">EditorModal</div>,
}))

import { RoleActionEditor } from '@/views/system/RoleActionEditor'

describe('RoleActionEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
  })

  it('renders without crashing', () => {
    expect(RoleActionEditor).toBeDefined()
    expect(typeof RoleActionEditor).toBe('function')
  })

  it('renders role list card', () => {
    render(<RoleActionEditor />)
    expect(screen.getByTestId('role-list')).toBeInTheDocument()
  })

  it('renders permission card', () => {
    render(<RoleActionEditor />)
    expect(screen.getByTestId('permission-card')).toBeInTheDocument()
  })

  it('does not render editor modal by default', () => {
    render(<RoleActionEditor />)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })
})
