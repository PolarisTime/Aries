import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
  Form.Item = ({ children, ...props }: any) => <div {...props}>{children}</div>

  return {
    Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Flex: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Form,
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
  Form.Item = ({ children, ...props }: any) => <div {...props}>{children}</div>
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

const mockUseInitialSetupState = vi.fn().mockReturnValue({
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

vi.mock('@/views/auth/useInitialSetupState', () => ({
  useInitialSetupState: (...args: unknown[]) =>
    mockUseInitialSetupState(...args),
}))

vi.mock('@/views/auth/InitialSetupAdminForm', () => ({
  InitialSetupAdminForm: () => <div data-testid="admin-form">管理员表单</div>,
}))

vi.mock('@/views/auth/InitialSetupCompanyForm', () => ({
  InitialSetupCompanyForm: () => <div data-testid="company-form">公司表单</div>,
}))

import { InitialSetupView } from '@/views/auth/InitialSetupView'

describe('InitialSetupView', () => {
  it('renders admin form on first step', () => {
    render(<InitialSetupView />)
    expect(screen.getByTestId('admin-form')).toBeTruthy()
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
})
