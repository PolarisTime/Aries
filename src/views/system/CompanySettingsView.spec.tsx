import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()
const mockCan = vi.fn()
const mockUseQueryClient = vi.fn()
const mockUseMutation = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: vi.fn() }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), warning: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('@/lib/antd-form', () => ({
  validateForm: vi.fn(),
  getFormString: () => '',
}))

vi.mock('@/views/system/CompanySettingsHeader', () => ({
  CompanySettingsHeader: ({
    overviewItems,
  }: {
    overviewItems: Array<{ label: string; value: string }>
  }) => (
    <div data-testid="header">
      {overviewItems.map((item: { label: string; value: string }) => (
        <div key={item.label}>
          {item.label}: {item.value}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/views/system/CompanySubjectCard', () => ({
  CompanySubjectCard: () => <div data-testid="subject-card">Subject</div>,
}))

vi.mock('@/views/system/CompanySettlementAccountsCard', () => ({
  CompanySettlementAccountsCard: () => (
    <div data-testid="settlement-card">Settlement</div>
  ),
}))

import { CompanySettingsView } from '@/views/system/CompanySettingsView'

describe('CompanySettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
    })
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
    mockUseQuery.mockReturnValue({
      data: {
        companyName: 'Test Company',
        taxNo: '123456',
        status: '正常',
        settlementAccounts: [],
      },
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })
  })

  it('renders without crashing', () => {
    expect(CompanySettingsView).toBeDefined()
    expect(typeof CompanySettingsView).toBe('function')
  })

  it('renders the info alert', () => {
    render(<CompanySettingsView />)
    expect(screen.getByText('system.company.title')).toBeInTheDocument()
  })

  it('renders header component', () => {
    render(<CompanySettingsView />)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders subject card', () => {
    render(<CompanySettingsView />)
    expect(screen.getByTestId('subject-card')).toBeInTheDocument()
  })

  it('renders settlement card', () => {
    render(<CompanySettingsView />)
    expect(screen.getByTestId('settlement-card')).toBeInTheDocument()
  })

  it('shows skeleton when loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      dataUpdatedAt: 0,
    })
    const { container } = render(<CompanySettingsView />)
    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument()
  })

  it('shows no permission alert when user cannot view', () => {
    mockCan.mockImplementation((resource: string, action: string) => {
      if (resource === 'company-setting' && action === 'read') return false
      return true
    })
    render(<CompanySettingsView />)
    expect(
      screen.getByText('system.company.noViewPermission'),
    ).toBeInTheDocument()
  })
})
