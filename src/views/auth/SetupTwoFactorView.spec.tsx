import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
    const state = {
      user: { userName: 'testuser', loginName: 'test', totpEnabled: false },
    }
    return selector(state)
  },
}))

vi.mock('@/utils/env', () => ({
  appTitle: '测试应用',
}))

vi.mock('@/views/auth/useSetupTwoFactorState', () => ({
  useSetupTwoFactorState: () => ({
    enabling: false,
    fetchTotpSetup: vi.fn(),
    form: {},
    handleEnable: vi.fn(),
    loading: false,
    totpData: { secret: 'TEST', qrCodeUrl: 'otpauth://totp/test' },
  }),
}))

vi.mock('@/views/auth/AuthPageShell', () => ({
  AuthPageShell: ({ children, hero }: { children: React.ReactNode; hero?: React.ReactNode }) => (
    <div data-testid="auth-shell">
      {hero && <div data-testid="hero">{hero}</div>}
      {children}
    </div>
  ),
}))

vi.mock('@/views/auth/SetupTwoFactorContent', () => ({
  SetupTwoFactorContent: ({ currentUserName }: any) => <div data-testid="setup-content">{currentUserName}</div>,
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
})
