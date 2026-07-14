import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUserAccountDetail = vi.fn()
const mockSetupUserAccount2fa = vi.fn()
const mockEnableUserAccount2fa = vi.fn()
const mockDisableUserAccount2fa = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockModalConfirm = vi.fn()
const mockSyncCurrentUserTotpStateById = vi.fn()
const mockUseQueryClient = vi.fn()
let mockCurrentUser: { id: string; totpEnabled: boolean } | null = {
  id: '1',
  totpEnabled: false,
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/api/user-accounts', () => ({
  getUserAccountDetail: (...args: unknown[]) =>
    mockGetUserAccountDetail(...args),
  setupUserAccount2fa: (...args: unknown[]) => mockSetupUserAccount2fa(...args),
  enableUserAccount2fa: (...args: unknown[]) =>
    mockEnableUserAccount2fa(...args),
  disableUserAccount2fa: (...args: unknown[]) =>
    mockDisableUserAccount2fa(...args),
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { userAccountBase: ['userAccount'] },
}))

vi.mock('@/stores/auth-user-sync', () => ({
  syncCurrentUserTotpStateById: (...args: unknown[]) =>
    mockSyncCurrentUserTotpStateById(...args),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: mockCurrentUser }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
  modal: { confirm: (...args: unknown[]) => mockModalConfirm(...args) },
}))

import { useUserAccountTwoFactor } from '@/views/system/useUserAccountTwoFactor'

describe('useUserAccountTwoFactor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentUser = { id: '1', totpEnabled: false }
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    })
    mockGetUserAccountDetail.mockResolvedValue({
      id: '1',
      loginName: 'admin',
      totpEnabled: false,
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    expect(result.current.twoFaOpen).toBe(false)
    expect(result.current.twoFaLoading).toBe(false)
    expect(result.current.twoFaRecord).toBeNull()
    expect(result.current.twoFaSetup).toBeNull()
    expect(result.current.twoFaCode).toBe('')
    expect(result.current.twoFaSetupLoading).toBe(false)
    expect(result.current.twoFaEnableLoading).toBe(false)
    expect(result.current.twoFaDisableLoading).toBe(false)
  })

  it('returns all expected functions', () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    expect(typeof result.current.setTwoFaCode).toBe('function')
    expect(typeof result.current.open2faModal).toBe('function')
    expect(typeof result.current.handleGenerate2fa).toBe('function')
    expect(typeof result.current.handleEnable2fa).toBe('function')
    expect(typeof result.current.handleDisable2fa).toBe('function')
    expect(typeof result.current.close2faModal).toBe('function')
  })

  it('open2faModal fetches user detail and opens modal', async () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    expect(result.current.twoFaOpen).toBe(true)
    expect(mockGetUserAccountDetail).toHaveBeenCalledWith(
      '1',
      expect.any(AbortSignal),
    )
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    expect(result.current.twoFaRecord).toEqual({
      id: '1',
      loginName: 'admin',
      totpEnabled: false,
    })
  })

  it('open2faModal handles error', async () => {
    mockGetUserAccountDetail.mockRejectedValue(new Error('Load failed'))
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaOpen).toBe(false)
    })
    expect(result.current.twoFaLoading).toBe(false)
    expect(mockShowError).toHaveBeenCalled()
  })

  it('keeps the latest 2FA target when detail responses resolve out of order', async () => {
    const firstDetail = createDeferred<Record<string, unknown>>()
    const secondDetail = createDeferred<Record<string, unknown>>()
    mockGetUserAccountDetail.mockImplementation((id: string) =>
      id === '1' ? firstDetail.promise : secondDetail.promise,
    )
    const { result } = renderHook(() => useUserAccountTwoFactor())
    let firstOpen!: Promise<void>
    let secondOpen!: Promise<void>

    act(() => {
      firstOpen = result.current.open2faModal({ id: '1' } as never)
    })
    act(() => {
      secondOpen = result.current.open2faModal({ id: '2' } as never)
    })
    await act(async () => {
      secondDetail.resolve({
        id: '2',
        loginName: 'latest-user',
        totpEnabled: false,
      })
      await secondOpen
    })
    await act(async () => {
      firstDetail.resolve({
        id: '1',
        loginName: 'stale-user',
        totpEnabled: false,
      })
      await firstOpen
    })

    expect(result.current.twoFaRecord).toEqual(
      expect.objectContaining({ id: '2', loginName: 'latest-user' }),
    )
    expect(result.current.twoFaOpen).toBe(true)
    expect(result.current.twoFaLoading).toBe(false)
  })

  it('ignores a 2FA detail response after the modal is closed', async () => {
    const detail = createDeferred<Record<string, unknown>>()
    mockGetUserAccountDetail.mockReturnValue(detail.promise)
    const { result } = renderHook(() => useUserAccountTwoFactor())
    let openPromise!: Promise<void>

    act(() => {
      openPromise = result.current.open2faModal({ id: '1' } as never)
    })
    act(() => {
      result.current.close2faModal()
    })
    const signal = mockGetUserAccountDetail.mock.calls[0][1] as AbortSignal
    expect(signal.aborted).toBe(true)
    await act(async () => {
      detail.resolve({
        id: '1',
        loginName: 'stale-user',
        totpEnabled: false,
      })
      await openPromise
    })

    expect(result.current.twoFaOpen).toBe(false)
    expect(result.current.twoFaRecord).toBeNull()
    expect(result.current.twoFaSetup).toBeNull()
  })

  it('setTwoFaCode updates code', () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    expect(result.current.twoFaCode).toBe('123456')
  })

  it('close2faModal resets state', async () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    act(() => {
      result.current.close2faModal()
    })
    expect(result.current.twoFaOpen).toBe(false)
    expect(result.current.twoFaRecord).toBeNull()
    expect(result.current.twoFaSetup).toBeNull()
    expect(result.current.twoFaCode).toBe('')
  })

  it('handleGenerate2fa does nothing when no record', async () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.handleGenerate2fa()
    })
    expect(mockSetupUserAccount2fa).not.toHaveBeenCalled()
  })

  it('handleGenerate2fa calls API and updates setup', async () => {
    mockSetupUserAccount2fa.mockResolvedValue({
      data: { secret: 'SECRET', qrCodeUrl: 'otpauth://totp/test' },
      message: 'Generated',
    })
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    await act(async () => {
      await result.current.handleGenerate2fa()
    })
    expect(mockSetupUserAccount2fa).toHaveBeenCalledWith('1')
    expect(result.current.twoFaSetup).toEqual({
      secret: 'SECRET',
      qrCodeUrl: 'otpauth://totp/test',
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('Generated')
  })

  it('handleGenerate2fa uses default success message when API omits message', async () => {
    mockSetupUserAccount2fa.mockResolvedValue({
      data: { secret: 'SECRET', qrCodeUrl: 'otpauth://totp/test' },
    })
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    await act(async () => {
      await result.current.handleGenerate2fa()
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'auth.user2fa.generateSuccess',
    )
  })

  it('handleGenerate2fa handles error', async () => {
    mockSetupUserAccount2fa.mockRejectedValue(new Error('Generate failed'))
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    await act(async () => {
      await result.current.handleGenerate2fa()
    })
    expect(result.current.twoFaSetupLoading).toBe(false)
    expect(mockShowError).toHaveBeenCalled()
  })

  it('ignores a generate response after switching the 2FA target', async () => {
    const setup = createDeferred<{
      data: { secret: string; qrCodeUrl: string }
      message: string
    }>()
    mockGetUserAccountDetail.mockImplementation(async (id: string) => ({
      id,
      loginName: `user-${id}`,
      totpEnabled: false,
    }))
    mockSetupUserAccount2fa.mockReturnValue(setup.promise)
    const { result } = renderHook(() => useUserAccountTwoFactor())
    let generatePromise!: Promise<void>

    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    act(() => {
      generatePromise = result.current.handleGenerate2fa()
    })
    await waitFor(() => {
      expect(mockSetupUserAccount2fa).toHaveBeenCalledWith('1')
    })
    await act(async () => {
      await result.current.open2faModal({ id: '2' } as never)
    })
    await act(async () => {
      setup.resolve({
        data: { secret: 'STALE', qrCodeUrl: 'otpauth://totp/stale' },
        message: 'Generated stale setup',
      })
      await generatePromise
    })

    expect(result.current.twoFaOpen).toBe(true)
    expect(result.current.twoFaRecord).toEqual(
      expect.objectContaining({ id: '2' }),
    )
    expect(result.current.twoFaSetup).toBeNull()
    expect(mockMessageSuccess).not.toHaveBeenCalled()
  })

  it('handleEnable2fa does nothing when no record', async () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.handleEnable2fa()
    })
    expect(mockEnableUserAccount2fa).not.toHaveBeenCalled()
  })

  it('handleEnable2fa shows warning for invalid code', async () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    act(() => {
      result.current.setTwoFaCode('12345')
    })
    await act(async () => {
      await result.current.handleEnable2fa()
    })
    expect(mockMessageWarning).toHaveBeenCalled()
    expect(mockEnableUserAccount2fa).not.toHaveBeenCalled()
  })

  it('handleEnable2fa calls API with valid code', async () => {
    mockEnableUserAccount2fa.mockResolvedValue({
      data: { id: '1', loginName: 'admin', totpEnabled: true },
      message: 'Enabled',
    })
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    await act(async () => {
      await result.current.handleEnable2fa()
    })
    expect(mockEnableUserAccount2fa).toHaveBeenCalledWith('1', '123456')
    expect(mockSyncCurrentUserTotpStateById).toHaveBeenCalledWith('1', true)
    expect(mockMessageSuccess).toHaveBeenCalledWith('Enabled')
  })

  it('handleEnable2fa uses default success message and skips sync for another user', async () => {
    mockGetUserAccountDetail.mockResolvedValue({
      id: '2',
      loginName: 'operator',
      totpEnabled: false,
    })
    mockEnableUserAccount2fa.mockResolvedValue({
      data: { id: '2', loginName: 'operator', totpEnabled: true },
    })
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '2' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    await act(async () => {
      await result.current.handleEnable2fa()
    })
    expect(mockSyncCurrentUserTotpStateById).not.toHaveBeenCalled()
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'auth.user2fa.enableSuccess',
    )
  })

  it('handleEnable2fa handles error', async () => {
    mockEnableUserAccount2fa.mockRejectedValue(new Error('Enable failed'))
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    await act(async () => {
      await result.current.handleEnable2fa()
    })
    expect(result.current.twoFaEnableLoading).toBe(false)
    expect(mockShowError).toHaveBeenCalled()
  })

  it('ignores an enable response after switching the 2FA target', async () => {
    const invalidateQueries = vi.fn()
    const enable = createDeferred<{
      data: { id: string; loginName: string; totpEnabled: boolean }
      message: string
    }>()
    mockUseQueryClient.mockReturnValue({ invalidateQueries })
    mockGetUserAccountDetail.mockImplementation(async (id: string) => ({
      id,
      loginName: `user-${id}`,
      totpEnabled: false,
    }))
    mockEnableUserAccount2fa.mockReturnValue(enable.promise)
    const { result } = renderHook(() => useUserAccountTwoFactor())
    let enablePromise!: Promise<void>

    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    act(() => {
      enablePromise = result.current.handleEnable2fa()
    })
    await waitFor(() => {
      expect(mockEnableUserAccount2fa).toHaveBeenCalledWith('1', '123456')
    })
    await act(async () => {
      await result.current.open2faModal({ id: '2' } as never)
    })
    await act(async () => {
      enable.resolve({
        data: { id: '1', loginName: 'user-1', totpEnabled: true },
        message: 'Enabled stale user',
      })
      await enablePromise
    })

    expect(result.current.twoFaOpen).toBe(true)
    expect(result.current.twoFaRecord).toEqual(
      expect.objectContaining({ id: '2' }),
    )
    expect(mockSyncCurrentUserTotpStateById).not.toHaveBeenCalled()
    expect(mockMessageSuccess).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('handleDisable2fa does nothing when no record', () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    act(() => {
      result.current.handleDisable2fa()
    })
    expect(mockModalConfirm).not.toHaveBeenCalled()
  })

  it('handleDisable2fa shows confirm dialog when record exists', async () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    act(() => {
      result.current.handleDisable2fa()
    })
    expect(mockModalConfirm).toHaveBeenCalled()
  })

  it('handleDisable2fa requires a 6-digit operator TOTP code', async () => {
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })

    act(() => {
      result.current.setTwoFaCode('12ab56')
    })
    act(() => {
      result.current.handleDisable2fa()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('auth.user2fa.codeInvalid')
    expect(mockModalConfirm).not.toHaveBeenCalled()
    expect(mockDisableUserAccount2fa).not.toHaveBeenCalled()
  })

  it('handleDisable2fa calls API on confirm', async () => {
    mockDisableUserAccount2fa.mockResolvedValue({
      data: { id: '1', loginName: 'admin', totpEnabled: false },
      message: 'Disabled',
    })
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    let onOk: (() => void) | undefined
    mockModalConfirm.mockImplementation((config: { onOk: () => void }) => {
      onOk = config.onOk
    })
    act(() => {
      result.current.setTwoFaCode(' 123456 ')
    })
    act(() => {
      result.current.handleDisable2fa()
    })
    await act(async () => {
      await onOk!()
    })
    expect(mockDisableUserAccount2fa).toHaveBeenCalledWith('1', '123456')
    expect(mockSyncCurrentUserTotpStateById).toHaveBeenCalledWith('1', false)
    expect(mockMessageSuccess).toHaveBeenCalledWith('Disabled')
  })

  it('handleDisable2fa uses default success message and skips sync without current user', async () => {
    mockCurrentUser = null
    mockDisableUserAccount2fa.mockResolvedValue({
      data: { id: '1', loginName: 'admin', totpEnabled: false },
    })
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    let onOk: (() => void) | undefined
    mockModalConfirm.mockImplementation((config: { onOk: () => void }) => {
      onOk = config.onOk
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    act(() => {
      result.current.handleDisable2fa()
    })
    await act(async () => {
      await onOk!()
    })
    expect(mockSyncCurrentUserTotpStateById).not.toHaveBeenCalled()
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'auth.user2fa.disableSuccess',
    )
  })

  it('handleDisable2fa handles error on confirm', async () => {
    mockDisableUserAccount2fa.mockRejectedValue(new Error('Disable failed'))
    const { result } = renderHook(() => useUserAccountTwoFactor())
    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.twoFaLoading).toBe(false)
    })
    let onOk: (() => void) | undefined
    mockModalConfirm.mockImplementation((config: { onOk: () => void }) => {
      onOk = config.onOk
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    act(() => {
      result.current.handleDisable2fa()
    })
    await act(async () => {
      await onOk!()
    })
    expect(result.current.twoFaDisableLoading).toBe(false)
    expect(mockShowError).toHaveBeenCalled()
  })

  it('ignores a disable response after switching the 2FA target', async () => {
    const invalidateQueries = vi.fn()
    const disable = createDeferred<{
      data: { id: string; loginName: string; totpEnabled: boolean }
      message: string
    }>()
    mockUseQueryClient.mockReturnValue({ invalidateQueries })
    mockGetUserAccountDetail.mockImplementation(async (id: string) => ({
      id,
      loginName: `user-${id}`,
      totpEnabled: true,
    }))
    mockDisableUserAccount2fa.mockReturnValue(disable.promise)
    let onOk: (() => Promise<void>) | undefined
    mockModalConfirm.mockImplementation(
      (config: { onOk: () => Promise<void> }) => {
        onOk = config.onOk
      },
    )
    const { result } = renderHook(() => useUserAccountTwoFactor())
    let disablePromise!: Promise<void>

    await act(async () => {
      await result.current.open2faModal({ id: '1' } as never)
    })
    act(() => {
      result.current.setTwoFaCode('123456')
    })
    act(() => {
      result.current.handleDisable2fa()
    })
    act(() => {
      disablePromise = onOk!()
    })
    await waitFor(() => {
      expect(mockDisableUserAccount2fa).toHaveBeenCalledWith('1', '123456')
    })
    await act(async () => {
      await result.current.open2faModal({ id: '2' } as never)
    })
    await act(async () => {
      disable.resolve({
        data: { id: '1', loginName: 'user-1', totpEnabled: false },
        message: 'Disabled stale user',
      })
      await disablePromise
    })

    expect(result.current.twoFaOpen).toBe(true)
    expect(result.current.twoFaRecord).toEqual(
      expect.objectContaining({ id: '2' }),
    )
    expect(mockSyncCurrentUserTotpStateById).not.toHaveBeenCalled()
    expect(mockMessageSuccess).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})
