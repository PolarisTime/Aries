import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.initialsetup.checking': '检查中...',
        'auth.initialsetup.completedTitle': '初始化已完成',
        'auth.initialsetup.guideTitle': '系统初始化向导',
        'auth.initialsetup.adminStep': '管理员设置',
        'auth.initialsetup.companyStep': '公司设置',
        'auth.initialsetup.defaultAdminUserName': 'admin',
        'auth.initialsetup.setupTokenLabel': '初始化凭证',
        'auth.initialsetup.setupTokenPlaceholder': '请输入部署初始化凭证',
        'auth.initialsetup.setupTokenRequired': '请输入初始化凭证',
        'auth.initialsetup.setupTokenInvalid': '初始化凭证格式无效',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/components/AppAntdProvider', () => ({
  AppAntdProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="antd-provider">{children}</div>
  ),
}))

vi.mock('@/utils/env', () => ({
  appTitle: '测试应用',
}))

vi.mock('antd', () => {
  const Form = ({ children, ...props }: any) => (
    <form {...props}>{children}</form>
  )
  Form.useForm = () => [{ __INTERNAL__: { name: '' } }]
  Form.Item = ({ children, name, rules, ...props }: any) => (
    <div
      data-testid={`form-item-${name}`}
      data-pattern={rules?.find((rule: any) => rule.pattern)?.pattern?.source}
      {...props}
    >
      {children}
    </div>
  )
  const Input = (props: Record<string, unknown>) => <input {...props} />
  Input.Password = (props: Record<string, unknown>) => (
    <input type="password" {...props} />
  )

  return {
    Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Flex: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Form,
    Input,
    Layout: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Result: ({ title, ...props }: any) => <div {...props}>{title}</div>,
    Space: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Spin: ({ children, description, tip, ...props }: any) => (
      <div {...props}>
        {description ?? tip}
        {children}
      </div>
    ),
    Steps: ({ items, ...props }: any) => (
      <div {...props}>
        {items?.map((item: any) => (
          <div key={item.key ?? item.title}>{item.title}</div>
        ))}
      </div>
    ),
    Typography: {
      Title: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
      Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
  }
})

vi.mock('antd/es/form', () => {
  const Form = ({ children, ...props }: any) => (
    <form {...props}>{children}</form>
  )
  Form.useForm = () => [{ __INTERNAL__: { name: '' } }]
  Form.Item = ({ children, name, rules, ...props }: any) => (
    <div
      data-testid={`form-item-${name}`}
      data-pattern={rules?.find((rule: any) => rule.pattern)?.pattern?.source}
      {...props}
    >
      {children}
    </div>
  )
  return { default: Form }
})

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/flex', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/result', () => ({
  default: ({ title, ...props }: any) => <div {...props}>{title}</div>,
}))

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children, tip, ...props }: any) => (
    <div {...props}>
      {tip}
      {children}
    </div>
  ),
}))

vi.mock('antd/es/steps', () => ({
  default: ({ items, ...props }: any) => (
    <div {...props}>
      {items?.map((item: any) => (
        <div key={item.key ?? item.title}>{item.title}</div>
      ))}
    </div>
  ),
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Title: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

const createInitialSetupState = () => ({
  adminCompleted: false,
  checking: false,
  currentStep: 'admin',
  form: {},
  handleGenerateTotp: vi.fn(),
  handleSubmitAdmin: vi.fn(),
  handleSubmitCompany: vi.fn(),
  loadingAdmin: false,
  loadingCompany: false,
  loadingTotp: false,
  setCurrentStep: vi.fn(),
  status: { setupRequired: true },
  totpSetup: null,
})

const mockUseInitialSetupState = vi
  .fn()
  .mockReturnValue(createInitialSetupState())

vi.mock('@/views/auth/useInitialSetupState', () => ({
  SETUP_TOKEN_PATTERN: /^[A-Za-z0-9_-]{43}=?$/,
  useInitialSetupState: (...args: unknown[]) =>
    mockUseInitialSetupState(...args),
}))

vi.mock('@/views/auth/InitialSetupAdminForm', () => ({
  InitialSetupAdminForm: ({
    loadingAdmin,
    loadingTotp,
    onGenerateTotp,
    onSubmitAdmin,
    totpSetup,
  }: any) => (
    <div data-testid="admin-form">
      <span data-testid="admin-loading">{String(loadingAdmin)}</span>
      <span data-testid="totp-loading">{String(loadingTotp)}</span>
      <span data-testid="totp-secret">{totpSetup?.secret ?? 'none'}</span>
      <button type="button" onClick={onGenerateTotp}>
        生成验证码
      </button>
      <button type="button" onClick={onSubmitAdmin}>
        提交管理员
      </button>
    </div>
  ),
}))

vi.mock('@/views/auth/InitialSetupCompanyForm', () => ({
  InitialSetupCompanyForm: ({
    adminCompleted,
    loadingCompany,
    onBack,
    onSubmitCompany,
  }: any) => (
    <div data-testid="company-form">
      <span data-testid="admin-completed">{String(adminCompleted)}</span>
      <span data-testid="company-loading">{String(loadingCompany)}</span>
      <button type="button" onClick={onBack}>
        返回管理员
      </button>
      <button type="button" onClick={onSubmitCompany}>
        提交公司
      </button>
    </div>
  ),
}))

import { InitialSetupView } from '@/views/auth/InitialSetupView'

describe('InitialSetupView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseInitialSetupState.mockReturnValue(createInitialSetupState())
  })

  it('renders admin form on first step', () => {
    render(<InitialSetupView />)
    expect(screen.getByTestId('admin-form')).toBeTruthy()
    expect(screen.getByPlaceholderText('请输入部署初始化凭证')).toHaveAttribute(
      'type',
      'password',
    )
    expect(screen.getByTestId('form-item-setupToken')).toHaveAttribute(
      'data-pattern',
      '^[A-Za-z0-9_-]{43}=?$',
    )
    expect(screen.getByText('系统初始化向导')).toBeTruthy()
    expect(screen.getByText('管理员设置')).toBeTruthy()
    expect(screen.getByText('公司设置')).toBeTruthy()
  })

  it('renders checking state', () => {
    mockUseInitialSetupState.mockReturnValueOnce({
      checking: true,
      status: null,
    })
    render(<InitialSetupView />)
    expect(screen.getByText('检查中...')).toBeTruthy()
  })

  it('renders completed state when setup not required', () => {
    mockUseInitialSetupState.mockReturnValueOnce({
      checking: false,
      status: { setupRequired: false },
    })
    render(<InitialSetupView />)
    expect(screen.getByText('初始化已完成')).toBeTruthy()
  })

  it('passes admin state and wires admin actions', () => {
    const handleGenerateTotp = vi.fn()
    const handleSubmitAdmin = vi.fn()
    mockUseInitialSetupState.mockReturnValueOnce({
      ...createInitialSetupState(),
      handleGenerateTotp,
      handleSubmitAdmin,
      loadingAdmin: true,
      loadingTotp: true,
      totpSetup: { secret: 'SECRET' },
    })

    render(<InitialSetupView />)

    expect(screen.getByTestId('admin-loading')).toHaveTextContent('true')
    expect(screen.getByTestId('totp-loading')).toHaveTextContent('true')
    expect(screen.getByTestId('totp-secret')).toHaveTextContent('SECRET')

    fireEvent.click(screen.getByText('生成验证码'))
    fireEvent.click(screen.getByText('提交管理员'))

    expect(handleGenerateTotp).toHaveBeenCalledTimes(1)
    expect(handleSubmitAdmin).toHaveBeenCalledTimes(1)
  })

  it('renders company step and wires company actions', () => {
    const handleSubmitCompany = vi.fn()
    const setCurrentStep = vi.fn()
    mockUseInitialSetupState.mockReturnValueOnce({
      ...createInitialSetupState(),
      adminCompleted: true,
      currentStep: 'company',
      handleSubmitCompany,
      loadingCompany: true,
      setCurrentStep,
    })

    render(<InitialSetupView />)

    expect(screen.getByTestId('company-form')).toBeTruthy()
    expect(screen.getByTestId('admin-completed')).toHaveTextContent('true')
    expect(screen.getByTestId('company-loading')).toHaveTextContent('true')
    expect(screen.getByPlaceholderText('请输入部署初始化凭证')).toHaveAttribute(
      'type',
      'password',
    )

    fireEvent.click(screen.getByText('返回管理员'))
    fireEvent.click(screen.getByText('提交公司'))

    expect(setCurrentStep).toHaveBeenCalledWith('admin')
    expect(handleSubmitCompany).toHaveBeenCalledTimes(1)
  })
})
