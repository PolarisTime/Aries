import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUserAccountDetail = vi.fn()
const mockShowError = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/api/user-accounts', () => ({
  getUserAccountDetail: (...args: unknown[]) =>
    mockGetUserAccountDetail(...args),
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

import { useUserAccountDetail } from '@/views/system/useUserAccountDetail'

describe('useUserAccountDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useUserAccountDetail())
    expect(result.current.detailOpen).toBe(false)
    expect(result.current.detailLoading).toBe(false)
    expect(result.current.detailRecord).toBeNull()
  })

  it('opens detail modal and fetches record', async () => {
    const record = { id: '1', loginName: 'admin', userName: 'Admin' }
    mockGetUserAccountDetail.mockResolvedValue(record)
    const { result } = renderHook(() => useUserAccountDetail())
    await act(async () => {
      await result.current.openDetailModal({ id: '1' } as never)
    })
    expect(result.current.detailOpen).toBe(true)
    await waitFor(() => {
      expect(result.current.detailLoading).toBe(false)
    })
    expect(result.current.detailRecord).toEqual(record)
  })

  it('handles error when fetching detail', async () => {
    const error = new Error('Network error')
    mockGetUserAccountDetail.mockRejectedValue(error)
    const { result } = renderHook(() => useUserAccountDetail())
    await act(async () => {
      await result.current.openDetailModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.detailOpen).toBe(false)
    })
    expect(result.current.detailLoading).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith(
      error,
      'api.loadUserDetailFailed',
    )
  })

  it('closes detail modal and clears record', async () => {
    const record = { id: '1', loginName: 'admin', userName: 'Admin' }
    mockGetUserAccountDetail.mockResolvedValue(record)
    const { result } = renderHook(() => useUserAccountDetail())
    await act(async () => {
      await result.current.openDetailModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.detailRecord).toEqual(record)
    })
    act(() => {
      result.current.closeDetailModal()
    })
    expect(result.current.detailOpen).toBe(false)
    expect(result.current.detailRecord).toBeNull()
  })

  it('sets loading to true during fetch', async () => {
    let resolveDetail: (value: unknown) => void
    mockGetUserAccountDetail.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve
        }),
    )
    const { result } = renderHook(() => useUserAccountDetail())
    act(() => {
      result.current.openDetailModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.detailLoading).toBe(true)
    })
    await act(async () => {
      resolveDetail!({ id: '1', loginName: 'admin' })
    })
    await waitFor(() => {
      expect(result.current.detailLoading).toBe(false)
    })
  })

  it('returns all expected properties', () => {
    const { result } = renderHook(() => useUserAccountDetail())
    expect(result.current).toHaveProperty('detailOpen')
    expect(result.current).toHaveProperty('detailLoading')
    expect(result.current).toHaveProperty('detailRecord')
    expect(result.current).toHaveProperty('openDetailModal')
    expect(result.current).toHaveProperty('closeDetailModal')
  })
})
