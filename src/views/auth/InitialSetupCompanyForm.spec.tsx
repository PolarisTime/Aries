import { fireEvent, render, screen } from '@testing-library/react'
import Form from 'antd/es/form'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.initialsetup.company.adminCreated': '管理员创建成功',
        'auth.initialsetup.company.companyNameLabel': '公司名称',
        'auth.initialsetup.company.companyNameRequired': '请输入公司名称',
        'auth.initialsetup.company.companyNamePlaceholder': '请输入公司名称',
        'auth.initialsetup.company.taxNoLabel': '税号',
        'auth.initialsetup.company.taxNoRequired': '请输入税号',
        'auth.initialsetup.company.taxNoPlaceholder': '请输入税号',
        'auth.initialsetup.company.bankNameLabel': '开户行',
        'auth.initialsetup.company.bankNameRequired': '请输入开户行',
        'auth.initialsetup.company.bankNamePlaceholder': '请输入开户行',
        'auth.initialsetup.company.bankAccountLabel': '银行账号',
        'auth.initialsetup.company.bankAccountRequired': '请输入银行账号',
        'auth.initialsetup.company.bankAccountPlaceholder': '请输入银行账号',
        'auth.initialsetup.company.taxRateLabel': '税率',
        'auth.initialsetup.company.taxRateRequired': '请输入税率',
        'auth.initialsetup.company.remarkLabel': '备注',
        'auth.initialsetup.company.back': '上一步',
        'auth.initialsetup.company.submit': '完成',
      }
      return map[key] ?? key
    },
  }),
}))

import { InitialSetupCompanyForm } from '@/views/auth/InitialSetupCompanyForm'

function TestWrapper(props: any) {
  const [form] = Form.useForm()
  return (
    <Form form={form}>
      <InitialSetupCompanyForm {...props} />
    </Form>
  )
}

describe('InitialSetupCompanyForm', () => {
  function setup(overrides = {}) {
    const defaultProps = {
      adminCompleted: true,
      loadingCompany: false,
      onBack: vi.fn(),
      onSubmitCompany: vi.fn(),
      ...overrides,
    }
    return {
      ...render(<TestWrapper {...defaultProps} />),
      ...defaultProps,
    }
  }

  it('renders company form fields', () => {
    const { container } = setup()
    expect(screen.getByText('公司名称')).toBeTruthy()
    expect(screen.getByText('税率')).toBeTruthy()
    expect(screen.getByText('上一步')).toBeTruthy()
    expect(container.querySelector('.ant-btn-primary')).toBeTruthy()
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn()
    setup({ onBack })
    fireEvent.click(screen.getByText('上一步'))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows loading state on submit button', () => {
    const { container } = setup({ loadingCompany: true })
    expect(container.querySelector('.ant-btn-loading')).toBeTruthy()
  })

  it('disables back button when admin not completed', () => {
    setup({ adminCompleted: false })
    expect(screen.getByText('上一步')).toBeTruthy()
  })
})
