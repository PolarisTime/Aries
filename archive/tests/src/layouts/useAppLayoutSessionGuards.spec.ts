import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAppLayoutSessionGuards } from '@/layouts/useAppLayoutSessionGuards'

describe('useAppLayoutSessionGuards', () => {
  it('navigates to /login when token is empty and not on login page', () => {
    const navigate = vi.fn()
    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: true,
        token: '',
        locationPathname: '/dashboard',
        navigate,
        user: null,
      }),
    )
    expect(navigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('does not navigate when token is empty but already on login page', () => {
    const navigate = vi.fn()
    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: true,
        token: '',
        locationPathname: '/login',
        navigate,
        user: null,
      }),
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not navigate when authReady is false', () => {
    const navigate = vi.fn()
    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: false,
        token: '',
        locationPathname: '/dashboard',
        navigate,
        user: null,
      }),
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not navigate when token is present', () => {
    const navigate = vi.fn()
    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: true,
        token: 'some-token',
        locationPathname: '/dashboard',
        navigate,
        user: { totpEnabled: false, forceTotpSetup: false },
      }),
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('redirects to 2fa setup with pathname only when search is empty', () => {
    const navigate = vi.fn()

    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: true,
        token: 'some-token',
        locationPathname: '/dashboard',
        navigate,
        user: { forceTotpSetup: true, totpEnabled: false },
      }),
    )

    expect(navigate).toHaveBeenCalledWith({
      to: '/setup-2fa?redirect=%2Fdashboard',
    })
  })

  it('redirects to 2fa setup when forceTotpSetup is true and totp not enabled', () => {
    const navigate = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=test' },
      writable: true,
    })

    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: true,
        token: 'some-token',
        locationPathname: '/dashboard',
        navigate,
        user: { forceTotpSetup: true, totpEnabled: false },
      }),
    )

    expect(navigate).toHaveBeenCalledWith({
      to: expect.stringContaining('/setup-2fa?redirect='),
    })
  })

  it('does not redirect to 2fa when totp is already enabled', () => {
    const navigate = vi.fn()
    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: true,
        token: 'some-token',
        locationPathname: '/dashboard',
        navigate,
        user: { forceTotpSetup: true, totpEnabled: true },
      }),
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not redirect to 2fa when user is null', () => {
    const navigate = vi.fn()
    renderHook(() =>
      useAppLayoutSessionGuards({
        authReady: true,
        token: 'some-token',
        locationPathname: '/dashboard',
        navigate,
        user: null,
      }),
    )
    expect(navigate).not.toHaveBeenCalled()
  })
})
