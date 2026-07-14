import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockSetupOwn2fa = vi.fn()
const mockEnableOwn2fa = vi.fn()
const mockSyncCurrentUserTotpState = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.setup2fa.content.loadFailed': '加载失败',
        'auth.personalsecurity.enableSuccess': '启用成功',
        'auth.personalsecurity.enableFailed': '启用失败',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/api/account-security', () => ({
  setupOwn2fa: (...args: unknown[]) => mockSetupOwn2fa(...args),
  enableOwn2fa: (...args: unknown[]) => mockEnableOwn2fa(...args),
}))

vi.mock('@/stores/auth-user-sync', () => ({
  syncCurrentUserTotpState: (...args: unknown[]) =>
    mockSyncCurrentUserTotpState(...args),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}))

import { message } from '@/utils/antd-app'
import { useSetupTwoFactorState } from '@/views/auth/useSetupTwoFactorState'

async function waitForLoading(result: {
  current: ReturnType<typeof useSetupTwoFactorState>
}) {
  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })
}

describe('useSetupTwoFactorState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetupOwn2fa.mockResolvedValue({
      data: {
        secret: 'TESTSECRET',
        qrCodeUrl: 'otpauth://totp/test',
      },
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useSetupTwoFactorState())
    expect(result.current.loading).toBe(true)
    expect(result.current.enabling).toBe(false)
    expect(result.current.totpData).toBeNull()
    expect(result.current.form).toBeDefined()
  })

  it('fetches totp setup on mount', async () => {
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    expect(result.current.totpData).toEqual({
      secret: 'TESTSECRET',
      qrCodeUrl: 'otpauth://totp/test',
    })
  })

  it('fetchTotpSetup updates totpData', async () => {
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    expect(result.current.totpData?.secret).toBe('TESTSECRET')
    mockSetupOwn2fa.mockResolvedValue({
      data: { secret: 'NEWSECRET', qrCodeUrl: 'otpauth://totp/new' },
    })
    result.current.fetchTotpSetup()
    await waitFor(() => {
      expect(result.current.totpData?.secret).toBe('NEWSECRET')
    })
  })

  it('fetchTotpSetup reports Error and fallback failures', async () => {
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)

    mockSetupOwn2fa.mockRejectedValue(new Error('Refresh failed'))
    await act(async () => {
      await result.current.fetchTotpSetup()
    })
    expect(message.error).toHaveBeenCalledWith('Refresh failed')
    expect(result.current.loading).toBe(false)

    mockSetupOwn2fa.mockRejectedValue('string error')
    await act(async () => {
      await result.current.fetchTotpSetup()
    })
    expect(message.error).toHaveBeenCalledWith('加载失败')
    expect(result.current.loading).toBe(false)
  })

  it('handleEnable calls enableOwn2fa and syncs state', async () => {
    mockEnableOwn2fa.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    expect(mockEnableOwn2fa).toHaveBeenCalledWith('123456')
    expect(mockSyncCurrentUserTotpState).toHaveBeenCalledWith(true)
    expect(result.current.enabling).toBe(false)
  })

  it('handleEnable schedules navigation after 300ms', async () => {
    mockEnableOwn2fa.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    expect(mockNavigate).not.toHaveBeenCalled()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
  })

  it('handleEnable handles error', async () => {
    mockEnableOwn2fa.mockRejectedValue(new Error('Invalid code'))
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    expect(result.current.enabling).toBe(false)
  })

  it('fetchTotpSetup handles error', async () => {
    mockSetupOwn2fa.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    expect(result.current.totpData).toBeNull()
  })

  it('fetchTotpSetup handles non-Error exception', async () => {
    mockSetupOwn2fa.mockRejectedValue('string error')
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    expect(result.current.totpData).toBeNull()
  })

  it('handleEnable sets enabling to false after completion', async () => {
    mockEnableOwn2fa.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    expect(result.current.enabling).toBe(false)
  })

  it('handleEnable handles non-Error exception', async () => {
    mockEnableOwn2fa.mockRejectedValue('string error')
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    expect(result.current.enabling).toBe(false)
  })

  it('handleEnable navigates to redirect parameter from URL', async () => {
    const originalLocation = window.location
    mockEnableOwn2fa.mockResolvedValue(undefined)
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '?redirect=/settings' },
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/settings' })
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('handleEnable navigates to /dashboard when redirect is external URL', async () => {
    const originalLocation = window.location
    mockEnableOwn2fa.mockResolvedValue(undefined)
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '?redirect=https://evil.com' },
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('handleEnable navigates to /dashboard when no redirect parameter', async () => {
    const originalLocation = window.location
    mockEnableOwn2fa.mockResolvedValue(undefined)
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '' },
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('handleEnable falls back to /dashboard when window is unavailable', async () => {
    const originalWindow = globalThis.window
    mockEnableOwn2fa.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)

    vi.useFakeTimers()
    try {
      await act(async () => {
        await result.current.handleEnable({ totpCode: '123456' })
      })
      vi.stubGlobal('window', undefined)
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
    } finally {
      vi.stubGlobal('window', originalWindow)
      vi.useRealTimers()
    }
  })

  it('calls syncCurrentUserTotpState on successful enable', async () => {
    mockEnableOwn2fa.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '123456' })
    })
    expect(mockSyncCurrentUserTotpState).toHaveBeenCalledWith(true)
  })

  it('returns form instance', async () => {
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    expect(result.current.form).toBeDefined()
    expect(typeof result.current.form.setFieldsValue).toBe('function')
    expect(typeof result.current.form.validateFields).toBe('function')
  })

  it('fetchTotpSetup can be called to refresh data', async () => {
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    expect(result.current.totpData?.secret).toBe('TESTSECRET')
    mockSetupOwn2fa.mockResolvedValue({
      data: { secret: 'SECOND', qrCodeUrl: 'otpauth://totp/second' },
    })
    result.current.fetchTotpSetup()
    await waitFor(() => {
      expect(result.current.totpData?.secret).toBe('SECOND')
    })
  })

  it('loading is false after fetchTotpSetup error', async () => {
    mockSetupOwn2fa.mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('totpData remains null when initial fetch fails', async () => {
    mockSetupOwn2fa.mockRejectedValue(new Error('init fail'))
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    expect(result.current.totpData).toBeNull()
  })

  it('handleEnable does not navigate when enableOwn2fa fails', async () => {
    mockEnableOwn2fa.mockRejectedValue(new Error('bad code'))
    const { result } = renderHook(() => useSetupTwoFactorState())
    await waitForLoading(result)
    await act(async () => {
      await result.current.handleEnable({ totpCode: '000000' })
    })
    expect(result.current.enabling).toBe(false)
    expect(mockSyncCurrentUserTotpState).not.toHaveBeenCalled()
  })
})
