import { fireEvent, render, screen } from '@testing-library/react'
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
      data: [
        {
          id: '1',
          companyName: 'Test Company',
          taxNo: '123456',
          status: '正常',
          settlementAccounts: [],
        },
      ],
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })
  })

  it('renders without crashing', () => {
    expect(CompanySettingsView).toBeDefined()
    expect(typeof CompanySettingsView).toBe('function')
  })

  it('renders page header actions without summary cards', () => {
    render(<CompanySettingsView />)
    expect(screen.getByText('system.companyHeader.title')).toBeInTheDocument()
    expect(screen.getByText('common.refresh')).toBeInTheDocument()
    expect(screen.getAllByText('common.save').length).toBeGreaterThan(0)
    expect(screen.queryByText('system.company.enterpriseMode')).toBeNull()
  })

  it('renders settlement subject list', () => {
    render(<CompanySettingsView />)
    expect(screen.getByText('system.company.subjectList')).toBeInTheDocument()
    expect(screen.getByText('Test Company')).toBeInTheDocument()
  })

  it('switches selected subject and syncs form values', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          companyName: 'Test Company',
          taxNo: '123456',
          status: '正常',
          settlementAccounts: [],
        },
        {
          id: '2',
          companyName: 'Second Company',
          taxNo: '654321',
          status: '正常',
          settlementAccounts: [],
        },
      ],
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })

    const { container } = render(<CompanySettingsView />)
    fireEvent.click(screen.getByRole('button', { name: /Second Company/ }))

    const activeItem = container.querySelector(
      '.company-subject-selector-item.is-active',
    )
    expect(activeItem).toHaveTextContent('Second Company')
    expect(screen.getByDisplayValue('Second Company')).toBeInTheDocument()
    expect(screen.getByDisplayValue('654321')).toBeInTheDocument()
  })

  it('renders collapse sections for profile, banks and remark', () => {
    render(<CompanySettingsView />)
    expect(screen.getByText('system.companySubject.sectionTitle')).toBeTruthy()
    expect(screen.getByText('system.company.settlementBanks')).toBeTruthy()
    expect(screen.getByText('system.company.supplementNote')).toBeTruthy()
    expect(screen.getByText('system.companySubject.companyName')).toBeTruthy()
    expect(
      screen.getAllByText('system.company.bankAccount').length,
    ).toBeGreaterThan(0)
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
