import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseApiKeyManagementState = vi.hoisted(() => vi.fn())
const mockUsePageVisibility = vi.hoisted(() => vi.fn())

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => mockUsePageVisibility(),
}))

vi.mock('@/views/system/useApiKeyManagementState', () => ({
  useApiKeyManagementState: (...args: unknown[]) =>
    mockUseApiKeyManagementState(...args),
}))

vi.mock('@/views/system/ApiKeyUsageAlert', () => ({
  ApiKeyUsageAlert: () => <div data-testid="usage-alert">Alert</div>,
}))

vi.mock('@/views/system/ApiKeyListCard', () => ({
  ApiKeyListCard: (props: any) => (
    <div data-testid="list-card">
      <span data-testid="keyword">{props.keyword}</span>
      <span data-testid="filter-user-id">{props.filterUserId}</span>
      <span data-testid="status-filter">{props.statusFilter}</span>
      <span data-testid="usage-scope-filter">{props.usageScopeFilter}</span>
      <span data-testid="current-page">{props.currentPage}</span>
      <span data-testid="page-size">{props.pageSize}</span>
      <span data-testid="total-elements">{props.totalElements}</span>
      <span data-testid="key-count">{props.keys.length}</span>
      <span data-testid="loading">{String(props.loading)}</span>
      <span data-testid="can-create">{String(props.canCreate)}</span>
      <span data-testid="can-edit">{String(props.canEdit)}</span>
      <span data-testid="totp-disabled">{String(props.totpDisabled)}</span>
      <span data-testid="user-option-count">{props.userOptions.length}</span>
      <span data-testid="resource-option-count">
        {props.resourceOptions.length}
      </span>
      <span data-testid="action-option-count">
        {props.actionOptions.length}
      </span>
      <button type="button" onClick={() => props.onKeywordChange('invoice')}>
        keyword
      </button>
      <button type="button" onClick={props.onSearch}>
        search
      </button>
      <button type="button" onClick={() => props.onFilterUserChange('user-2')}>
        user
      </button>
      <button
        type="button"
        onClick={() => props.onStatusFilterChange('disabled')}
      >
        status
      </button>
      <button
        type="button"
        onClick={() => props.onUsageScopeFilterChange('custom')}
      >
        scope
      </button>
      <button type="button" onClick={props.onRefresh}>
        refresh
      </button>
      <button type="button" onClick={props.onCreate}>
        create
      </button>
      <button
        type="button"
        onClick={() => props.onRevoke({ id: 'key-1', keyName: 'Key 1' })}
      >
        revoke
      </button>
      <button type="button" onClick={() => props.onPageChange(3, 50)}>
        page
      </button>
    </div>
  ),
}))

vi.mock('@/views/system/ApiKeyCreateModal', () => ({
  ApiKeyCreateModal: (props: any) => (
    <div data-testid="create-modal">
      <span data-testid="generated-key">{props.generatedKey}</span>
      <span data-testid="generating">{String(props.generating)}</span>
      <span data-testid="create-totp-disabled">
        {String(props.totpDisabled)}
      </span>
      <span data-testid="create-user-option-count">
        {props.userOptions.length}
      </span>
      <span data-testid="create-resource-option-count">
        {props.resourceOptions.length}
      </span>
      <span data-testid="create-action-option-count">
        {props.actionOptions.length}
      </span>
      <span data-testid="form-present">{String(Boolean(props.form))}</span>
      <button type="button" onClick={props.onGenerate}>
        generate
      </button>
      <button type="button" onClick={props.onClose}>
        close create
      </button>
    </div>
  ),
}))

vi.mock('@/components/TwoFactorConfirmModal', () => ({
  TwoFactorConfirmModal: (props: any) => (
    <div data-testid="totp-modal">
      <span data-testid="totp-open">{String(props.open)}</span>
      <span data-testid="totp-title">{props.title}</span>
      <button type="button" onClick={() => props.onConfirm('123456')}>
        confirm totp
      </button>
      <button type="button" onClick={props.onCancel}>
        cancel totp
      </button>
    </div>
  ),
}))

import { ApiKeyManagementView } from '@/views/system/ApiKeyManagementView'

type ApiKeyManagementState = ReturnType<typeof createState>

function createState(overrides: Record<string, unknown> = {}) {
  return {
    actionOptions: [{ code: 'read', label: 'Read' }],
    canCreate: true,
    canEdit: true,
    currentPage: 2,
    filterUserId: 'user-1',
    form: { formName: 'api-key-form' },
    generateModalOpen: false,
    generatedKey: null,
    handleGenerate: vi.fn(),
    handleGenerateWithTotp: vi.fn(),
    handleRevoke: vi.fn(),
    isCurrentUserTotpDisabled: false,
    isLoading: false,
    keys: [{ id: 'key-1', keyName: 'Key 1' }],
    keyword: 'initial',
    openGenerateModal: vi.fn(),
    pageSize: 20,
    refreshApiKeys: vi.fn(),
    resourceOptions: [{ code: 'orders', label: 'Orders' }],
    setCurrentPage: vi.fn(),
    setFilterUserId: vi.fn(),
    setGenerateModalOpen: vi.fn(),
    setGeneratedKey: vi.fn(),
    setKeyword: vi.fn(),
    setPageSize: vi.fn(),
    setStatusFilter: vi.fn(),
    setTotpModalOpen: vi.fn(),
    setUsageScopeFilter: vi.fn(),
    statusFilter: 'active',
    totpLoading: false,
    totpModalOpen: false,
    totalElements: 1,
    usageScopeFilter: 'all',
    userOptions: [{ value: 'user-1', label: 'User 1' }],
    ...overrides,
  }
}

function renderView(state: ApiKeyManagementState = createState()) {
  mockUseApiKeyManagementState.mockReturnValue(state)
  render(<ApiKeyManagementView />)
  return state
}

describe('ApiKeyManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePageVisibility.mockReturnValue(true)
  })

  it('passes the active and page visibility state into the management hook', () => {
    const visibleState = createState()
    mockUseApiKeyManagementState.mockReturnValue(visibleState)

    const { rerender } = render(<ApiKeyManagementView />)

    expect(mockUseApiKeyManagementState).toHaveBeenLastCalledWith(true)

    rerender(<ApiKeyManagementView active={false} />)
    expect(mockUseApiKeyManagementState).toHaveBeenLastCalledWith(false)

    mockUsePageVisibility.mockReturnValue(false)
    rerender(<ApiKeyManagementView active={true} />)
    expect(mockUseApiKeyManagementState).toHaveBeenLastCalledWith(false)
  })

  it('renders usage alert, list card props, and omits closed modals', () => {
    renderView(
      createState({
        canCreate: false,
        canEdit: false,
        isLoading: true,
        totalElements: 7,
      }),
    )

    expect(screen.getByTestId('usage-alert')).toBeInTheDocument()
    expect(screen.getByTestId('keyword')).toHaveTextContent('initial')
    expect(screen.getByTestId('filter-user-id')).toHaveTextContent('user-1')
    expect(screen.getByTestId('status-filter')).toHaveTextContent('active')
    expect(screen.getByTestId('usage-scope-filter')).toHaveTextContent('all')
    expect(screen.getByTestId('current-page')).toHaveTextContent('2')
    expect(screen.getByTestId('page-size')).toHaveTextContent('20')
    expect(screen.getByTestId('total-elements')).toHaveTextContent('7')
    expect(screen.getByTestId('key-count')).toHaveTextContent('1')
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('can-create')).toHaveTextContent('false')
    expect(screen.getByTestId('can-edit')).toHaveTextContent('false')
    expect(screen.getByTestId('totp-disabled')).toHaveTextContent('false')
    expect(screen.getByTestId('user-option-count')).toHaveTextContent('1')
    expect(screen.getByTestId('resource-option-count')).toHaveTextContent('1')
    expect(screen.getByTestId('action-option-count')).toHaveTextContent('1')
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument()
    expect(screen.queryByTestId('totp-modal')).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.apiKey.totpRequiredHint'),
    ).not.toBeInTheDocument()
  })

  it('handles list keyword, search, filters, refresh, create, revoke, and page changes', () => {
    const state = renderView()

    fireEvent.click(screen.getByRole('button', { name: 'keyword' }))
    expect(state.setKeyword).toHaveBeenCalledWith('invoice')

    fireEvent.click(screen.getByRole('button', { name: 'search' }))
    expect(state.setCurrentPage).toHaveBeenCalledWith(1)
    expect(state.refreshApiKeys).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'user' }))
    expect(state.setFilterUserId).toHaveBeenCalledWith('user-2')
    expect(state.setCurrentPage).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: 'status' }))
    expect(state.setStatusFilter).toHaveBeenCalledWith('disabled')
    expect(state.setCurrentPage).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: 'scope' }))
    expect(state.setUsageScopeFilter).toHaveBeenCalledWith('custom')
    expect(state.setCurrentPage).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    expect(state.refreshApiKeys).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'create' }))
    expect(state.openGenerateModal).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'revoke' }))
    expect(state.handleRevoke).toHaveBeenCalledWith({
      id: 'key-1',
      keyName: 'Key 1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'page' }))
    expect(state.setCurrentPage).toHaveBeenLastCalledWith(3)
    expect(state.setPageSize).toHaveBeenCalledWith(50)
  })

  it('renders the create modal and handles generate and close callbacks', () => {
    const state = renderView(
      createState({
        generateModalOpen: true,
        generatedKey: 'ak_raw_secret',
        isCurrentUserTotpDisabled: true,
      }),
    )

    expect(screen.getByTestId('create-modal')).toBeInTheDocument()
    expect(
      screen.getByText('system.apiKey.totpRequiredHint'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('generated-key')).toHaveTextContent(
      'ak_raw_secret',
    )
    expect(screen.getByTestId('generating')).toHaveTextContent('false')
    expect(screen.getByTestId('create-totp-disabled')).toHaveTextContent('true')
    expect(screen.getByTestId('create-user-option-count')).toHaveTextContent(
      '1',
    )
    expect(
      screen.getByTestId('create-resource-option-count'),
    ).toHaveTextContent('1')
    expect(screen.getByTestId('create-action-option-count')).toHaveTextContent(
      '1',
    )
    expect(screen.getByTestId('form-present')).toHaveTextContent('true')

    fireEvent.click(screen.getByRole('button', { name: 'generate' }))
    expect(state.handleGenerate).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'close create' }))
    expect(state.setGenerateModalOpen).toHaveBeenCalledWith(false)
    expect(state.setGeneratedKey).toHaveBeenCalledWith(null)
  })

  it('renders the totp modal and handles confirm and cancel callbacks', () => {
    const state = renderView(createState({ totpModalOpen: true }))

    expect(screen.getByTestId('totp-modal')).toBeInTheDocument()
    expect(screen.getByTestId('totp-open')).toHaveTextContent('true')
    expect(screen.getByTestId('totp-title')).toHaveTextContent(
      'system.apiKey.verifyTotpTitle',
    )

    fireEvent.click(screen.getByRole('button', { name: 'confirm totp' }))
    expect(state.handleGenerateWithTotp).toHaveBeenCalledWith('123456')

    fireEvent.click(screen.getByRole('button', { name: 'cancel totp' }))
    expect(state.setTotpModalOpen).toHaveBeenCalledWith(false)
  })
})
