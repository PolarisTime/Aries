import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listClientSettings } from '@/api/system-settings'
import {
  buildWatermarkContent,
  useAppWatermark,
} from '@/layouts/useAppWatermark'

vi.mock('@/api/system-settings', () => ({
  listClientSettings: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useAppWatermark', () => {
  beforeEach(() => {
    vi.mocked(listClientSettings).mockReset()
  })

  it('loads watermark config from public client settings', async () => {
    vi.mocked(listClientSettings).mockResolvedValue([
      {
        id: '220',
        settingCode: 'UI_WATERMARK_ENABLED',
        sampleNo: 'ON',
        status: '正常',
      },
      {
        id: '221',
        settingCode: 'SYS_WATERMARK_CONTENT',
        sampleNo: '内部专用 {username}',
        status: '正常',
      },
    ])

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.text).toBe('内部专用 zhangsan')
    })
    expect(listClientSettings).toHaveBeenCalledTimes(1)
  })

  it('keeps watermark content lines for antd watermark rendering', () => {
    const fixedDate = new Date('2026-06-02T08:30:00+08:00')

    expect(
      buildWatermarkContent(
        '内部专用\n{username}\n{date}',
        'zhangsan',
        fixedDate,
      ),
    ).toEqual(['内部专用', 'zhangsan', '2026/6/2'])
  })
})
