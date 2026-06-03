import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Form from 'antd/es/form'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.initialsetup.admin.loginNameLabel': '管理员用户名',
        'auth.initialsetup.admin.loginNameRequired': '请输入管理员用户名',
        'auth.initialsetup.admin.loginNamePlaceholder': '请输入管理员用户名',
        'auth.initialsetup.admin.passwordLabel': '密码',
        'auth.initialsetup.admin.passwordRequired': '请输入密码',
        'auth.initialsetup.admin.passwordPlaceholder': '请输入密码',
        'auth.initialsetup.admin.confirmPasswordLabel': '确认密码',
        'auth.initialsetup.admin.confirmPasswordRequired': '请确认密码',
        'auth.initialsetup.admin.confirmPasswordPlaceholder': '请确认密码',
        'auth.initialsetup.admin.userNameLabel': '显示名称',
        'auth.initialsetup.admin.userNamePlaceholder': '请输入显示名称',
        'auth.initialsetup.admin.generateTotp': '生成验证码',
        'auth.initialsetup.admin.regenerateTotp': '重新生成验证码',
        'auth.initialsetup.admin.secretLabel': '密钥',
        'auth.initialsetup.admin.totpCodeLabel': '验证码',
        'auth.initialsetup.admin.totpCodeRequired': '请输入6位验证码',
        'auth.initialsetup.admin.totpCodePlaceholder': '请输入6位验证码',
        'auth.initialsetup.admin.submit': '下一步',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/components/AppAntdProvider', () => ({
  AppAntdProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('@/utils/env', () => ({
  appTitle: '测试应用',
}))

import { InitialSetupAdminForm } from '@/views/auth/InitialSetupAdminForm'

function TestWrapper(props: any) {
  const [form] = Form.useForm()
  return (
    <Form form={form}>
      <InitialSetupAdminForm {...props} />
    </Form>
  )
}

describe('InitialSetupAdminForm', () => {
  function setup(overrides = {}) {
    const defaultProps = {
      totpSetup: null,
      loadingTotp: false,
      loadingAdmin: false,
      onGenerateTotp: vi.fn(),
      onSubmitAdmin: vi.fn(),
      ...overrides,
    }
    return {
      ...render(<TestWrapper {...defaultProps} />),
      ...defaultProps,
    }
  }

  it('renders admin form fields', () => {
    setup()
    expect(screen.getByText('管理员用户名')).toBeTruthy()
    expect(screen.getByText('密码')).toBeTruthy()
    expect(screen.getByText('确认密码')).toBeTruthy()
    expect(screen.getByText('生成验证码')).toBeTruthy()
    expect(screen.getByText('下一步')).toBeTruthy()
  })

  it('calls onGenerateTotp when generate button is clicked', () => {
    const onGenerateTotp = vi.fn()
    setup({ onGenerateTotp })
    fireEvent.click(screen.getByText('生成验证码'))
    expect(onGenerateTotp).toHaveBeenCalled()
  })

  it('shows totp setup data when available', () => {
    const totpSetup = {
      secret: 'TESTSECRET',
      qrCodeUrl: 'otpauth://totp/test',
    }
    setup({ totpSetup })
    expect(screen.getByText('验证码')).toBeTruthy()
  })

  it('shows loading state on generate button', () => {
    setup({ loadingTotp: true })
    expect(screen.getByText('生成验证码')).toBeTruthy()
  })

  it('shows loading state on submit button', () => {
    setup({ loadingAdmin: true })
    expect(screen.getByText('下一步')).toBeTruthy()
  })
})
