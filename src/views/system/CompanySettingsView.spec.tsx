import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Form } from 'antd'
import type { MouseEventHandler, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const {
  mockUseQuery,
  mockCan,
  mockUseQueryClient,
  mockUseMutation,
  mockValidateForm,
  mockShowError,
  mockMessageSuccess,
  mockMessageWarning,
} = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockCan: vi.fn(),
  mockUseQueryClient: vi.fn(),
  mockUseMutation: vi.fn(),
  mockValidateForm: vi.fn(),
  mockShowError: vi.fn(),
  mockMessageSuccess: vi.fn(),
  mockMessageWarning: vi.fn(),
}))

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
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: mockMessageSuccess, warning: mockMessageWarning },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('@/lib/antd-form', () => ({
  validateForm: (...args: unknown[]) => mockValidateForm(...args),
  getFormString: () => '',
}))

import { CompanySettingsView } from '@/views/system/CompanySettingsView'

type CompanySettingFixture = {
  id: string
  companyName: string
  taxNo: string
  status: string
  settlementAccounts: Record<string, unknown>[]
  remark?: string
}

function createCompanyFixture(
  overrides: Partial<CompanySettingFixture> = {},
): CompanySettingFixture {
  return {
    id: '1',
    companyName: 'Test Company',
    taxNo: '123456',
    status: '正常',
    settlementAccounts: [],
    ...overrides,
  }
}

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
    mockValidateForm.mockResolvedValue({
      companyName: ' Saved Company ',
      taxNo: ' TAX-1 ',
      status: '',
      remark: ' Remark ',
      settlementAccounts: [],
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

  it('switches selected subject and syncs form values', async () => {
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
    const secondCompanyButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.company-subject-selector-main',
      ),
    ).find((button) => button.textContent?.includes('Second Company'))

    expect(secondCompanyButton).toBeDefined()
    fireEvent.click(secondCompanyButton as HTMLButtonElement)

    await waitFor(() => {
      const activeItem = container.querySelector(
        '.company-subject-selector-item.is-active',
      )
      const inputValues = Array.from(
        container.querySelectorAll<HTMLInputElement>('input'),
        (input) => input.value,
      )

      expect(activeItem).toHaveTextContent('Second Company')
      expect(inputValues).toContain('Second Company')
      expect(inputValues).toContain('654321')
    })
  }, 20000)

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

  it('refreshes company settings from the header action', () => {
    const invalidateQueries = vi.fn()
    mockUseQueryClient.mockReturnValue({
      invalidateQueries,
      setQueryData: vi.fn(),
    })

    render(<CompanySettingsView />)
    fireEvent.click(screen.getByText('common.refresh'))

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: expect.any(Array),
    })
  })

  it('creates a draft subject from the empty state', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })

    render(<CompanySettingsView />)
    fireEvent.click(screen.getAllByText('system.company.addSubject')[0])

    expect(screen.getAllByText('common.save').length).toBeGreaterThan(0)
  })

  it('disables save actions when user has no edit permission', () => {
    mockCan.mockImplementation((resource: string, action: string) => {
      if (resource === 'company-setting' && action === 'update') return false
      return true
    })

    render(<CompanySettingsView />)
    const saveButton = screen.getByText('common.save').closest('button')

    expect(saveButton).toBeDisabled()
    expect(mockValidateForm).not.toHaveBeenCalled()
  })

  it('renders subject fallback labels when create and delete actions are denied', () => {
    mockCan.mockImplementation((resource: string, action: string) => {
      if (
        resource === 'company-setting' &&
        (action === 'create' || action === 'delete')
      ) {
        return false
      }
      return true
    })
    mockUseQuery.mockReturnValue({
      data: [
        createCompanyFixture({
          companyName: '',
          taxNo: '',
          status: '',
        }),
      ],
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })

    render(<CompanySettingsView />)

    expect(
      screen.getByText('system.companySubject.pendingCompany'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.companySubject.pendingTaxNo'),
    ).toBeInTheDocument()
    expect(screen.getByText('正常')).toBeInTheDocument()
    expect(screen.queryByText('system.company.addSubject')).toBeNull()
    expect(screen.queryByLabelText('system.company.deleteSubject')).toBeNull()
  })

  it('renders empty subject state without create action when creation is denied', () => {
    mockCan.mockImplementation((resource: string, action: string) => {
      if (resource === 'company-setting' && action === 'create') return false
      return true
    })
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })

    render(<CompanySettingsView />)

    expect(screen.getAllByText('system.company.noSubjects').length).toBe(2)
    expect(screen.queryByText('system.company.addSubject')).toBeNull()
  })

  it('adds and removes settlement account rows from table controls', async () => {
    const { container } = render(<CompanySettingsView />)
    const collapseAddButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find(
      (button) =>
        button.textContent?.includes('system.company.addBank') &&
        !button.closest('.ant-empty'),
    )

    expect(collapseAddButton).toBeDefined()
    fireEvent.click(collapseAddButton as HTMLButtonElement)

    await waitFor(() => {
      expect(
        container.querySelector('.company-settings-table-form-item'),
      ).toBeInTheDocument()
    })

    const bankSection = container.querySelector(
      '.company-settings-bank-section',
    )
    const rowDeleteButton = Array.from(
      bankSection?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => button.className.includes('ant-btn-dangerous'))
    expect(rowDeleteButton).toBeDefined()
    fireEvent.click(rowDeleteButton as HTMLButtonElement)

    await waitFor(() => {
      expect(
        screen.getByText('system.company.noSettlementAccounts'),
      ).toBeInTheDocument()
    })

    const emptyAddButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find(
      (button) =>
        button.textContent?.includes('system.company.addBank') &&
        button.closest('.ant-empty'),
    )
    expect(emptyAddButton).toBeDefined()
    fireEvent.click(emptyAddButton as HTMLButtonElement)

    await waitFor(() => {
      expect(
        container.querySelector('.company-settings-table-form-item'),
      ).toBeInTheDocument()
    })
  })

  it('adds settlement account rows when current form value is not an array', async () => {
    const realUseForm = Form.useForm
    const formInstances: ReturnType<typeof Form.useForm>[0][] = []
    const useFormSpy = vi.spyOn(Form, 'useForm').mockImplementation(() => {
      const [form] = realUseForm()
      formInstances.push(form)
      return [form]
    })

    try {
      const { container } = render(<CompanySettingsView />)
      await waitFor(() => {
        expect(formInstances[0]).toBeDefined()
      })
      act(() => {
        formInstances[0].setFieldValue('settlementAccounts', 'stale')
      })

      const collapseAddButton = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).find(
        (button) =>
          button.textContent?.includes('system.company.addBank') &&
          !button.closest('.ant-empty'),
      )

      expect(collapseAddButton).toBeDefined()
      fireEvent.click(collapseAddButton as HTMLButtonElement)

      await waitFor(() => {
        expect(formInstances[0].getFieldValue('settlementAccounts')).toEqual([
          expect.objectContaining({
            accountName: '',
            bankAccount: '',
          }),
        ])
      })
    } finally {
      useFormSpy.mockRestore()
    }
  })

  it('renders settlement account rows with normalized fallback values', () => {
    mockUseQuery.mockReturnValue({
      data: [
        createCompanyFixture({
          settlementAccounts: [
            {
              id: null,
              accountName: null,
              bankName: 'Bank',
              bankAccount: '002',
              usageType: '',
              status: '',
              remark: null,
            },
          ],
        }),
      ],
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })

    const rendered = render(<CompanySettingsView />)
    const inputValues = Array.from(
      rendered.container.querySelectorAll<HTMLInputElement>('input'),
      (input) => input.value,
    )

    expect(inputValues).toContain('Bank')
    expect(inputValues).toContain('002')
  })

  it('confirms subject deletion from the subject list action', async () => {
    const saveMutate = vi.fn()
    const deleteMutate = vi.fn()
    mockUseMutation
      .mockReturnValueOnce({ mutate: saveMutate, isPending: false })
      .mockReturnValueOnce({ mutate: deleteMutate, isPending: false })

    render(<CompanySettingsView />)
    fireEvent.click(screen.getByLabelText('system.company.deleteSubject'))

    await waitFor(() => {
      expect(screen.getByText('common.confirm')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('common.confirm'))

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('1')
    })
  })

  it('passes pending delete variables to the matching subject action', () => {
    mockUseMutation
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: false })
      .mockReturnValueOnce({
        mutate: vi.fn(),
        isPending: true,
        variables: '1',
      })

    render(<CompanySettingsView />)

    expect(screen.getByLabelText('system.company.deleteSubject')).toHaveClass(
      'ant-btn-loading',
    )
  })

  it('handles pending delete state without mutation variables', () => {
    mockUseMutation
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: false })
      .mockReturnValueOnce({
        mutate: vi.fn(),
        isPending: true,
        variables: undefined,
      })

    render(<CompanySettingsView />)

    expect(
      screen.getByLabelText('system.company.deleteSubject'),
    ).not.toHaveClass('ant-btn-loading')
  })

  it('submits from the footer save action with blank bank account rows', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({ mutate, isPending: false })
    mockValidateForm.mockResolvedValue({
      companyName: 'Company',
      taxNo: 'TAX',
      status: '正常',
      settlementAccounts: [
        {
          accountName: 'Cash',
          bankName: '',
          bankAccount: '',
          remark: '',
        },
      ],
    })

    render(<CompanySettingsView />)
    const saveButtons = screen.getAllByText('common.save')
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: 'Company' }),
      )
    })
  })

  it('submits when validated values omit settlement accounts', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({ mutate, isPending: false })
    mockValidateForm.mockResolvedValue({
      companyName: 'Company',
      taxNo: 'TAX',
      status: '正常',
    })

    render(<CompanySettingsView />)
    fireEvent.click(screen.getAllByText('common.save')[0])

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: 'Company' }),
      )
    })
  })

  it('warns when duplicate bank accounts are submitted', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({ mutate, isPending: false })
    mockValidateForm.mockResolvedValue({
      companyName: 'Company',
      taxNo: 'TAX',
      status: '正常',
      settlementAccounts: [
        {
          id: '',
          accountName: 'A',
          bankName: 'Bank',
          bankAccount: '001',
          usageType: '',
          status: '',
          remark: '',
        },
        {
          accountName: 'B',
          bankName: 'Bank',
          bankAccount: '001',
          remark: '',
        },
      ],
    })

    render(<CompanySettingsView />)
    fireEvent.click(screen.getAllByText('common.save')[0])

    await waitFor(() => {
      expect(mockMessageWarning).toHaveBeenCalledWith(
        'system.company.duplicateBankAccount',
      )
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits normalized values through the save mutation', async () => {
    const mutate = vi.fn()
    mockUseMutation.mockReturnValue({ mutate, isPending: false })
    mockValidateForm.mockResolvedValue({
      companyName: ' Company ',
      taxNo: ' TAX ',
      status: '',
      remark: ' Remark ',
      settlementAccounts: [
        {
          id: '',
          accountName: '',
          bankName: '',
          bankAccount: '',
          usageType: '',
          status: '',
          remark: '',
        },
        {
          id: 12,
          accountName: ' Main ',
          bankName: ' Bank ',
          bankAccount: '002',
          usageType: '',
          status: '',
          remark: ' Note ',
        },
      ],
    })

    render(<CompanySettingsView />)
    fireEvent.click(screen.getAllByText('common.save')[0])

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: ' Company ',
          settlementAccounts: expect.any(Array),
        }),
      )
    })
  })

  it('handles save and delete mutation callbacks', () => {
    const invalidateQueries = vi.fn()
    const saveMutate = vi.fn()
    const deleteMutate = vi.fn()
    mockUseQueryClient.mockReturnValue({
      invalidateQueries,
      setQueryData: vi.fn(),
    })
    mockUseMutation
      .mockReturnValueOnce({
        mutate: saveMutate,
        isPending: false,
      })
      .mockReturnValueOnce({
        mutate: deleteMutate,
        isPending: false,
      })

    render(<CompanySettingsView />)

    const saveOptions = mockUseMutation.mock.calls[0][0]
    const deleteOptions = mockUseMutation.mock.calls[1][0]
    saveOptions.onSuccess({ id: 'saved-id' })
    saveOptions.onSuccess({})
    deleteOptions.onSuccess(undefined, '1')
    deleteOptions.onSuccess(undefined, 'other')
    saveOptions.onError(new Error('save failed'))
    deleteOptions.onError(new Error('delete failed'))

    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.deleteSuccess')
    expect(invalidateQueries).toHaveBeenCalled()
    expect(mockShowError).toHaveBeenCalledWith(
      expect.any(Error),
      'api.saveCompanyInfoFailed',
    )
    expect(mockShowError).toHaveBeenCalledWith(
      expect.any(Error),
      'common.deleteConfirm',
    )
  })

  it('normalizes create and update payloads in mutation functions', async () => {
    const createResult = { id: 'created-id' }
    const updateResult = { id: 'updated-id' }
    const createCompanySetting = vi.fn().mockResolvedValue(createResult)
    const updateCompanySetting = vi.fn().mockResolvedValue(updateResult)

    vi.doMock('@/api/company-settings', () => ({
      createCompanySetting,
      deleteCompanySetting: vi.fn(),
      listCompanySettings: vi.fn(),
      updateCompanySetting,
    }))
    vi.resetModules()
    const { CompanySettingsView: IsolatedCompanySettingsView } = await import(
      '@/views/system/CompanySettingsView'
    )
    render(<IsolatedCompanySettingsView />)

    const updateOptions = mockUseMutation.mock.calls[0][0]
    await expect(
      updateOptions.mutationFn({
        companyName: ' Company ',
        taxNo: ' TAX ',
        status: '',
        remark: ' Remark ',
        settlementAccounts: [
          {
            id: '',
            accountName: '',
            bankName: '',
            bankAccount: '',
            usageType: '',
            status: '',
            remark: '',
          },
          {
            id: 12,
            accountName: ' Main ',
            bankName: ' Bank ',
            bankAccount: '002',
            usageType: '',
            status: '',
            remark: ' Note ',
          },
        ],
      }),
    ).resolves.toEqual(updateResult)
    await expect(
      updateOptions.mutationFn({
        companyName: ' Empty Accounts ',
        taxNo: ' EMPTY ',
        status: '正常',
      }),
    ).resolves.toEqual(updateResult)

    expect(updateCompanySetting).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        companyName: 'Company',
        taxNo: 'TAX',
        status: '正常',
        remark: 'Remark',
        settlementAccounts: [
          {
            id: '12',
            accountName: 'Main',
            bankName: 'Bank',
            bankAccount: '002',
            usageType: '通用',
            status: '正常',
            remark: 'Note',
          },
        ],
      }),
    )
    expect(updateCompanySetting).toHaveBeenLastCalledWith(
      '1',
      expect.objectContaining({
        companyName: 'Empty Accounts',
        settlementAccounts: [],
      }),
    )

    mockUseMutation.mockClear()
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      dataUpdatedAt: Date.now(),
    })
    render(<IsolatedCompanySettingsView />)
    fireEvent.click(screen.getAllByText('system.company.addSubject')[0])
    await waitFor(() => {
      expect(mockUseMutation.mock.calls.length).toBeGreaterThanOrEqual(4)
    })
    const createOptions = mockUseMutation.mock.calls.at(-2)?.[0]
    await expect(
      createOptions.mutationFn({
        companyName: ' New Company ',
        taxNo: ' NEW ',
        status: '停用',
        settlementAccounts: [],
      }),
    ).resolves.toEqual(createResult)

    expect(createCompanySetting).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'New Company',
        taxNo: 'NEW',
        status: '停用',
      }),
    )
    vi.doUnmock('@/api/company-settings')
  })

  it('warns when save is invoked without edit permission', async () => {
    type MockButtonProps = {
      children?: ReactNode
      onClick?: MouseEventHandler<HTMLButtonElement>
      'aria-label'?: string
    }

    vi.doMock('antd', async (importOriginal) => {
      const actual = await importOriginal<typeof import('antd')>()
      return {
        ...actual,
        Button: ({
          children,
          onClick,
          'aria-label': ariaLabel,
        }: MockButtonProps) => (
          <button type="button" aria-label={ariaLabel} onClick={onClick}>
            {children}
          </button>
        ),
      }
    })
    vi.resetModules()
    mockCan.mockImplementation((resource: string, action: string) => {
      if (resource === 'company-setting' && action === 'update') return false
      return true
    })
    const { CompanySettingsView: IsolatedCompanySettingsView } = await import(
      '@/views/system/CompanySettingsView'
    )

    render(<IsolatedCompanySettingsView />)
    fireEvent.click(screen.getByText('common.save'))

    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(mockValidateForm).not.toHaveBeenCalled()
    vi.doUnmock('antd')
  })
})
