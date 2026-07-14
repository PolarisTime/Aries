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
  mockMessageSuccess,
  mockMessageError,
  mockRequiresForcedTotpSetup,
  mockTotpSession,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSignIn: vi.fn(),
  mockVerify2fa: vi.fn(),
  mockShowError: vi.fn(),
  mockStart2faStep: vi.fn(),
  mockReset2faStep: vi.fn(),
  mockSetTotpCode: vi.fn(),
  mockClearTotpSession: vi.fn(),
  mockMessageSuccess: vi.fn(),
  mockMessageError: vi.fn(),
  mockRequiresForcedTotpSetup: vi.fn(() => false),
  mockTotpSession: {
    loginStep: 'password',
    now: 1000,
    savedSession: null,
    loginRemember: true,
    stepDeadline: 0,
    tempToken: null,
    totpCode: '',
  },
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
  message: { success: mockMessageSuccess, error: mockMessageError },
}))

vi.mock('@/views/auth/login-view-utils', () => ({
  buildPostLoginTarget: vi.fn(() => '/'),
  clearTotpSession: mockClearTotpSession,
  requiresForcedTotpSetup: (...args: unknown[]) =>
    mockRequiresForcedTotpSetup(...args),
}))

vi.mock('@/views/auth/useLoginTotpSession', () => ({
  useLoginTotpSession: () => ({
    loginStep: mockTotpSession.loginStep,
    now: mockTotpSession.now,
    reset2faStep: mockReset2faStep,
    savedSession: mockTotpSession.savedSession,
    setTotpCode: mockSetTotpCode,
    start2faStep: mockStart2faStep,
    stepDeadline: mockTotpSession.stepDeadline,
    tempToken: mockTotpSession.tempToken,
    totpCode: mockTotpSession.totpCode,
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
        onSubmit({
          loginName: 'admin',
          password: 'pass123',
          remember: mockTotpSession.loginRemember,
        })
      }
    >
      提交登录
    </button>
  ),
}))

vi.mock('@/views/auth/LoginTotpPanel', () => ({
  LoginTotpPanel: ({
    activeLoginName,
    countdownText,
    isExpired,
    isExpiring,
    onBackToPassword,
    onTotpCodeChange,
    onVerify,
    totpCode,
  }: {
    activeLoginName: string
    countdownText: string
    isExpired: boolean
    isExpiring: boolean
    onBackToPassword: () => void
    onTotpCodeChange: (value: string) => void
    onVerify: () => void
    totpCode: string
  }) => (
    <div data-testid="totp-panel">
      <span data-testid="active-login-name">{activeLoginName}</span>
      <span data-testid="countdown">{countdownText}</span>
      <span data-testid="expired">{String(isExpired)}</span>
      <span data-testid="expiring">{String(isExpiring)}</span>
      <span data-testid="totp-code">{totpCode}</span>
      <button onClick={() => onTotpCodeChange('123456')}>修改验证码</button>
      <button onClick={onBackToPassword}>返回密码</button>
      <button onClick={onVerify}>验证</button>
    </div>
  ),
}))

import { LoginView } from '@/views/auth/LoginView'

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockTotpSession, {
      loginStep: 'password',
      now: 1000,
      savedSession: null,
      loginRemember: true,
      stepDeadline: 0,
      tempToken: null,
      totpCode: '',
    })
    mockRequiresForcedTotpSetup.mockReturnValue(false)
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
      expect(mockStart2faStep).toHaveBeenCalledWith('temp123', 'admin', true)
    })
  })

  it('preserves a non-persistent login choice when starting 2FA', async () => {
    mockTotpSession.loginRemember = false
    mockSignIn.mockResolvedValue({
      requires2fa: true,
      tempToken: 'temp123',
    })

    render(<LoginView />)
    fireEvent.click(screen.getByTestId('password-form'))

    await waitFor(() => {
      expect(mockStart2faStep).toHaveBeenCalledWith('temp123', 'admin', false)
    })
  })

  it('shows forced totp setup success message after login', async () => {
    mockRequiresForcedTotpSetup.mockReturnValue(true)
    mockSignIn.mockResolvedValue({
      user: { forceTotpSetup: true },
      requires2fa: false,
    })

    render(<LoginView />)
    fireEvent.click(screen.getByTestId('password-form'))

    await waitFor(() => {
      expect(mockMessageSuccess).toHaveBeenCalledWith('请设置双因素认证')
      expect(mockClearTotpSession).toHaveBeenCalled()
    })
  })

  it('renders totp panel with saved login fallback, countdown and expiring state', () => {
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      now: 1000,
      savedSession: { loginName: ' saved-user ' },
      stepDeadline: 30_000,
      tempToken: 'temp',
      totpCode: '123456',
    })

    render(<LoginView />)

    expect(screen.getByTestId('totp-panel')).toBeInTheDocument()
    expect(screen.getByTestId('active-login-name')).toHaveTextContent(
      'saved-user',
    )
    expect(screen.getByTestId('countdown')).toHaveTextContent('00:29')
    expect(screen.getByTestId('expired')).toHaveTextContent('false')
    expect(screen.getByTestId('expiring')).toHaveTextContent('true')
    expect(screen.getByTestId('totp-code')).toHaveTextContent('123456')

    fireEvent.click(screen.getByText('修改验证码'))
    fireEvent.click(screen.getByText('返回密码'))

    expect(mockSetTotpCode).toHaveBeenCalledWith('123456')
    expect(mockReset2faStep).toHaveBeenCalledWith(false)
  })

  it('uses current user fallback and expired state when totp deadline has passed', () => {
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      now: 70_000,
      savedSession: null,
      stepDeadline: 60_000,
      tempToken: 'temp',
      totpCode: '',
    })

    render(<LoginView />)

    expect(screen.getByTestId('active-login-name')).toHaveTextContent(
      '当前用户',
    )
    expect(screen.getByTestId('countdown')).toHaveTextContent('00:00')
    expect(screen.getByTestId('expired')).toHaveTextContent('true')
    expect(screen.getByTestId('expiring')).toHaveTextContent('false')
  })

  it('rejects invalid totp code before verification', () => {
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      tempToken: 'temp',
      totpCode: '12',
    })

    render(<LoginView />)
    fireEvent.click(screen.getByText('验证'))

    expect(mockMessageError).toHaveBeenCalledWith('验证码无效')
    expect(mockVerify2fa).not.toHaveBeenCalled()
  })

  it('resets totp step when temp token is missing or expired', () => {
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      tempToken: null,
      totpCode: '123456',
    })
    const { rerender } = render(<LoginView />)
    fireEvent.click(screen.getByText('验证'))
    expect(mockReset2faStep).toHaveBeenCalledWith(true)

    mockReset2faStep.mockClear()
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      now: 70_000,
      stepDeadline: 60_000,
      tempToken: 'temp',
      totpCode: '123456',
    })
    rerender(<LoginView />)
    fireEvent.click(screen.getByText('验证'))
    expect(mockReset2faStep).toHaveBeenCalledWith(true)
  })

  it('verifies totp and navigates after success', async () => {
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      tempToken: 'temp',
      totpCode: ' 123456 ',
      stepDeadline: 0,
    })
    mockVerify2fa.mockResolvedValue({ user: { id: '1' } })

    render(<LoginView />)
    fireEvent.click(screen.getByText('验证'))

    await waitFor(() => {
      expect(mockVerify2fa).toHaveBeenCalledWith({
        tempToken: 'temp',
        totpCode: '123456',
        remember: true,
      })
      expect(mockMessageSuccess).toHaveBeenCalledWith('登录成功')
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('restores the non-persistent login choice when verifying saved 2FA', async () => {
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      savedSession: { loginName: 'admin', remember: false },
      tempToken: 'temp',
      totpCode: '123456',
      stepDeadline: 0,
    })
    mockVerify2fa.mockResolvedValue({ user: { id: '1' } })

    render(<LoginView />)
    fireEvent.click(screen.getByText('验证'))

    await waitFor(() => {
      expect(mockVerify2fa).toHaveBeenCalledWith({
        tempToken: 'temp',
        totpCode: '123456',
        remember: false,
      })
    })
  })

  it('shows error when totp verification fails', async () => {
    Object.assign(mockTotpSession, {
      loginStep: 'totp',
      tempToken: 'temp',
      totpCode: '123456',
    })
    mockVerify2fa.mockRejectedValue(new Error('bad code'))

    render(<LoginView />)
    fireEvent.click(screen.getByText('验证'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '验证失败')
    })
  })
})
