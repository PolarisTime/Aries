import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Form from 'antd/es/form'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.loginform.step': '第一步',
        'auth.loginform.title': '登录',
        'auth.loginform.description': '请输入账号密码',
        'auth.loginform.loginNameLabel': '用户名',
        'auth.loginform.loginNameRequired': '请输入用户名',
        'auth.loginform.loginNamePlaceholder': '请输入用户名',
        'auth.loginform.passwordLabel': '密码',
        'auth.loginform.passwordRequired': '请输入密码',
        'auth.loginform.passwordPlaceholder': '请输入密码',
        'auth.loginform.remember': '记住我',
        'auth.loginform.submit': '登录',
      }
      return map[key] ?? key
    },
  }),
}))

import { LoginPasswordForm } from '@/views/auth/LoginPasswordForm'

function TestWrapper({ children, ...props }: any) {
  const [form] = Form.useForm()
  return (
    <LoginPasswordForm form={form} {...props}>
      {children}
    </LoginPasswordForm>
  )
}

describe('LoginPasswordForm', () => {
  function setup(overrides = {}) {
    const defaultProps = {
      loading: false,
      onSubmit: vi.fn(),
      savedLoginName: '',
      ...overrides,
    }
    return {
      ...render(<TestWrapper {...defaultProps} />),
      ...defaultProps,
    }
  }

  it('renders login form with all fields', () => {
    setup()
    expect(screen.getByText('登录')).toBeTruthy()
    expect(screen.getByLabelText('用户名')).toBeTruthy()
    expect(screen.getByLabelText('密码')).toBeTruthy()
    expect(screen.getByText('记住我')).toBeTruthy()
    expect(document.querySelector('.login-submit-btn')).toBeTruthy()
  })

  it('displays saved login name as initial value', () => {
    setup({ savedLoginName: 'testuser' })
    const input = screen.getByLabelText('用户名') as HTMLInputElement
    expect(input.value).toBe('testuser')
  })

  it('calls onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn()
    setup({ onSubmit })
    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    fireEvent.change(usernameInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    const submitButton = document.querySelector('.login-submit-btn')!
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          loginName: 'admin',
          password: 'password123',
          remember: true,
        }),
      )
    })
  })

  it('shows loading state when loading prop is true', () => {
    setup({ loading: true })
    expect(document.querySelector('.login-submit-btn')).toBeTruthy()
  })

  it('validates required fields', async () => {
    const onSubmit = vi.fn()
    setup({ onSubmit })
    const submitButton = document.querySelector('.login-submit-btn')!
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})
