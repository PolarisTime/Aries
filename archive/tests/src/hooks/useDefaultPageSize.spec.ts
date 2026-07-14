import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeConfigResponse } from '@/types/runtime-config'

const { useRuntimeConfigMock } = vi.hoisted(() => ({
  useRuntimeConfigMock: vi.fn(),
}))

vi.mock('./useRuntimeConfig', () => ({
  useRuntimeConfig: (...args: unknown[]) => useRuntimeConfigMock(...args),
}))

import { useDefaultPageSize } from './useDefaultPageSize'

function createRuntimeConfig(defaultPageSize: unknown): RuntimeConfigResponse {
  return {
    ui: {
      defaultPageSize: defaultPageSize as number,
      showSnowflakeId: false,
      watermark: {
        enabled: false,
        content: '',
        fontSize: 18,
        color: 'rgba(0,0,0,0.08)',
        rotate: -22,
        density: 200,
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
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useDefaultPageSize', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useRuntimeConfigMock.mockReturnValue({ data: undefined })
  })

  it('returns default size when data is undefined', () => {
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(20)
  })

  it('returns default size when runtime config is unavailable', () => {
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(20)
  })

  it('returns runtime config value when available', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig(50),
    })
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(50)
  })

  it('returns default size for invalid runtime config value', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig('invalid'),
    })
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(20)
  })

  it('returns default size for negative value', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig(-10),
    })
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(20)
  })

  it('returns default size for zero value', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig(0),
    })
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(20)
  })

  it('floors decimal values', () => {
    useRuntimeConfigMock.mockReturnValue({
      data: createRuntimeConfig(25.7),
    })
    const { result } = renderHook(() => useDefaultPageSize(), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(25)
  })
})
