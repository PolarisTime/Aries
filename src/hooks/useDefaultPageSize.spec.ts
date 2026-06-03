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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('useDefaultPageSize', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('returns default size when data is undefined', () => {
    const { result } = renderHook(() => useDefaultPageSize(), { wrapper })
    expect(result.current).toBe(20)
  })

  it('returns default size when list is empty', async () => {
    listClientSettingsMock.mockResolvedValue([])
    const { result } = renderHook(() => useDefaultPageSize(), { wrapper })
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns setting value when found', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: 50 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), { wrapper })
    await waitFor(() => expect(result.current).toBe(50), { timeout: 3000 })
  })

  it('returns default size when setting not found', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'other', sampleNo: 100 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), { wrapper })
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns default size for invalid sampleNo', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: 'invalid' },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), { wrapper })
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('returns default size for negative value', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: -10 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), { wrapper })
    await waitFor(() => expect(result.current).toBe(20), { timeout: 3000 })
  })

  it('floors decimal values', async () => {
    listClientSettingsMock.mockResolvedValue([
      { settingCode: 'defaultPageSize', sampleNo: 25.7 },
    ])
    const { result } = renderHook(() => useDefaultPageSize(), { wrapper })
    await waitFor(() => expect(result.current).toBe(25), { timeout: 3000 })
  })
})
