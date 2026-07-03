import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.totppanel.expired': '验证码已过期',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { warning: vi.fn() },
}))

vi.mock('@/views/auth/login-view-utils', () => ({
  clearTotpSession: vi.fn(),
  restoreTotpSession: vi.fn(() => null),
  saveTotpSession: vi.fn(),
}))

import { useLoginTotpSession } from '@/views/auth/useLoginTotpSession'

describe('useLoginTotpSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial password step state', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    expect(result.current.loginStep).toBe('password')
    expect(result.current.tempToken).toBe('')
    expect(result.current.totpCode).toBe('')
    expect(result.current.stepDeadline).toBe(0)
  })

  it('starts 2FA step with token', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    expect(result.current.loginStep).toBe('totp')
    expect(result.current.tempToken).toBe('temp-token')
    expect(result.current.stepDeadline).toBeGreaterThan(Date.now())
  })

  it('sets totp code', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.setTotpCode('123456')
    })
    expect(result.current.totpCode).toBe('123456')
  })

  it('resets 2FA step', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    expect(result.current.loginStep).toBe('totp')
    act(() => {
      result.current.reset2faStep(false)
    })
    expect(result.current.loginStep).toBe('password')
    expect(result.current.tempToken).toBe('')
  })

  it('updates now periodically when in totp step', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    const initialNow = result.current.now
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.now).toBeGreaterThanOrEqual(initialNow)
  })

  it('clears the saved session and returns to password step when the totp deadline expires', async () => {
    const { message } = await import('@/utils/antd-app')
    const { clearTotpSession } = await import('@/views/auth/login-view-utils')
    const now = new Date('2026-07-03T12:00:00.000Z')
    vi.setSystemTime(now)

    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })

    expect(clearTotpSession).toHaveBeenCalledTimes(1)
    expect(message.warning).toHaveBeenCalledWith('验证码已过期')
    expect(result.current.loginStep).toBe('password')
    expect(result.current.tempToken).toBe('')
    expect(result.current.totpCode).toBe('')
    expect(result.current.stepDeadline).toBe(0)
    expect(result.current.now).toBe(now.getTime() + 5 * 60 * 1000)
  })

  it('shows warning message when reset2faStep is called with showMessage=true', async () => {
    const { message } = await import('@/utils/antd-app')
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    act(() => {
      result.current.reset2faStep(true)
    })
    expect(message.warning).toHaveBeenCalledWith('验证码已过期')
    expect(result.current.loginStep).toBe('password')
  })

  it('does not show warning message when reset2faStep is called with showMessage=false', async () => {
    const { message } = await import('@/utils/antd-app')
    vi.mocked(message.warning).mockClear()
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    act(() => {
      result.current.reset2faStep(false)
    })
    expect(message.warning).not.toHaveBeenCalled()
  })

  it('saves totp session when starting 2FA step', async () => {
    const { saveTotpSession } = await import('@/views/auth/login-view-utils')
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    expect(saveTotpSession).toHaveBeenCalledWith(
      'temp-token',
      expect.any(Number),
      'admin',
    )
  })

  it('clears totp session when resetting', async () => {
    const { clearTotpSession } = await import('@/views/auth/login-view-utils')
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    act(() => {
      result.current.reset2faStep(false)
    })
    expect(clearTotpSession).toHaveBeenCalled()
  })

  it('sets stepDeadline 5 minutes in the future on start', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    const expectedDeadline = now + 5 * 60 * 1000
    expect(result.current.stepDeadline).toBe(expectedDeadline)
  })

  it('resets totpCode when starting a new 2FA step', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.setTotpCode('123')
    })
    expect(result.current.totpCode).toBe('123')
    act(() => {
      result.current.start2faStep('temp-token', 'admin')
    })
    expect(result.current.totpCode).toBe('')
  })

  it('returns savedSession from restoreTotpSession', async () => {
    const futureDeadline = Date.now() + 300000
    const { restoreTotpSession } = await import('@/views/auth/login-view-utils')
    vi.mocked(restoreTotpSession).mockReturnValueOnce({
      token: 'saved-token',
      deadline: futureDeadline,
      loginName: 'saved-user',
    })
    const { result } = renderHook(() => useLoginTotpSession())
    expect(result.current.savedSession).toEqual({
      token: 'saved-token',
      deadline: futureDeadline,
      loginName: 'saved-user',
    })
    expect(result.current.loginStep).toBe('totp')
    expect(result.current.tempToken).toBe('saved-token')
  })

  it('starts in password step when no saved session', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    expect(result.current.loginStep).toBe('password')
    expect(result.current.tempToken).toBe('')
    expect(result.current.stepDeadline).toBe(0)
  })

  it('can set multiple totp codes sequentially', () => {
    const { result } = renderHook(() => useLoginTotpSession())
    act(() => {
      result.current.setTotpCode('1')
    })
    expect(result.current.totpCode).toBe('1')
    act(() => {
      result.current.setTotpCode('12')
    })
    expect(result.current.totpCode).toBe('12')
    act(() => {
      result.current.setTotpCode('123456')
    })
    expect(result.current.totpCode).toBe('123456')
  })
})
