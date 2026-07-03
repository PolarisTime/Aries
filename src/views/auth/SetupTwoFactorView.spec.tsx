import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authState: {
    user: { userName: 'testuser', loginName: 'test', totpEnabled: false } as {
      userName?: string
      loginName?: string
      totpEnabled?: boolean
    } | null,
  },
  setupState: {
    enabling: false,
    fetchTotpSetup: vi.fn(),
    form: {},
    handleEnable: vi.fn(),
    loading: false,
    totpData: { secret: 'TEST', qrCodeUrl: 'otpauth://totp/test' },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.setup2fa.heroTag': '安全设置',
        'auth.setup2fa.heroSubtitle': '设置双因素认证',
        'auth.setup2fa.heroDescription': '保护您的账户安全',
        'auth.setup2fa.currentUserFallback': '当前用户',
        'auth.setup2fa.highlights.scanTitle': '扫描二维码',
        'auth.setup2fa.highlights.scanDescription': '使用认证器扫描',
        'auth.setup2fa.highlights.secretTitle': '保存密钥',
        'auth.setup2fa.highlights.secretDescription': '妥善保管密钥',
        'auth.setup2fa.highlights.effectiveTitle': '立即生效',
        'auth.setup2fa.highlights.effectiveDescription': '设置后立即生效',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(mocks.authState)
  },
}))

vi.mock('@/utils/env', () => ({
  appTitle: '测试应用',
}))

vi.mock('@/views/auth/useSetupTwoFactorState', () => ({
  useSetupTwoFactorState: () => mocks.setupState,
}))

vi.mock('@/views/auth/AuthPageShell', () => ({
  AuthPageShell: ({
    children,
    hero,
  }: {
    children: React.ReactNode
    hero?: React.ReactNode
  }) => (
    <div data-testid="auth-shell">
      {hero && <div data-testid="hero">{hero}</div>}
      {children}
    </div>
  ),
}))

vi.mock('@/views/auth/SetupTwoFactorContent', () => ({
  SetupTwoFactorContent: ({
    currentUserName,
    enabling,
    loading,
    onEnable,
    onRefresh,
    totpData,
  }: any) => (
    <div data-testid="setup-content">
      <span>{currentUserName}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="enabling">{String(enabling)}</span>
      <span data-testid="secret">{totpData?.secret}</span>
      <button type="button" onClick={onRefresh}>
        refresh
      </button>
      <button type="button" onClick={() => onEnable({ code: '123456' })}>
        enable
      </button>
    </div>
  ),
}))

vi.mock('@/views/auth/setup-two-factor-constants', () => ({
  buildSetupSecurityHighlights: () => [
    { title: '扫描二维码', description: '使用认证器扫描' },
    { title: '保存密钥', description: '妥善保管密钥' },
    { title: '立即生效', description: '设置后立即生效' },
  ],
}))

import { SetupTwoFactorView } from '@/views/auth/SetupTwoFactorView'

describe('SetupTwoFactorView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authState.user = {
      userName: 'testuser',
      loginName: 'test',
      totpEnabled: false,
    }
    Object.assign(mocks.setupState, {
      enabling: false,
      form: {},
      loading: false,
      totpData: { secret: 'TEST', qrCodeUrl: 'otpauth://totp/test' },
    })
  })

  it('renders setup view with hero and content', { timeout: 15000 }, () => {
    render(<SetupTwoFactorView />)
    expect(screen.getByTestId('auth-shell')).toBeTruthy()
    expect(screen.getByTestId('hero')).toBeTruthy()
    expect(screen.getByTestId('setup-content')).toBeTruthy()
  })

  it('displays app title', () => {
    render(<SetupTwoFactorView />)
    expect(screen.getByText('测试应用')).toBeTruthy()
  })

  it('displays hero tag', () => {
    render(<SetupTwoFactorView />)
    expect(screen.getByText('安全设置')).toBeTruthy()
  })

  it('displays hero subtitle', () => {
    render(<SetupTwoFactorView />)
    expect(screen.getByText('设置双因素认证')).toBeTruthy()
  })

  it('displays security highlights', () => {
    render(<SetupTwoFactorView />)
    expect(screen.getByText('扫描二维码')).toBeTruthy()
    expect(screen.getByText('保存密钥')).toBeTruthy()
    expect(screen.getByText('立即生效')).toBeTruthy()
  })

  it('displays current user name', () => {
    render(<SetupTwoFactorView />)
    expect(screen.getByText('testuser')).toBeTruthy()
  })

  it('falls back to login name when user name is empty', () => {
    mocks.authState.user = { userName: '', loginName: 'login-user' }
    render(<SetupTwoFactorView />)
    expect(screen.getByText('login-user')).toBeTruthy()
  })

  it('falls back to translated current user label when user is missing', () => {
    mocks.authState.user = null
    render(<SetupTwoFactorView />)
    expect(screen.getByText('当前用户')).toBeTruthy()
  })

  it('passes setup state to content', () => {
    Object.assign(mocks.setupState, {
      enabling: true,
      loading: true,
      totpData: { secret: 'UPDATED', qrCodeUrl: 'otpauth://totp/updated' },
    })

    render(<SetupTwoFactorView />)

    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(screen.getByTestId('enabling').textContent).toBe('true')
    expect(screen.getByTestId('secret').textContent).toBe('UPDATED')
  })

  it('refreshes setup data from content action', () => {
    render(<SetupTwoFactorView />)
    fireEvent.click(screen.getByText('refresh'))
    expect(mocks.setupState.fetchTotpSetup).toHaveBeenCalledTimes(1)
  })

  it('enables two factor from content form values', () => {
    render(<SetupTwoFactorView />)
    fireEvent.click(screen.getByText('enable'))
    expect(mocks.setupState.handleEnable).toHaveBeenCalledWith({
      code: '123456',
    })
  })
})
