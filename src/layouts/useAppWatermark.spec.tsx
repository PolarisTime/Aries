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

  it('normalizes invalid watermark numeric settings', async () => {
    vi.mocked(listClientSettings).mockResolvedValue([
      {
        id: '220',
        settingCode: 'UI_WATERMARK_ENABLED',
        sampleNo: 'ON',
        status: '正常',
      },
      {
        id: '222',
        settingCode: 'SYS_WATERMARK_FONT_SIZE',
        sampleNo: '0',
        status: '正常',
      },
      {
        id: '223',
        settingCode: 'SYS_WATERMARK_ROTATE',
        sampleNo: '',
        status: '正常',
      },
      {
        id: '224',
        settingCode: 'SYS_WATERMARK_DENSITY',
        sampleNo: '0',
        status: '正常',
      },
    ])

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.text).toBeTruthy()
    })
    expect(result.current.fontSize).toBe(10)
    expect(result.current.rotate).toBe(-22)
    expect(result.current.density).toBe(50)
    expect(result.current.width).toBe(120)
    expect(result.current.height).toBe(64)
  })

  it('falls back to disabled config when client settings request fails', async () => {
    vi.mocked(listClientSettings).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(listClientSettings).toHaveBeenCalledTimes(1)
    })
    expect(result.current.enabled).toBe(false)
    expect(result.current.text).toBeUndefined()
    expect(result.current.fontSize).toBe(18)
    expect(result.current.rotate).toBe(-22)
    expect(result.current.density).toBe(200)
    expect(result.current.color).toBe('rgba(0,0,0,0.08)')
  })

  it('clamps numeric settings to their upper limits and trims blank color', async () => {
    vi.mocked(listClientSettings).mockResolvedValue([
      {
        id: '220',
        settingCode: ' UI_WATERMARK_ENABLED ',
        sampleNo: 'ON',
        status: '正常',
      },
      {
        id: '221',
        settingCode: ' SYS_WATERMARK_CONTENT ',
        sampleNo: 'ON',
        status: '正常',
      },
      {
        id: '222',
        settingCode: 'SYS_WATERMARK_FONT_SIZE',
        sampleNo: '99',
        status: '正常',
      },
      {
        id: '223',
        settingCode: 'SYS_WATERMARK_ROTATE',
        sampleNo: '180',
        status: '正常',
      },
      {
        id: '224',
        settingCode: 'SYS_WATERMARK_DENSITY',
        sampleNo: '999',
        status: '正常',
      },
      {
        id: '225',
        settingCode: 'SYS_WATERMARK_COLOR',
        sampleNo: '   ',
        status: '正常',
      },
    ])

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.enabled).toBe(true)
    })
    expect(result.current.fontSize).toBe(48)
    expect(result.current.rotate).toBe(90)
    expect(result.current.density).toBe(400)
    expect(result.current.width).toBe(400)
    expect(result.current.height).toBe(192)
    expect(result.current.color).toBe('rgba(0,0,0,0.08)')
    expect(result.current.text).toContain('zhangsan')
  })

  it('falls back numeric settings when values are non-finite', async () => {
    vi.mocked(listClientSettings).mockResolvedValue([
      {
        id: '220',
        settingCode: 'UI_WATERMARK_ENABLED',
        sampleNo: 'ON',
        status: '正常',
      },
      {
        id: '222',
        settingCode: 'SYS_WATERMARK_FONT_SIZE',
        sampleNo: 'not-a-number',
        status: '正常',
      },
      {
        id: '224',
        settingCode: 'SYS_WATERMARK_DENSITY',
        sampleNo: null,
        status: '正常',
      },
    ])

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.enabled).toBe(true)
    })
    expect(result.current.fontSize).toBe(18)
    expect(result.current.density).toBe(200)
    expect(result.current.height).toBe(72)
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
