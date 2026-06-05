import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accountSecurity from '@/api/account-security'
import { usePersonalSecuritySettings } from '@/layouts/usePersonalSecuritySettings'
import * as authUserSync from '@/stores/auth-user-sync'
import * as antdApp from '@/utils/antd-app'

vi.mock('@/api/account-security', () => ({
  changeOwnPassword: vi.fn(),
  enableOwn2fa: vi.fn(),
  setupOwn2fa: vi.fn(),
}))

vi.mock('@/stores/auth-user-sync', () => ({
  syncCurrentUserTotpState: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('usePersonalSecuritySettings', () => {
  beforeEach(() => {
    vi.mocked(accountSecurity.changeOwnPassword).mockReset()
    vi.mocked(accountSecurity.setupOwn2fa).mockReset()
    vi.mocked(accountSecurity.enableOwn2fa).mockReset()
    vi.mocked(authUserSync.syncCurrentUserTotpState).mockReset()
    vi.mocked(antdApp.message.success).mockReset()
    vi.mocked(antdApp.message.error).mockReset()
  })

  it('returns initial state', () => {
    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'display' }),
      { wrapper: createWrapper() },
    )
    expect(result.current.pwSaving).toBe(false)
    expect(result.current.totpLoading).toBe(false)
    expect(result.current.totpSetup).toBeNull()
    expect(result.current.totpCode).toBe('')
    expect(result.current.totpEnabling).toBe(false)
  })

  it('calls changeOwnPassword on success', async () => {
    vi.mocked(accountSecurity.changeOwnPassword).mockResolvedValue(
      undefined as any,
    )

    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    await result.current.handleChangePassword({
      oldPassword: 'old123',
      newPassword: 'new123',
    })

    expect(accountSecurity.changeOwnPassword).toHaveBeenCalledWith({
      currentPassword: 'old123',
      newPassword: 'new123',
    })
    expect(antdApp.message.success).toHaveBeenCalled()
  })

  it('shows error message on password change failure', async () => {
    vi.mocked(accountSecurity.changeOwnPassword).mockRejectedValue(
      new Error('密码错误'),
    )

    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    await result.current.handleChangePassword({
      oldPassword: 'wrong',
      newPassword: 'new123',
    })

    expect(antdApp.message.error).toHaveBeenCalledWith('密码错误')
  })

  it('calls setupOwn2fa on handleSetupTotp success', async () => {
    vi.mocked(accountSecurity.setupOwn2fa).mockResolvedValue({
      data: { qrCodeBase64: 'base64data', secret: 'SECRET' },
    } as any)

    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      await result.current.handleSetupTotp()
    })

    expect(result.current.totpSetup).toEqual({
      qrCodeBase64: 'base64data',
      secret: 'SECRET',
    })
  })

  it('shows error on setupOwn2fa failure', async () => {
    vi.mocked(accountSecurity.setupOwn2fa).mockRejectedValue(
      new Error('设置失败'),
    )

    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      await result.current.handleSetupTotp()
    })

    expect(antdApp.message.error).toHaveBeenCalledWith('设置失败')
    expect(result.current.totpLoading).toBe(false)
  })

  it('rejects invalid TOTP code', async () => {
    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.setTotpCode('12345'))
    await act(async () => {
      await result.current.handleEnableTotp()
    })

    expect(antdApp.message.error).toHaveBeenCalled()
    expect(accountSecurity.enableOwn2fa).not.toHaveBeenCalled()
  })

  it('calls enableOwn2fa on valid code', async () => {
    vi.mocked(accountSecurity.enableOwn2fa).mockResolvedValue(undefined as any)

    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.setTotpCode('123456'))
    await act(async () => {
      await result.current.handleEnableTotp()
    })

    expect(accountSecurity.enableOwn2fa).toHaveBeenCalledWith('123456')
    expect(authUserSync.syncCurrentUserTotpState).toHaveBeenCalledWith(true)
    expect(antdApp.message.success).toHaveBeenCalled()
  })

  it('resets security state', () => {
    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.setTotpCode('123456'))
    act(() => result.current.resetSecurityState())

    expect(result.current.totpCode).toBe('')
    expect(result.current.totpSetup).toBeNull()
  })

  it('shows error on enableOwn2fa failure', async () => {
    vi.mocked(accountSecurity.enableOwn2fa).mockRejectedValue(
      new Error('启用失败'),
    )

    const { result } = renderHook(
      () => usePersonalSecuritySettings({ open: false, tab: 'security' }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.setTotpCode('123456'))
    await act(async () => {
      await result.current.handleEnableTotp()
    })

    expect(antdApp.message.error).toHaveBeenCalledWith('启用失败')
    expect(result.current.totpEnabling).toBe(false)
  })
})
