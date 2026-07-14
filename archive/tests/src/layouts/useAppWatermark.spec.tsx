import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildWatermarkContent,
  useAppWatermark,
} from '@/layouts/useAppWatermark'
import type { RuntimeConfigResponse } from '@/types/runtime-config'

const { useRuntimeConfigMock } = vi.hoisted(() => ({
  useRuntimeConfigMock: vi.fn(),
}))

vi.mock('@/hooks/useRuntimeConfig', () => ({
  useRuntimeConfig: (...args: unknown[]) => useRuntimeConfigMock(...args),
}))

function createRuntimeConfig(
  watermark?: Partial<RuntimeConfigResponse['ui']['watermark']>,
): RuntimeConfigResponse {
  return {
    ui: {
      defaultPageSize: 20,
      showSnowflakeId: false,
      watermark: {
        enabled: false,
        content: '',
        fontSize: 18,
        color: 'rgba(0,0,0,0.08)',
        rotate: -22,
        density: 200,
        ...watermark,
      },
    },
    business: {
      defaultTaxRate: 0,
      statement: {
        customerReceiptAmountZero: false,
        supplierFullPayment: false,
      },
      businessNo: {
        useSnowflakeId: false,
      },
    },
    features: {
      weightOnlyPurchaseInbound: false,
      weightOnlySalesOutbound: false,
    },
  }
}

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
    useRuntimeConfigMock.mockReset()
    useRuntimeConfigMock.mockReturnValue({ data: undefined })
  })

  it('loads watermark config from runtime config', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig({
        enabled: true,
        content: '内部专用 {username}',
      }),
    })

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    expect(result.current.text).toBe('内部专用 zhangsan')
  })

  it('normalizes invalid watermark numeric settings', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig({
        enabled: true,
        fontSize: 0,
        rotate: Number.NaN,
        density: 0,
      }),
    })

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    expect(result.current.text).toBeTruthy()
    expect(result.current.fontSize).toBe(10)
    expect(result.current.rotate).toBe(-22)
    expect(result.current.density).toBe(50)
    expect(result.current.width).toBe(120)
    expect(result.current.height).toBe(64)
  })

  it('falls back to disabled config when runtime config is unavailable', () => {
    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    expect(result.current.enabled).toBe(false)
    expect(result.current.text).toBeUndefined()
    expect(result.current.fontSize).toBe(18)
    expect(result.current.rotate).toBe(-22)
    expect(result.current.density).toBe(200)
    expect(result.current.color).toBe('rgba(0,0,0,0.08)')
  })

  it('clamps numeric settings to their upper limits and trims blank color', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig({
        enabled: true,
        content: 'ON',
        fontSize: 99,
        rotate: 180,
        density: 999,
        color: '   ',
      }),
    })

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    expect(result.current.enabled).toBe(true)
    expect(result.current.fontSize).toBe(48)
    expect(result.current.rotate).toBe(90)
    expect(result.current.density).toBe(400)
    expect(result.current.width).toBe(400)
    expect(result.current.height).toBe(192)
    expect(result.current.color).toBe('rgba(0,0,0,0.08)')
    expect(result.current.text).toContain('zhangsan')
  })

  it('falls back numeric settings when values are non-finite', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig({
        enabled: true,
        fontSize: Number.NaN,
        density: Number.POSITIVE_INFINITY,
      }),
    })

    const { result } = renderHook(() => useAppWatermark('zhangsan'), {
      wrapper: createWrapper(),
    })

    expect(result.current.enabled).toBe(true)
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
