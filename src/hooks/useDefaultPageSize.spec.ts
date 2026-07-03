import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

const { listClientSettingsMock } = vi.hoisted(() => ({
  listClientSettingsMock: vi.fn(),
}))

vi.mock('@/api/system-settings', () => ({
  listClientSettings: (...args: unknown[]) => listClientSettingsMock(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { clientSettings: ['clientSettings'] },
}))

vi.mock('@/module-system/settings-constants', () => ({
  DEFAULT_LIST_PAGE_SIZE_SETTING_CODE: 'defaultPageSize',
}))

import { useDefaultPageSize } from './useDefaultPageSize'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useDefaultPageSize', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns default size when data is undefined', () => {
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(20)
  })

  it('returns default size when list is empty', async () => {
    listClientSettingsMock.mockResolvedValue([])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(listClientSettingsMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns default size when settings request fails', async () => {
    listClientSettingsMock.mockRejectedValue(new Error('failed'))
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(listClientSettingsMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns setting value when found', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: ' defaultPageSize ', sampleNo: 50 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current).toBe(50), { timeout: 3000 })
  })

  it('returns default size when setting not found', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'other', sampleNo: 100 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(listClientSettingsMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('ignores settings without settingCode', async () => {
    listClientSettingsMock.mockResolvedValue([{ sampleNo: 100 }])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(listClientSettingsMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns default size for invalid sampleNo', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: 'invalid' },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(listClientSettingsMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns default size for negative value', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: -10 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(listClientSettingsMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns default size for zero value', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: 0 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(listClientSettingsMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('floors decimal values', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: 25.7 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current).toBe(25), { timeout: 3000 })
  })
})
