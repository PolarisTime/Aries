import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { UserAccountRecord } from '@/shared/schemas'

const mocks = vi.hoisted(() => {
  const sampleRecord = {
    id: 'user-1',
    loginName: 'alice',
    userName: 'Alice',
    mobile: null,
    departmentId: null,
    departmentName: null,
    roleNames: ['Admin'],
    roleIds: ['role-1'],
    dataScope: null,
    permissionSummary: null,
    lastLoginDate: null,
    status: 'ENABLE',
    remark: null,
    totpEnabled: false,
  }

  const listState = {
    keyword: 'alice',
    statusFilter: 'ENABLE',
    currentPage: 2,
    pageSize: 10,
    users: [sampleRecord],
    totalElements: 1,
    isLoading: false,
    setKeyword: vi.fn(),
    handleSearch: vi.fn(),
    handleStatusFilterChange: vi.fn(),
    handlePageChange: vi.fn(),
    refresh: vi.fn(),
  }

  const editorState = {
    form: { name: 'form' },
    editorOpen: false,
    editorMode: 'create',
    editorLoading: false,
    editingId: null as string | null,
    loginNameValidationMessage: '',
    loginNameChecking: false,
    departmentOptions: [{ value: 'dept-1', label: 'Dept' }],
    roleOptions: [{ value: 'role-1', label: 'Admin' }],
    selectedRoleIds: ['role-1'],
    selectedRoleDataScope: 'ALL',
    selectedRoleSummaries: ['all permissions'],
    createResultOpen: false,
    createResult: null as unknown,
    savePending: false,
    openCreateModal: vi.fn(),
    openEditModal: vi.fn(),
    runLoginNameCheck: vi.fn(),
    handleSave: vi.fn(),
    closeEditor: vi.fn(),
    closeCreateResult: vi.fn(),
  }

  const detailState = {
    detailOpen: false,
    detailLoading: false,
    detailRecord: sampleRecord,
    openDetailModal: vi.fn(),
    closeDetailModal: vi.fn(),
  }

  const twoFactorState = {
    twoFaOpen: false,
    twoFaLoading: false,
    twoFaRecord: sampleRecord,
    twoFaSetup: { qrCodeBase64: 'qr', secret: 'secret' },
    twoFaCode: '123456',
    twoFaSetupLoading: false,
    twoFaEnableLoading: false,
    twoFaDisableLoading: false,
    setTwoFaCode: vi.fn(),
    open2faModal: vi.fn(),
    handleGenerate2fa: vi.fn(),
    handleEnable2fa: vi.fn(),
    handleDisable2fa: vi.fn(),
    close2faModal: vi.fn(),
  }

  return {
    sampleRecord,
    listState,
    editorState,
    detailState,
    twoFactorState,
    can: vi.fn(),
    deleteUserAccount: vi.fn(),
    invalidateQueries: vi.fn(),
    messageSuccess: vi.fn(),
    messageError: vi.fn(),
    modalConfirm: vi.fn(),
    showError: vi.fn(),
    pageVisible: true,
    mutationOptions: undefined as
      | {
          mutationFn: (id: string) => Promise<unknown>
          onSuccess: () => void
          onError: (error: Error) => void
        }
      | undefined,
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useMutation: (options: NonNullable<typeof mocks.mutationOptions>) => {
    mocks.mutationOptions = options
    return {
      mutateAsync: async (id: string) => {
        try {
          const result = await options.mutationFn(id)
          options.onSuccess()
          return result
        } catch (error) {
          options.onError(error as Error)
          throw error
        }
      },
    }
  },
}))

vi.mock('@/api/user-accounts', () => ({
  deleteUserAccount: mocks.deleteUserAccount,
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mocks.can }),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => mocks.pageVisible,
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mocks.showError }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: mocks.messageSuccess,
    error: mocks.messageError,
  },
  modal: { confirm: mocks.modalConfirm },
}))

vi.mock('@/views/system/useUserAccountListState', () => ({
  useUserAccountListState: vi.fn((enabled: boolean) => ({
    ...mocks.listState,
    queryEnabled: enabled,
  })),
}))

vi.mock('@/views/system/useUserAccountEditor', () => ({
  useUserAccountEditor: vi.fn(() => mocks.editorState),
}))

vi.mock('@/views/system/useUserAccountDetail', () => ({
  useUserAccountDetail: vi.fn(() => mocks.detailState),
}))

vi.mock('@/views/system/useUserAccountTwoFactor', () => ({
  useUserAccountTwoFactor: vi.fn(() => mocks.twoFactorState),
}))

vi.mock('@/views/system/user-account-view-utils', () => ({
  getUserAccountStatusColor: vi.fn(() => 'green'),
  getUserAccountTotpColor: vi.fn(() => 'blue'),
}))

vi.mock('@/views/system/UserAccountTableCard', () => ({
  UserAccountTableCard: (props: {
    keyword: string
    statusFilter: string
    currentPage: number
    pageSize: number
    totalElements: number
    users: UserAccountRecord[]
    loading: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    getStatusColor: (status: string) => string
    getTotpColor: (enabled: boolean) => string
    onKeywordChange: (keyword: string) => void
    onSearch: () => void
    onStatusFilterChange: (status: string) => void
    onRefresh: () => void
    onCreate: () => void
    onView: (record: UserAccountRecord) => void
    onEdit: (record: UserAccountRecord) => void
    onManage2fa: (record: UserAccountRecord) => void
    onDelete: (record: UserAccountRecord) => void
    onPageChange: (page: number, pageSize: number) => void
  }) => (
    <section
      data-testid="table-card"
      data-can-create={String(props.canCreate)}
      data-can-edit={String(props.canEdit)}
      data-can-delete={String(props.canDelete)}
      data-keyword={props.keyword}
      data-status={props.statusFilter}
      data-page={props.currentPage}
      data-page-size={props.pageSize}
      data-total={props.totalElements}
      data-users={props.users.length}
      data-loading={String(props.loading)}
      data-status-color={props.getStatusColor('ENABLE')}
      data-totp-color={props.getTotpColor(true)}
    >
      <button onClick={() => props.onKeywordChange('bob')}>keyword</button>
      <button onClick={props.onSearch}>search</button>
      <button onClick={() => props.onStatusFilterChange('DISABLED')}>
        status
      </button>
      <button onClick={props.onRefresh}>refresh</button>
      <button onClick={props.onCreate}>create</button>
      <button onClick={() => props.onView(mocks.sampleRecord)}>view</button>
      <button onClick={() => props.onEdit(mocks.sampleRecord)}>edit</button>
      <button onClick={() => props.onManage2fa(mocks.sampleRecord)}>2fa</button>
      <button onClick={() => props.onDelete(mocks.sampleRecord)}>delete</button>
      <button onClick={() => props.onPageChange(3, 30)}>page</button>
    </section>
  ),
}))

vi.mock('@/views/system/UserAccountEditorModal', () => ({
  UserAccountEditorModal: (props: {
    open: boolean
    mode: string
    loading: boolean
    saving: boolean
    editingId: string | null
    loginNameValidationMessage: string
    loginNameChecking: boolean
    departmentOptions: unknown[]
    roleOptions: unknown[]
    selectedRoleIds: string[]
    selectedRoleDataScope: string
    selectedRoleSummaries: string[]
    onCheckLoginName: (loginName: string, excludeUserId?: string) => void
    onSave: () => void
    onClose: () => void
  }) => (
    <section
      data-testid="editor-modal"
      data-open={String(props.open)}
      data-mode={props.mode}
      data-loading={String(props.loading)}
      data-saving={String(props.saving)}
      data-editing-id={props.editingId ?? ''}
      data-login-message={props.loginNameValidationMessage}
      data-login-checking={String(props.loginNameChecking)}
      data-departments={props.departmentOptions.length}
      data-roles={props.roleOptions.length}
      data-selected-role-ids={props.selectedRoleIds.join(',')}
      data-data-scope={props.selectedRoleDataScope}
      data-role-summaries={props.selectedRoleSummaries.join(',')}
    >
      <button onClick={() => props.onCheckLoginName('alice', 'user-1')}>
        check-login
      </button>
      <button onClick={props.onSave}>save</button>
      <button onClick={props.onClose}>close-editor</button>
    </section>
  ),
}))

vi.mock('@/views/system/UserAccountDetailModal', () => ({
  UserAccountDetailModal: (props: {
    open: boolean
    loading: boolean
    record: UserAccountRecord
    getStatusColor: (status: string) => string
    getTotpColor: (enabled: boolean) => string
    onClose: () => void
  }) => (
    <section
      data-testid="detail-modal"
      data-open={String(props.open)}
      data-loading={String(props.loading)}
      data-record={props.record.loginName}
      data-status-color={props.getStatusColor(props.record.status)}
      data-totp-color={props.getTotpColor(props.record.totpEnabled)}
    >
      <button onClick={props.onClose}>close-detail</button>
    </section>
  ),
}))

vi.mock('@/views/system/UserAccountCreateResultModal', () => ({
  UserAccountCreateResultModal: (props: {
    open: boolean
    result: unknown
    onCopy: (value: string, label: string) => void
    onClose: () => void
  }) => (
    <section
      data-testid="result-modal"
      data-open={String(props.open)}
      data-has-result={String(Boolean(props.result))}
    >
      <button onClick={() => props.onCopy('secret-password', 'password')}>
        copy-password
      </button>
      <button onClick={props.onClose}>close-result</button>
    </section>
  ),
}))

vi.mock('@/views/system/UserAccountTwoFactorModal', () => ({
  UserAccountTwoFactorModal: (props: {
    open: boolean
    loading: boolean
    record: UserAccountRecord
    setup: unknown
    code: string
    setupLoading: boolean
    enableLoading: boolean
    disableLoading: boolean
    onCodeChange: (code: string) => void
    onGenerate: () => void
    onEnable: () => void
    onDisable: () => void
    onClose: () => void
  }) => (
    <section
      data-testid="2fa-modal"
      data-open={String(props.open)}
      data-loading={String(props.loading)}
      data-record={props.record.loginName}
      data-has-setup={String(Boolean(props.setup))}
      data-code={props.code}
      data-setup-loading={String(props.setupLoading)}
      data-enable-loading={String(props.enableLoading)}
      data-disable-loading={String(props.disableLoading)}
    >
      <button onClick={() => props.onCodeChange('654321')}>change-code</button>
      <button onClick={props.onGenerate}>generate</button>
      <button onClick={props.onEnable}>enable</button>
      <button onClick={props.onDisable}>disable</button>
      <button onClick={props.onClose}>close-2fa</button>
    </section>
  ),
}))

import { UserAccountManagementView } from '@/views/system/UserAccountManagementView'
import { useUserAccountEditor } from '@/views/system/useUserAccountEditor'
import { useUserAccountListState } from '@/views/system/useUserAccountListState'

describe('UserAccountManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pageVisible = true
    mocks.can.mockReturnValue(true)
    mocks.deleteUserAccount.mockResolvedValue(undefined)
    mocks.modalConfirm.mockImplementation(() => undefined)

    Object.assign(mocks.editorState, {
      editorOpen: false,
      createResultOpen: false,
      createResult: null,
      editorMode: 'create',
      editorLoading: false,
      savePending: false,
      editingId: null,
      loginNameValidationMessage: '',
      loginNameChecking: false,
    })
    Object.assign(mocks.detailState, {
      detailOpen: false,
      detailLoading: false,
    })
    Object.assign(mocks.twoFactorState, {
      twoFaOpen: false,
      twoFaLoading: false,
      twoFaSetupLoading: false,
      twoFaEnableLoading: false,
      twoFaDisableLoading: false,
    })

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('renders table with state, permissions, colors and enabled query by default', () => {
    render(<UserAccountManagementView />)

    const table = screen.getByTestId('table-card')
    expect(table).toHaveAttribute('data-can-create', 'true')
    expect(table).toHaveAttribute('data-can-edit', 'true')
    expect(table).toHaveAttribute('data-can-delete', 'true')
    expect(table).toHaveAttribute('data-keyword', 'alice')
    expect(table).toHaveAttribute('data-status', 'ENABLE')
    expect(table).toHaveAttribute('data-status-color', 'green')
    expect(table).toHaveAttribute('data-totp-color', 'blue')
    expect(useUserAccountListState).toHaveBeenCalledWith(true)
    expect(useUserAccountEditor).toHaveBeenCalledWith({
      canViewRoleCatalog: true,
      canViewDepartmentCatalog: true,
      enabled: true,
    })
  })

  it('passes disabled permissions and disables query when inactive', () => {
    mocks.can.mockReturnValue(false)

    render(<UserAccountManagementView active={false} />)

    expect(screen.getByTestId('table-card')).toHaveAttribute(
      'data-can-create',
      'false',
    )
    expect(useUserAccountListState).toHaveBeenCalledWith(false)
    expect(useUserAccountEditor).toHaveBeenCalledWith({
      canViewRoleCatalog: false,
      canViewDepartmentCatalog: false,
      enabled: false,
    })
  })

  it('disables query when page is hidden', () => {
    mocks.pageVisible = false

    render(<UserAccountManagementView />)

    expect(useUserAccountListState).toHaveBeenCalledWith(false)
    expect(useUserAccountEditor).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('passes table callbacks through to list, editor, detail and 2FA hooks', () => {
    render(<UserAccountManagementView />)

    fireEvent.click(screen.getByText('keyword'))
    fireEvent.click(screen.getByText('search'))
    fireEvent.click(screen.getByText('status'))
    fireEvent.click(screen.getByText('refresh'))
    fireEvent.click(screen.getByText('create'))
    fireEvent.click(screen.getByText('view'))
    fireEvent.click(screen.getByText('edit'))
    fireEvent.click(screen.getByText('2fa'))
    fireEvent.click(screen.getByText('page'))

    expect(mocks.listState.setKeyword).toHaveBeenCalledWith('bob')
    expect(mocks.listState.handleSearch).toHaveBeenCalled()
    expect(mocks.listState.handleStatusFilterChange).toHaveBeenCalledWith(
      'DISABLED',
    )
    expect(mocks.listState.refresh).toHaveBeenCalled()
    expect(mocks.editorState.openCreateModal).toHaveBeenCalled()
    expect(mocks.detailState.openDetailModal).toHaveBeenCalledWith(
      mocks.sampleRecord,
    )
    expect(mocks.editorState.openEditModal).toHaveBeenCalledWith(
      mocks.sampleRecord,
    )
    expect(mocks.twoFactorState.open2faModal).toHaveBeenCalledWith(
      mocks.sampleRecord,
    )
    expect(mocks.listState.handlePageChange).toHaveBeenCalledWith(3, 30)
  })

  it('confirms deletion and invalidates user account query after success', async () => {
    render(<UserAccountManagementView />)

    fireEvent.click(screen.getByText('delete'))

    expect(mocks.modalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'system.userAccount.deleteTitle',
        content: 'system.userAccount.deleteContent:{"loginName":"alice"}',
        okText: 'common.confirm',
        cancelText: 'common.cancel',
        okButtonProps: { danger: true },
      }),
    )

    const confirmOptions = mocks.modalConfirm.mock.calls[0][0] as {
      onOk: () => Promise<unknown>
    }
    await expect(confirmOptions.onOk()).resolves.toBeUndefined()

    expect(mocks.deleteUserAccount).toHaveBeenCalledWith('user-1')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('common.deleteSuccess')
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.userAccountBase,
    })
  })

  it('reports deletion failure through request error handler', async () => {
    const error = new Error('delete failed')
    mocks.deleteUserAccount.mockRejectedValueOnce(error)
    render(<UserAccountManagementView />)

    fireEvent.click(screen.getByText('delete'))

    const confirmOptions = mocks.modalConfirm.mock.calls[0][0] as {
      onOk: () => Promise<unknown>
    }
    await expect(confirmOptions.onOk()).rejects.toThrow('delete failed')

    expect(mocks.showError).toHaveBeenCalledWith(error, 'api.deleteFailed')
  })

  it('renders editor modal and passes editor callbacks', () => {
    Object.assign(mocks.editorState, {
      editorOpen: true,
      editorMode: 'edit',
      editorLoading: true,
      savePending: true,
      editingId: 'user-1',
      loginNameValidationMessage: 'checking',
      loginNameChecking: true,
    })

    render(<UserAccountManagementView />)

    const editor = screen.getByTestId('editor-modal')
    expect(editor).toHaveAttribute('data-mode', 'edit')
    expect(editor).toHaveAttribute('data-loading', 'true')
    expect(editor).toHaveAttribute('data-saving', 'true')
    expect(editor).toHaveAttribute('data-editing-id', 'user-1')
    expect(editor).toHaveAttribute('data-login-message', 'checking')
    expect(editor).toHaveAttribute('data-login-checking', 'true')

    fireEvent.click(screen.getByText('check-login'))
    fireEvent.click(screen.getByText('save'))
    fireEvent.click(screen.getByText('close-editor'))

    expect(mocks.editorState.runLoginNameCheck).toHaveBeenCalledWith(
      'alice',
      'user-1',
    )
    expect(mocks.editorState.handleSave).toHaveBeenCalled()
    expect(mocks.editorState.closeEditor).toHaveBeenCalled()
  })

  it('renders detail modal and passes close callback', () => {
    Object.assign(mocks.detailState, {
      detailOpen: true,
      detailLoading: true,
    })

    render(<UserAccountManagementView />)

    const detail = screen.getByTestId('detail-modal')
    expect(detail).toHaveAttribute('data-loading', 'true')
    expect(detail).toHaveAttribute('data-record', 'alice')

    fireEvent.click(screen.getByText('close-detail'))

    expect(mocks.detailState.closeDetailModal).toHaveBeenCalled()
  })

  it('renders create result modal and copies password successfully', async () => {
    Object.assign(mocks.editorState, {
      createResultOpen: true,
      createResult: { loginName: 'alice', password: 'secret-password' },
    })

    render(<UserAccountManagementView />)

    expect(screen.getByTestId('result-modal')).toHaveAttribute(
      'data-has-result',
      'true',
    )

    fireEvent.click(screen.getByText('copy-password'))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'secret-password',
      )
    })

    expect(mocks.messageSuccess).toHaveBeenCalledWith(
      'system.userAccount.copied:{"label":"password"}',
    )

    fireEvent.click(screen.getByText('close-result'))
    expect(mocks.editorState.closeCreateResult).toHaveBeenCalled()
  })

  it('shows copy failure message when clipboard write fails', async () => {
    Object.assign(mocks.editorState, {
      createResultOpen: true,
      createResult: { loginName: 'alice', password: 'secret-password' },
    })
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error('clipboard denied'),
    )

    render(<UserAccountManagementView />)

    fireEvent.click(screen.getByText('copy-password'))

    await waitFor(() => {
      expect(mocks.messageError).toHaveBeenCalledWith(
        'system.userAccount.copyFailed:{"label":"password"}',
      )
    })
  })

  it('renders 2FA modal and passes all callbacks', () => {
    Object.assign(mocks.twoFactorState, {
      twoFaOpen: true,
      twoFaLoading: true,
      twoFaSetupLoading: true,
      twoFaEnableLoading: true,
      twoFaDisableLoading: true,
    })

    render(<UserAccountManagementView />)

    const modal = screen.getByTestId('2fa-modal')
    expect(modal).toHaveAttribute('data-loading', 'true')
    expect(modal).toHaveAttribute('data-record', 'alice')
    expect(modal).toHaveAttribute('data-has-setup', 'true')
    expect(modal).toHaveAttribute('data-code', '123456')
    expect(modal).toHaveAttribute('data-setup-loading', 'true')
    expect(modal).toHaveAttribute('data-enable-loading', 'true')
    expect(modal).toHaveAttribute('data-disable-loading', 'true')

    fireEvent.click(screen.getByText('change-code'))
    fireEvent.click(screen.getByText('generate'))
    fireEvent.click(screen.getByText('enable'))
    fireEvent.click(screen.getByText('disable'))
    fireEvent.click(screen.getByText('close-2fa'))

    expect(mocks.twoFactorState.setTwoFaCode).toHaveBeenCalledWith('654321')
    expect(mocks.twoFactorState.handleGenerate2fa).toHaveBeenCalled()
    expect(mocks.twoFactorState.handleEnable2fa).toHaveBeenCalled()
    expect(mocks.twoFactorState.handleDisable2fa).toHaveBeenCalled()
    expect(mocks.twoFactorState.close2faModal).toHaveBeenCalled()
  })

  it('does not render optional modals when closed', () => {
    render(<UserAccountManagementView />)

    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument()
    expect(screen.queryByTestId('result-modal')).not.toBeInTheDocument()
    expect(screen.queryByTestId('2fa-modal')).not.toBeInTheDocument()
  })
})
