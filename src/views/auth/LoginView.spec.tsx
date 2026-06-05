import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const {
  mockNavigate,
  mockSignIn,
  mockVerify2fa,
  mockShowError,
  mockStart2faStep,
  mockReset2faStep,
  mockSetTotpCode,
  mockClearTotpSession,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSignIn: vi.fn(),
  mockVerify2fa: vi.fn(),
  mockShowError: vi.fn(),
  mockStart2faStep: vi.fn(),
  mockReset2faStep: vi.fn(),
  mockSetTotpCode: vi.fn(),
  mockClearTotpSession: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.loginSuccess': '登录成功',
        'auth.loginFailed': '登录失败',
        'auth.loginview.forceTotpSetupSuccess': '请设置双因素认证',
        'auth.loginview.codeInvalid': '验证码无效',
        'auth.twofactormodal.verifyFailed': '验证失败',
        'auth.setup2fa.currentUserFallback': '当前用户',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      signIn: mockSignIn,
      verify2fa: mockVerify2fa,
    }
    return selector(state)
  },
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/views/auth/login-view-utils', () => ({
  buildPostLoginTarget: vi.fn(() => '/'),
  clearTotpSession: mockClearTotpSession,
  requiresForcedTotpSetup: vi.fn(() => false),
}))

vi.mock('@/views/auth/useLoginTotpSession', () => ({
  useLoginTotpSession: () => ({
    loginStep: 'password',
    now: Date.now(),
    reset2faStep: mockReset2faStep,
    savedSession: null,
    setTotpCode: mockSetTotpCode,
    start2faStep: mockStart2faStep,
    stepDeadline: 0,
    tempToken: null,
    totpCode: '',
  }),
}))

vi.mock('@/views/auth/AuthPageShell', () => ({
  AuthPageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-shell">{children}</div>
  ),
}))

vi.mock('@/views/auth/LoginPasswordForm', () => ({
  LoginPasswordForm: ({
    onSubmit,
  }: {
    onSubmit: (values: Record<string, unknown>) => void
  }) => (
    <button
      data-testid="password-form"
      onClick={() =>
        onSubmit({ loginName: 'admin', password: 'pass123', remember: true })
      }
    >
      提交登录
    </button>
  ),
}))

vi.mock('@/views/auth/LoginTotpPanel', () => ({
  LoginTotpPanel: () => <div data-testid="totp-panel">TOTP面板</div>,
}))

import { LoginView } from '@/views/auth/LoginView'

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders password form by default', () => {
    render(<LoginView />)
    expect(screen.getByTestId('password-form')).toBeTruthy()
  })

  it('renders auth page shell', () => {
    render(<LoginView />)
    expect(screen.getByTestId('auth-shell')).toBeTruthy()
  })

  it('calls signIn on login submit', async () => {
    mockSignIn.mockResolvedValue({ user: { id: '1' }, requires2fa: false })
    render(<LoginView />)
    const submitButton = screen.getByTestId('password-form')
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        loginName: 'admin',
        password: 'pass123',
        remember: true,
      })
    })
  })

  it('navigates after successful login', async () => {
    mockSignIn.mockResolvedValue({ user: { id: '1' }, requires2fa: false })
    render(<LoginView />)
    const submitButton = screen.getByTestId('password-form')
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('shows error on login failure', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'))
    render(<LoginView />)
    const submitButton = screen.getByTestId('password-form')
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled()
    })
  })

  it('starts 2FA step when required', async () => {
    mockSignIn.mockResolvedValue({
      requires2fa: true,
      tempToken: 'temp123',
    })
    render(<LoginView />)
    const submitButton = screen.getByTestId('password-form')
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(mockStart2faStep).toHaveBeenCalledWith('temp123', 'admin')
    })
  })
})
