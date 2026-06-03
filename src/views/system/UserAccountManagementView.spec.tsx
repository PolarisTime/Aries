import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockCan = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: vi.fn() }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/api/user-accounts', () => ({
  deleteUserAccount: vi.fn(),
}))

vi.mock('@/views/system/useUserAccountListState', () => ({
  useUserAccountListState: () => ({
    keyword: '',
    statusFilter: undefined,
    currentPage: 1,
    pageSize: 20,
    users: [],
    totalElements: 0,
    isLoading: false,
    setKeyword: vi.fn(),
    handleSearch: vi.fn(),
    handleStatusFilterChange: vi.fn(),
    handlePageChange: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/views/system/useUserAccountEditor', () => ({
  useUserAccountEditor: () => ({
    form: {},
    editorOpen: false,
    editorMode: 'create',
    editorLoading: false,
    editingId: null,
    loginNameValidationMessage: '',
    loginNameChecking: false,
    departmentOptions: [],
    roleOptions: [],
    selectedRoleIds: [],
    selectedRoleDataScope: '本人',
    selectedRoleSummaries: [],
    createResultOpen: false,
    createResult: null,
    savePending: false,
    openCreateModal: vi.fn(),
    openEditModal: vi.fn(),
    runLoginNameCheck: vi.fn(),
    handleSave: vi.fn(),
    closeEditor: vi.fn(),
    closeCreateResult: vi.fn(),
  }),
}))

vi.mock('@/views/system/useUserAccountDetail', () => ({
  useUserAccountDetail: () => ({
    detailOpen: false,
    detailLoading: false,
    detailRecord: null,
    openDetailModal: vi.fn(),
    closeDetailModal: vi.fn(),
  }),
}))

vi.mock('@/views/system/useUserAccountTwoFactor', () => ({
  useUserAccountTwoFactor: () => ({
    twoFaOpen: false,
    twoFaLoading: false,
    twoFaRecord: null,
    twoFaSetup: null,
    twoFaCode: '',
    twoFaSetupLoading: false,
    twoFaEnableLoading: false,
    twoFaDisableLoading: false,
    setTwoFaCode: vi.fn(),
    open2faModal: vi.fn(),
    handleGenerate2fa: vi.fn(),
    handleEnable2fa: vi.fn(),
    handleDisable2fa: vi.fn(),
    close2faModal: vi.fn(),
  }),
}))

vi.mock('@/views/system/UserAccountTableCard', () => ({
  UserAccountTableCard: () => <div data-testid="table-card">TableCard</div>,
}))

vi.mock('@/views/system/UserAccountEditorModal', () => ({
  UserAccountEditorModal: () => <div data-testid="editor-modal">Editor</div>,
}))

vi.mock('@/views/system/UserAccountDetailModal', () => ({
  UserAccountDetailModal: () => <div data-testid="detail-modal">Detail</div>,
}))

vi.mock('@/views/system/UserAccountCreateResultModal', () => ({
  UserAccountCreateResultModal: () => (
    <div data-testid="result-modal">Result</div>
  ),
}))

vi.mock('@/views/system/UserAccountTwoFactorModal', () => ({
  UserAccountTwoFactorModal: () => <div data-testid="2fa-modal">2FA</div>,
}))

vi.mock('@/views/system/user-account-view-utils', () => ({
  getUserAccountStatusColor: () => 'green',
  getUserAccountTotpColor: () => 'default',
}))

import { UserAccountManagementView } from '@/views/system/UserAccountManagementView'

describe('UserAccountManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
  })

  it('renders without crashing', () => {
    expect(UserAccountManagementView).toBeDefined()
    expect(typeof UserAccountManagementView).toBe('function')
  })

  it('renders the table card', () => {
    render(<UserAccountManagementView />)
    expect(screen.getByTestId('table-card')).toBeInTheDocument()
  })

  it('does not render editor modal by default', () => {
    render(<UserAccountManagementView />)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('does not render detail modal by default', () => {
    render(<UserAccountManagementView />)
    expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument()
  })
})
