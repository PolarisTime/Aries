import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getRuntimeConfigMock } = vi.hoisted(() => ({
  getRuntimeConfigMock: vi.fn(),
}))

vi.mock('@/api/runtime-config', () => ({
  getRuntimeConfig: (...args: unknown[]) => getRuntimeConfigMock(...args),
}))

import { QUERY_KEYS } from '@/constants/query-keys'
import type { RuntimeConfigResponse } from '@/types/runtime-config'
import { useRuntimeConfig } from './useRuntimeConfig'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useRuntimeConfig', () => {
  const runtimeConfig: RuntimeConfigResponse = {
    ui: {
      defaultPageSize: 50,
      showSnowflakeId: false,
      watermark: {
        enabled: true,
        content: 'internal',
        fontSize: 16,
        color: 'rgba(0,0,0,0.06)',
        rotate: -20,
        density: 180,
      },
    },
    business: {
      defaultTaxRate: 0.09,
      statement: {
        customerReceiptAmountZero: false,
        supplierFullPayment: true,
      },
      businessNo: {
        useSnowflakeId: true,
      },
    },
    features: {
      weightOnlyPurchaseInbound: true,
      weightOnlySalesOutbound: false,
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads runtime config with the shared query key', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    getRuntimeConfigMock.mockResolvedValue(runtimeConfig)

    const { result } = renderHook(() => useRuntimeConfig(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toEqual(runtimeConfig))
    expect(getRuntimeConfigMock).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(QUERY_KEYS.runtimeConfig)).toEqual(
      runtimeConfig,
    )
  })
})
