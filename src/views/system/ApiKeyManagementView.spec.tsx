import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseApiKeyManagementState = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

vi.mock('@/views/system/useApiKeyManagementState', () => ({
  useApiKeyManagementState: (...args: unknown[]) =>
    mockUseApiKeyManagementState(...args),
}))

vi.mock('@/views/system/ApiKeyUsageAlert', () => ({
  ApiKeyUsageAlert: () => <div data-testid="usage-alert">Alert</div>,
}))

vi.mock('@/views/system/ApiKeyListCard', () => ({
  ApiKeyListCard: () => <div data-testid="list-card">ListCard</div>,
}))

vi.mock('@/views/system/ApiKeyCreateModal', () => ({
  ApiKeyCreateModal: () => <div data-testid="create-modal">CreateModal</div>,
}))

vi.mock('@/components/TwoFactorConfirmModal', () => ({
  TwoFactorConfirmModal: () => <div data-testid="totp-modal">TotpModal</div>,
}))

import { ApiKeyManagementView } from '@/views/system/ApiKeyManagementView'

describe('ApiKeyManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApiKeyManagementState.mockReturnValue({
      actionOptions: [],
      canCreate: true,
      canEdit: true,
      currentPage: 1,
      filterUserId: undefined,
      form: {},
      generateModalOpen: false,
      generatedKey: null,
      handleGenerate: vi.fn(),
      handleGenerateWithTotp: vi.fn(),
      handleRevoke: vi.fn(),
      isCurrentUserTotpDisabled: false,
      isLoading: false,
      keys: [],
      keyword: '',
      openGenerateModal: vi.fn(),
      pageSize: 20,
      refreshApiKeys: vi.fn(),
      resourceOptions: [],
      setCurrentPage: vi.fn(),
      setFilterUserId: vi.fn(),
      setGenerateModalOpen: vi.fn(),
      setGeneratedKey: vi.fn(),
      setKeyword: vi.fn(),
      setPageSize: vi.fn(),
      setStatusFilter: vi.fn(),
      setTotpModalOpen: vi.fn(),
      setUsageScopeFilter: vi.fn(),
      statusFilter: undefined,
      totpLoading: false,
      totpModalOpen: false,
      totalElements: 0,
      usageScopeFilter: undefined,
      userOptions: [],
    })
  })

  it('renders without crashing', () => {
    expect(ApiKeyManagementView).toBeDefined()
    expect(typeof ApiKeyManagementView).toBe('function')
  })

  it('renders usage alert', () => {
    render(<ApiKeyManagementView />)
    expect(screen.getByTestId('usage-alert')).toBeInTheDocument()
  })

  it('renders list card', () => {
    render(<ApiKeyManagementView />)
    expect(screen.getByTestId('list-card')).toBeInTheDocument()
  })

  it('shows TOTP warning when totp is disabled', () => {
    mockUseApiKeyManagementState.mockReturnValue({
      actionOptions: [],
      canCreate: true,
      canEdit: true,
      currentPage: 1,
      filterUserId: undefined,
      form: {},
      generateModalOpen: false,
      generatedKey: null,
      handleGenerate: vi.fn(),
      handleGenerateWithTotp: vi.fn(),
      handleRevoke: vi.fn(),
      isCurrentUserTotpDisabled: true,
      isLoading: false,
      keys: [],
      keyword: '',
      openGenerateModal: vi.fn(),
      pageSize: 20,
      refreshApiKeys: vi.fn(),
      resourceOptions: [],
      setCurrentPage: vi.fn(),
      setFilterUserId: vi.fn(),
      setGenerateModalOpen: vi.fn(),
      setGeneratedKey: vi.fn(),
      setKeyword: vi.fn(),
      setPageSize: vi.fn(),
      setStatusFilter: vi.fn(),
      setTotpModalOpen: vi.fn(),
      setUsageScopeFilter: vi.fn(),
      statusFilter: undefined,
      totpLoading: false,
      totpModalOpen: false,
      totalElements: 0,
      usageScopeFilter: undefined,
      userOptions: [],
    })
    render(<ApiKeyManagementView />)
    expect(
      screen.getByText('system.apiKey.totpRequiredHint'),
    ).toBeInTheDocument()
  })

  it('does not show TOTP warning when totp is enabled', () => {
    render(<ApiKeyManagementView />)
    expect(
      screen.queryByText('system.apiKey.totpRequiredHint'),
    ).not.toBeInTheDocument()
  })

  it('renders create modal when generateModalOpen is true', () => {
    mockUseApiKeyManagementState.mockReturnValue({
      actionOptions: [],
      canCreate: true,
      canEdit: true,
      currentPage: 1,
      filterUserId: undefined,
      form: {},
      generateModalOpen: true,
      generatedKey: null,
      handleGenerate: vi.fn(),
      handleGenerateWithTotp: vi.fn(),
      handleRevoke: vi.fn(),
      isCurrentUserTotpDisabled: false,
      isLoading: false,
      keys: [],
      keyword: '',
      openGenerateModal: vi.fn(),
      pageSize: 20,
      refreshApiKeys: vi.fn(),
      resourceOptions: [],
      setCurrentPage: vi.fn(),
      setFilterUserId: vi.fn(),
      setGenerateModalOpen: vi.fn(),
      setGeneratedKey: vi.fn(),
      setKeyword: vi.fn(),
      setPageSize: vi.fn(),
      setStatusFilter: vi.fn(),
      setTotpModalOpen: vi.fn(),
      setUsageScopeFilter: vi.fn(),
      statusFilter: undefined,
      totpLoading: false,
      totpModalOpen: false,
      totalElements: 0,
      usageScopeFilter: undefined,
      userOptions: [],
    })
    render(<ApiKeyManagementView />)
    expect(screen.getByTestId('create-modal')).toBeInTheDocument()
  })

  it('renders totp modal when totpModalOpen is true', () => {
    mockUseApiKeyManagementState.mockReturnValue({
      actionOptions: [],
      canCreate: true,
      canEdit: true,
      currentPage: 1,
      filterUserId: undefined,
      form: {},
      generateModalOpen: false,
      generatedKey: null,
      handleGenerate: vi.fn(),
      handleGenerateWithTotp: vi.fn(),
      handleRevoke: vi.fn(),
      isCurrentUserTotpDisabled: false,
      isLoading: false,
      keys: [],
      keyword: '',
      openGenerateModal: vi.fn(),
      pageSize: 20,
      refreshApiKeys: vi.fn(),
      resourceOptions: [],
      setCurrentPage: vi.fn(),
      setFilterUserId: vi.fn(),
      setGenerateModalOpen: vi.fn(),
      setGeneratedKey: vi.fn(),
      setKeyword: vi.fn(),
      setPageSize: vi.fn(),
      setStatusFilter: vi.fn(),
      setTotpModalOpen: vi.fn(),
      setUsageScopeFilter: vi.fn(),
      statusFilter: undefined,
      totpLoading: false,
      totpModalOpen: true,
      totalElements: 0,
      usageScopeFilter: undefined,
      userOptions: [],
    })
    render(<ApiKeyManagementView />)
    expect(screen.getByTestId('totp-modal')).toBeInTheDocument()
  })
})
